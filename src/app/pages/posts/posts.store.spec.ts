import { TestBed } from '@angular/core/testing';
import { Event as RouterEvent, NavigationEnd, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { WordPressPostsService } from './data-access/wordpress-posts.service';
import { PostsStore } from './posts.store';

describe('PostsStore visit filters', () => {
  let events: Subject<RouterEvent>;
  let store: PostsStore;
  const service = {
    getPosts: vi.fn(() => of({ posts: [], page: 1, perPage: 20, total: 40, totalPages: 2 })),
    getArchiveCategories: vi.fn(() =>
      of([
        { id: 41, name: 'Bruna', slug: 'bruna', parentId: 0 },
        { id: 45, name: 'Pensamentos', slug: 'pensamentos', parentId: 41 },
        { id: 70, name: 'Memórias', slug: 'memorias', parentId: 45 },
      ]),
    ),
  };
  const router = { navigate: vi.fn().mockResolvedValue(true), events: new Subject<RouterEvent>() };

  beforeEach(() => {
    vi.clearAllMocks();
    events = new Subject<RouterEvent>();
    router.events = events;
    TestBed.configureTestingModule({
      providers: [
        PostsStore,
        { provide: Router, useValue: router },
        { provide: WordPressPostsService, useValue: service },
      ],
    });
    store = TestBed.inject(PostsStore);
  });

  it('should preserve filters through search, page changes and reading-mode changes', () => {
    store.activateRoute('continuous', null, 'pensamentos');
    store.setSearch('presença');
    store.setViewMode('paged');
    store.goToPage(2);

    expect(service.getPosts).toHaveBeenLastCalledWith({
      page: 2,
      perPage: 20,
      search: 'presença',
      categorySlug: 'pensamentos',
    });
    expect(router.navigate).toHaveBeenLastCalledWith(['/posts', 'paged', 2], {
      replaceUrl: false,
      queryParams: { category: 'pensamentos', tag: undefined },
    });

    store.setCategory('bruna');
    expect(store.currentPage()).toBe(1);
    expect(service.getPosts).toHaveBeenLastCalledWith({
      page: 1,
      perPage: 20,
      search: 'presença',
      categorySlug: 'bruna',
    });
  });

  it('should clear the visit when leaving Posts even if its route injector is reused', () => {
    store.activateRoute('paged', '2', 'pensamentos', 'identidade');
    store.setSearch('presença');
    events.next(new NavigationEnd(1, '/posts/voce', '/posts/voce'));
    expect(store.selectedCategorySlug()).toBe('pensamentos');
    expect(store.search()).toBe('presença');

    events.next(new NavigationEnd(2, '/sanakaverse', '/sanakaverse'));
    expect(store.search()).toBe('');
    expect(store.hasActiveFilters()).toBe(false);
    expect(store.viewMode()).toBe('continuous');
    expect(store.currentPage()).toBe(1);

    store.activateRoute('continuous', null);
    expect(service.getPosts).toHaveBeenLastCalledWith({ page: 1, perPage: 20, search: '' });
  });

  it('should follow category ancestry and remove descendants with their parent', () => {
    store.activateRoute('continuous', null, 'memorias');
    expect(store.activeCategories().map((category) => category.slug)).toEqual([
      'bruna',
      'pensamentos',
      'memorias',
    ]);
    expect(store.subcategories().map((category) => category.label)).toEqual([
      'Pensamentos',
      'Pensamentos / Memórias',
    ]);
    expect(store.selectedSubcategory()?.slug).toBe('memorias');

    store.removeCategory('pensamentos');
    expect(store.activeCategories().map((category) => category.slug)).toEqual(['bruna']);
    expect(store.selectedSubcategory()).toBeUndefined();
    expect(service.getPosts).toHaveBeenLastCalledWith({
      page: 1,
      perPage: 20,
      search: '',
      categorySlug: 'bruna',
    });
  });

  it('should remove a linked tag independently of category and search', () => {
    store.activateRoute('continuous', null, 'pensamentos', 'identidade');
    store.setSearch('presença');
    store.removeTag();
    expect(store.selectedTagSlug()).toBeUndefined();
    expect(service.getPosts).toHaveBeenLastCalledWith({
      page: 1,
      perPage: 20,
      search: 'presença',
      categorySlug: 'pensamentos',
    });
  });
});
