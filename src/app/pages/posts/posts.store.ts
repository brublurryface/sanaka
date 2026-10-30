import { computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, filter, map, of, scan, startWith, Subject, switchMap } from 'rxjs';

import { Post, PostCategory } from './post';
import { PostsPage, WordPressPostsService } from './data-access/wordpress-posts.service';

export type PostsViewMode = 'continuous' | 'paged';

interface CategoriesState {
  readonly status: 'loading' | 'success' | 'error';
  readonly categories: readonly PostCategory[];
}

interface PostsRequest {
  readonly page: number;
  readonly search: string;
  readonly append: boolean;
  readonly categorySlug?: string;
  readonly tagSlug?: string;
}

interface PostsState {
  readonly status: 'loading' | 'success' | 'error';
  readonly posts: readonly Post[];
  readonly total: number;
  readonly totalPages: number;
  readonly isLoadingMore: boolean;
  readonly hasLoadMoreError: boolean;
}

type PostsEvent =
  | {
      readonly type: 'loading';
      readonly request: PostsRequest;
    }
  | {
      readonly type: 'success';
      readonly request: PostsRequest;
      readonly page: PostsPage;
    }
  | {
      readonly type: 'error';
      readonly request: PostsRequest;
    };

@Injectable()
export class PostsStore {
  private readonly perPage = 20;

  private readonly postsService = inject(WordPressPostsService);
  private readonly router = inject(Router);

  private readonly requests = new Subject<PostsRequest>();
  private readonly categoryRequests = new Subject<void>();
  private readonly searchTerm = signal('');
  private readonly categorySlug = signal<string | undefined>(undefined);
  private readonly tagSlug = signal<string | undefined>(undefined);
  private routeInitialized = false;

  private readonly initialState: PostsState = {
    status: 'loading',
    posts: [],
    total: 0,
    totalPages: 0,
    isLoadingMore: false,
    hasLoadMoreError: false,
  };

  readonly search = this.searchTerm.asReadonly();
  readonly selectedCategorySlug = this.categorySlug.asReadonly();
  readonly selectedTagSlug = this.tagSlug.asReadonly();
  readonly viewMode = signal<PostsViewMode>('continuous');
  readonly currentPage = signal(1);

