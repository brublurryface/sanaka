import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { finalize, Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import {
  PostsPage,
  PostsPageOutOfRangeError,
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

  it('should recover the explicit page-range error once with search and taxonomy filters intact', () => {
    store.setSearch('vida');
    service.getPosts
      .mockReset()
      .mockImplementation((query) =>
        query?.page === 999999
          ? throwError(() => new PostsPageOutOfRangeError())
          : of(pageResult(1, 3)),
      );
    store.activateRoute('paged', '999999', 'pensamentos', 'identidade');
    expect(service.getPosts.mock.calls.map(([query]) => query?.page)).toEqual([999999, 1]);
    expect(service.getPosts).toHaveBeenLastCalledWith({
      page: 1,
      perPage: 20,
      search: 'vida',
      categorySlug: 'pensamentos',
      tagSlug: 'identidade',
    });
    expect(store.currentPage()).toBe(1);
    expect(store.hasError()).toBe(false);
    expect(router.navigate).toHaveBeenCalledOnce();
  });

  it('should stop after one failed recovery and allow a manual retry of page one', () => {
    service.getPosts.mockImplementation(() => throwError(() => new PostsPageOutOfRangeError()));
    store.activateRoute('paged', '999999');
    expect(service.getPosts.mock.calls.map(([query]) => query?.page)).toEqual([999999, 1]);
    expect(store.currentPage()).toBe(1);
    expect(store.hasError()).toBe(true);
    expect(router.navigate).toHaveBeenCalledOnce();
    service.getPosts.mockReturnValue(of(pageResult(1, 2)));
    store.retry();
    expect(service.getPosts.mock.calls.map(([query]) => query?.page)).toEqual([999999, 1, 1]);
    expect(store.hasError()).toBe(false);
    expect(router.navigate).toHaveBeenCalledOnce();
  });

  it.each([
    new Error('offline'),
    new HttpErrorResponse({ status: 503, error: { code: 'rest_post_invalid_page_number' } }),
    new HttpErrorResponse({ status: 400, error: { code: 'rest_invalid_param' } }),
  ])('should keep a genuine failure recoverable without redirecting: %s', (error) => {
    service.getPosts.mockReturnValue(throwError(() => error));
    store.activateRoute('paged', '4', 'pensamentos');
    expect(store.currentPage()).toBe(4);
    expect(store.hasError()).toBe(true);
    expect(service.getPosts).toHaveBeenCalledOnce();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should retain continuous reading after a page-range failure and retry the same append', () => {
    service.getPosts
      .mockReturnValueOnce(of(pageResult(1, 3)))
      .mockReturnValueOnce(throwError(() => new PostsPageOutOfRangeError()))
      .mockReturnValueOnce(of(pageResult(2, 2)));
    store.activateRoute('continuous', null);
    store.loadMore();
    expect(store.posts().map((post) => post.id)).toEqual([1]);
    expect(store.hasLoadMoreError()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
    store.retry();
    expect(service.getPosts.mock.calls.map(([query]) => query?.page)).toEqual([1, 2, 2]);
    expect(store.posts().map((post) => post.id)).toEqual([1, 2]);
    expect(store.hasLoadMoreError()).toBe(false);
  });

  it('should cancel a recovery when another filter becomes active', () => {
    const pending = new Subject<PostsPage>();
    const cancelled = vi.fn();
    const newest = { ...pageResult(1, 2), posts: [{ ...pageResult(1, 2).posts[0], id: 22 }] };
    service.getPosts.mockImplementation((query) =>
      query?.categorySlug === 'nova'
        ? of(newest)
        : query?.page === 9
          ? of(pageResult(9, 3))
          : pending.pipe(finalize(cancelled)),
    );
    store.activateRoute('paged', '9', 'antiga');
    expect(store.isLoading()).toBe(true);
    store.setCategory('nova');
    expect(cancelled).toHaveBeenCalledOnce();
    pending.next(pageResult(1, 3));
    expect(store.selectedCategorySlug()).toBe('nova');
    expect(store.posts().map((post) => post.id)).toEqual([22]);
    expect(store.currentPage()).toBe(1);
    expect(service.getPosts).toHaveBeenCalledTimes(3);
  });

  it('should cancel an obsolete page when a new route arrives', () => {
    const pending = new Subject<PostsPage>();
    const cancelled = vi.fn();
    service.getPosts.mockImplementation((query) =>
      query?.page === 4 ? pending.pipe(finalize(cancelled)) : of(pageResult(2, 3)),
    );
    store.activateRoute('paged', '4');
    store.activateRoute('paged', '2');
    expect(cancelled).toHaveBeenCalledOnce();
    pending.next(pageResult(4, 5));
    expect(store.currentPage()).toBe(2);
    expect(store.posts().map((post) => post.id)).toEqual([2]);
    expect(service.getPosts.mock.calls.map(([query]) => query?.page)).toEqual([4, 2]);
  });

  it('should not duplicate a requested page when the matching route activates', () => {
    store.activateRoute('paged', null);
    store.goToPage(2);
    store.activateRoute('paged', '2');
    expect(service.getPosts.mock.calls.map(([query]) => query?.page)).toEqual([1, 2]);
  });

  it('should cancel a pending recovery when switching to continuous mode', () => {
    const pending = new Subject<PostsPage>();
    const cancelled = vi.fn();
    service.getPosts
      .mockReturnValueOnce(of(pageResult(9, 3)))
      .mockReturnValueOnce(pending.pipe(finalize(cancelled)))
      .mockReturnValueOnce(of(pageResult(1, 3)));
    store.activateRoute('paged', '9');
    store.setViewMode('continuous');
    expect(cancelled).toHaveBeenCalledOnce();
    pending.next(pageResult(1, 2));
    expect(store.viewMode()).toBe('continuous');
    expect(store.currentPage()).toBe(1);
    expect(service.getPosts.mock.calls.map(([query]) => query?.page)).toEqual([9, 1, 1]);
  });

  it.each([
    [8, 4, [1, 2, 3, 4, 5, 'end-ellipsis', 8]],
    [8, 5, [1, 'start-ellipsis', 4, 5, 6, 7, 8]],
    [500, 1, [1, 2, 3, 4, 5, 'end-ellipsis', 500]],
    [500, 250, [1, 'start-ellipsis', 249, 250, 251, 'end-ellipsis', 500]],
    [500, 500, [1, 'start-ellipsis', 496, 497, 498, 499, 500]],
  ] as const)(
    'should present a stable seven-item window for %s pages at %s',
    (total, current, expected) => {
      service.getPosts.mockReturnValue(of(pageResult(current, total)));
      store.activateRoute('paged', String(current));
      expect(store.paginationItems()).toEqual(expected);
    },
  );
});
