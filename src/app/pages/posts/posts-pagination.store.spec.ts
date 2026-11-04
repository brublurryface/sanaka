import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { vi } from 'vitest';

import {
  PostsPage,
  PostsQuery,
  WordPressPostsService,
} from './data-access/wordpress-posts.service';
import { PostsStore } from './posts.store';

describe('PostsStore pagination boundaries', () => {
  let store: PostsStore;
  const service = {
    getPosts: vi.fn<(query?: PostsQuery) => Observable<PostsPage>>(),
    getArchiveCategories: vi.fn(() => of([])),
  };
  const router = {
    navigate: vi.fn().mockResolvedValue(true),
    events: new Subject<NavigationEnd>(),
  };
  function pageResult(page: number, totalPages: number): PostsPage {
    return {
      posts:
        page <= totalPages
          ? [
              {
                id: page,
                slug: `post-${page}`,
                title: `Post ${page}`,
                excerpt: '',
                publishedAt: '2026-11-04',
                category: '',
                categories: [],
              },
            ]
          : [],
      page,
      perPage: 20,
      total: totalPages * 20,
      totalPages,
    };
  }
  beforeEach(() => {
    service.getPosts
      .mockReset()
      .mockImplementation((query) => of(pageResult(query?.page ?? 1, 10_000)));
    router.navigate.mockClear();
    router.events = new Subject<NavigationEnd>();
    TestBed.configureTestingModule({
      providers: [
        PostsStore,
        { provide: Router, useValue: router },
        { provide: WordPressPostsService, useValue: service },
      ],
    });
    store = TestBed.inject(PostsStore);
  });

  it.each([1, 2, 5, 500, 10_000])('should keep a bounded window for %s pages', (count) => {
    service.getPosts.mockImplementation((query) => of(pageResult(query?.page ?? 1, count)));
    const current = Math.max(1, Math.floor(count / 2));
    store.activateRoute('paged', String(current));
    const pages = store.pageNumbers();
    expect(pages.length).toBeLessThanOrEqual(7);
    expect(pages[0]).toBe(1);
    expect(pages.at(-1)).toBe(count);
    expect(pages).toContain(current);
    expect(new Set(pages).size).toBe(pages.length);
  });

  it.each(['0', '-1', 'abc', '2.5', '1e3', 'Infinity', '9007199254740992', ' 2 '])(
    'should canonicalize invalid page %s without dropping incoming filters',
    (value) => {
      store.activateRoute('paged', value, 'pensamentos', 'identidade');
      expect(store.currentPage()).toBe(1);
      expect(service.getPosts).toHaveBeenCalledExactlyOnceWith({
        page: 1,
        perPage: 20,
        search: '',
        categorySlug: 'pensamentos',
        tagSlug: 'identidade',
      });
      expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/posts', 'paged'], {
        replaceUrl: true,
        queryParams: { category: 'pensamentos', tag: 'identidade' },
      });
      store.activateRoute('paged', null, 'pensamentos', 'identidade');
      expect(service.getPosts).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ['0002', 2],
    ['1', 1],
  ] as const)('should normalize page spelling %s to its canonical route', (value, expected) => {
    store.activateRoute('paged', value, 'pensamentos');
    expect(store.currentPage()).toBe(expected);
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(
      expected === 1 ? ['/posts', 'paged'] : ['/posts', 'paged', expected],
      { replaceUrl: true, queryParams: { category: 'pensamentos', tag: undefined } },
    );
  });

  it.each([NaN, Infinity, 1.5, 0, -1, Number.MAX_SAFE_INTEGER + 1])(
    'should ignore an invalid page action %s',
    (value) => {
      store.activateRoute('paged', null);
      store.goToPage(value);
      expect(store.currentPage()).toBe(1);
      expect(service.getPosts).toHaveBeenCalledOnce();
      expect(router.navigate).not.toHaveBeenCalled();
    },
  );

  it('should recover a successful response whose requested page is now beyond the collection', () => {
    service.getPosts.mockImplementation((query) => of(pageResult(query?.page ?? 1, 3)));
    store.activateRoute('paged', '999999', 'pensamentos', 'identidade');
    expect(service.getPosts.mock.calls.map(([query]) => query?.page)).toEqual([999999, 1]);
    expect(store.currentPage()).toBe(1);
    expect(store.posts().map((post) => post.id)).toEqual([1]);
    expect(store.hasError()).toBe(false);
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/posts', 'paged'], {
      replaceUrl: true,
      queryParams: { category: 'pensamentos', tag: 'identidade' },
    });
    store.activateRoute('paged', null, 'pensamentos', 'identidade');
    expect(service.getPosts).toHaveBeenCalledTimes(2);
  });

  it('should normalize an empty filtered collection without another content request', () => {
    service.getPosts.mockReturnValue(of(pageResult(9, 0)));
    store.activateRoute('paged', '9', 'apagada');
    expect(store.currentPage()).toBe(1);
    expect(store.posts()).toEqual([]);
    expect(store.total()).toBe(0);
    expect(store.hasError()).toBe(false);
    expect(service.getPosts).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/posts', 'paged'], {
      replaceUrl: true,
      queryParams: { category: 'apagada', tag: undefined },
    });
  });
});