  private readonly categoriesState = toSignal(
    this.categoryRequests.pipe(
      startWith(undefined),
      switchMap(() =>
        this.postsService.getArchiveCategories().pipe(
          map((categories): CategoriesState => ({ status: 'success', categories })),
          startWith<CategoriesState>({ status: 'loading', categories: [] }),
          catchError(() => of<CategoriesState>({ status: 'error', categories: [] })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', categories: [] } as CategoriesState },
  );

  readonly categories = computed(() => this.categoriesState().categories);
  readonly isLoadingCategories = computed(() => this.categoriesState().status === 'loading');
  readonly hasCategoriesError = computed(() => this.categoriesState().status === 'error');
  readonly rootCategories = computed(() =>
    this.categories().filter((category) => category.parentId === 0),
  );
  readonly activeCategories = computed(() => {
    const selected = this.categories().find((category) => category.slug === this.categorySlug());
    if (selected) {
      return this.categoryLineage(selected);
    }
    const slug = this.categorySlug();
    return slug ? [{ id: 0, name: slug, slug, parentId: 0 }] : [];
  });
  readonly selectedRootCategory = computed(() => this.activeCategories()[0]);
  readonly selectedSubcategory = computed(() =>
    this.activeCategories().length > 1 ? this.activeCategories().at(-1) : undefined,
  );
  readonly subcategories = computed(() => {
    const root = this.selectedRootCategory();
    if (!root) {
      return [];
    }
    return this.categories()
      .filter(
        (category) => category.parentId > 0 && this.categoryLineage(category)[0]?.id === root.id,
      )
      .map((category) => ({
        ...category,
        label: this.categoryLineage(category)
          .slice(1)
          .map((ancestor) => ancestor.name)
          .join(' / '),
      }));
  });
  readonly hasActiveFilters = computed(() => Boolean(this.categorySlug() || this.tagSlug()));

  private readonly state = toSignal(
    this.requests.pipe(
      switchMap((request) =>
        this.postsService
          .getPosts({
            page: request.page,
            perPage: this.perPage,
            search: request.search,
            ...(request.categorySlug ? { categorySlug: request.categorySlug } : {}),
            ...(request.tagSlug ? { tagSlug: request.tagSlug } : {}),
          })
          .pipe(
            map((page): PostsEvent => ({
              type: 'success',
              request,
              page,
            })),
            startWith<PostsEvent>({
              type: 'loading',
              request,
            }),
            catchError(() =>
              of<PostsEvent>({
                type: 'error',
                request,
              }),
            ),
          ),
      ),
      scan(
        (state: PostsState, event: PostsEvent): PostsState => this.reduceState(state, event),
        this.initialState,
      ),
    ),
    {
      initialValue: this.initialState,
    },
  );

  readonly posts = computed(() => this.state().posts);
  readonly total = computed(() => this.state().total);
  readonly totalPages = computed(() => this.state().totalPages);
  readonly isLoading = computed(() => this.state().status === 'loading');
  readonly hasError = computed(() => this.state().status === 'error');
  readonly isLoadingMore = computed(() => this.state().isLoadingMore);
  readonly hasLoadMoreError = computed(() => this.state().hasLoadMoreError);
  readonly hasMore = computed(() => this.currentPage() < this.totalPages());
  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  );

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        const path = event.urlAfterRedirects.split(/[?#]/)[0];
        if (path !== '/posts' && !path.startsWith('/posts/')) {
          this.searchTerm.set('');
          this.categorySlug.set(undefined);
          this.tagSlug.set(undefined);
          this.currentPage.set(1);
          this.viewMode.set('continuous');
          this.routeInitialized = false;
        }
      });
  }

  setCategory(slug: string): void {
    const categorySlug = this.normalizeTaxonomySlug(slug);
    if (categorySlug === this.categorySlug()) {
      return;
    }
    this.categorySlug.set(categorySlug);
    this.refreshFilters();
  }

  removeCategory(slug: string): void {
    const categories = this.activeCategories();
    const index = categories.findIndex((category) => category.slug === slug);
    if (index >= 0) {
      this.setCategory(index > 0 ? categories[index - 1].slug : '');
    }
  }

  removeTag(): void {
    if (this.tagSlug()) {
      this.tagSlug.set(undefined);
      this.refreshFilters();
    }
  }

  clearFilters(): void {
    if (this.hasActiveFilters()) {
      this.categorySlug.set(undefined);
      this.tagSlug.set(undefined);
      this.refreshFilters();
    }
  }

  retryCategories(): void {
    this.categoryRequests.next();
  }

  private refreshFilters(): void {
    this.currentPage.set(1);
    this.navigateTo(this.viewMode(), 1);
    this.requests.next(this.createRequest(false));
  }

  private categoryLineage(category: PostCategory): readonly PostCategory[] {
    const categories = new Map(this.categories().map((item) => [item.id, item]));
    const lineage: PostCategory[] = [];
    const visited = new Set<number>();
    let current: PostCategory | undefined = category;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      lineage.unshift(current);
      current = categories.get(current.parentId);
    }
    return lineage;
  }

  activateRoute(
    view: unknown,
    pageValue: string | null,
    categoryValue: string | null = null,
    tagValue: string | null = null,
  ): void {
    const mode: PostsViewMode = view === 'paged' ? 'paged' : 'continuous';
    const parsedPage = Number(pageValue);
    const hasValidPage = Number.isInteger(parsedPage) && parsedPage > 0;
    const page = mode === 'paged' && hasValidPage ? parsedPage : 1;
    const categorySlug = this.normalizeTaxonomySlug(categoryValue);
    const tagSlug = this.normalizeTaxonomySlug(tagValue);

    if (mode === 'paged' && pageValue !== null && !hasValidPage) {
      this.navigateTo('paged', 1, true);
    }

    if (
      this.routeInitialized &&
      mode === this.viewMode() &&
      page === this.currentPage() &&
      categorySlug === this.categorySlug() &&
      tagSlug === this.tagSlug()
    ) {
      return;
    }

    this.routeInitialized = true;
    this.viewMode.set(mode);
    this.currentPage.set(page);
    this.categorySlug.set(categorySlug);
    this.tagSlug.set(tagSlug);
    this.requests.next(this.createRequest(false));
  }

  setSearch(search: string): void {
    if (search === this.searchTerm()) {
      return;
    }

    this.searchTerm.set(search);
    this.currentPage.set(1);

    if (this.viewMode() === 'paged') {
      this.navigateTo('paged', 1, true);
    }

    this.requests.next(this.createRequest(false));
  }

  setViewMode(mode: PostsViewMode): void {
    if (mode === this.viewMode()) {
      return;
    }

    this.viewMode.set(mode);
    this.currentPage.set(1);
    this.navigateTo(mode, 1);
    this.requests.next(this.createRequest(false));
  }

  loadMore(): void {
    if (this.viewMode() !== 'continuous' || !this.hasMore() || this.isLoadingMore()) {
      return;
    }

    this.currentPage.update((page) => page + 1);
    this.requests.next(this.createRequest(true));
  }

  goToPage(page: number): void {
    if (
      this.viewMode() !== 'paged' ||
      page < 1 ||
      page > this.totalPages() ||
      page === this.currentPage()
    ) {
      return;
    }

    this.currentPage.set(page);
    this.navigateTo('paged', page);
    this.requests.next(this.createRequest(false));
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  retry(): void {
    this.requests.next(this.createRequest(this.hasLoadMoreError()));
  }

  private reduceState(state: PostsState, event: PostsEvent): PostsState {
    switch (event.type) {
      case 'loading':
        return this.reduceLoading(state, event.request);
      case 'success':
        return this.reduceSuccess(state, event);
      case 'error':
        return this.reduceError(state, event.request);
    }
  }

  private reduceLoading(state: PostsState, request: PostsRequest): PostsState {
    return request.append
      ? { ...state, isLoadingMore: true, hasLoadMoreError: false }
      : { ...this.initialState, status: 'loading' };
  }

  private reduceError(state: PostsState, request: PostsRequest): PostsState {
    return request.append
      ? { ...state, isLoadingMore: false, hasLoadMoreError: true }
      : { ...this.initialState, status: 'error' };
  }

  private reduceSuccess(
    state: PostsState,
    event: Extract<PostsEvent, { readonly type: 'success' }>,
  ): PostsState {
    const posts = event.request.append
      ? this.uniquePosts([...state.posts, ...event.page.posts])
      : event.page.posts;

    return {
      status: 'success',
      posts,
      total: event.page.total,
      totalPages: event.page.totalPages,
      isLoadingMore: false,
      hasLoadMoreError: false,
    };
  }

  private createRequest(append: boolean): PostsRequest {
    return {
      page: this.currentPage(),
      search: this.searchTerm(),
      append,
      ...(this.categorySlug() ? { categorySlug: this.categorySlug() } : {}),
      ...(this.tagSlug() ? { tagSlug: this.tagSlug() } : {}),
    };
  }

  private navigateTo(mode: PostsViewMode, page: number, replaceUrl = false): void {
    const commands =
      mode === 'continuous'
        ? ['/posts']
        : page === 1
          ? ['/posts', 'paged']
          : ['/posts', 'paged', page];

    const taxonomyQueryParams = {
      category: this.categorySlug(),
      tag: this.tagSlug(),
    };

    void this.router.navigate(
      commands,
      this.categorySlug() || this.tagSlug()
        ? { replaceUrl, queryParams: taxonomyQueryParams }
        : { replaceUrl },
    );
  }

  private normalizeTaxonomySlug(value: string | null): string | undefined {
    return value?.trim() || undefined;
  }

  private uniquePosts(posts: readonly Post[]): readonly Post[] {
    return [...new Map(posts.map((post) => [post.id, post])).values()];
  }
}
