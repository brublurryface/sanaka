import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, map, of, scan, startWith, Subject, switchMap } from 'rxjs';

import { Post } from './post';
import { PostsPage, WordPressPostsService } from './data-access/wordpress-posts.service';

export type PostsViewMode = 'continuous' | 'paged';

interface PostsRequest {
  readonly page: number;
  readonly search: string;
  readonly append: boolean;
  readonly categoryId?: number;
  readonly tagId?: number;
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
  private readonly searchTerm = signal('');
  private readonly categoryId = signal<number | undefined>(undefined);
  private readonly tagId = signal<number | undefined>(undefined);
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
  readonly viewMode = signal<PostsViewMode>('continuous');
  readonly currentPage = signal(1);

  private readonly state = toSignal(
    this.requests.pipe(
      switchMap((request) =>
        this.postsService
          .getPosts({
            page: request.page,
            perPage: this.perPage,
            search: request.search,
            ...(request.categoryId ? { categoryId: request.categoryId } : {}),
            ...(request.tagId ? { tagId: request.tagId } : {}),
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
    const categoryId = this.parseTaxonomyId(categoryValue);
    const tagId = this.parseTaxonomyId(tagValue);

    if (mode === 'paged' && pageValue !== null && !hasValidPage) {
      this.navigateTo('paged', 1, true);
    }

    if (
      this.routeInitialized &&
      mode === this.viewMode() &&
      page === this.currentPage() &&
      categoryId === this.categoryId() &&
      tagId === this.tagId()
    ) {
      return;
    }

    this.routeInitialized = true;
    this.viewMode.set(mode);
    this.currentPage.set(page);
    this.categoryId.set(categoryId);
    this.tagId.set(tagId);
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
      ...(this.categoryId() ? { categoryId: this.categoryId() } : {}),
      ...(this.tagId() ? { tagId: this.tagId() } : {}),
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
      category: this.categoryId(),
      tag: this.tagId(),
    };

    void this.router.navigate(
      commands,
      this.categoryId() || this.tagId()
        ? { replaceUrl, queryParams: taxonomyQueryParams }
        : { replaceUrl },
    );
  }

  private parseTaxonomyId(value: string | null): number | undefined {
    const id = Number(value);

    return Number.isInteger(id) && id > 0 ? id : undefined;
  }

  private uniquePosts(posts: readonly Post[]): readonly Post[] {
    return [...new Map(posts.map((post) => [post.id, post])).values()];
  }
}
