import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  combineLatest,
  forkJoin,
  map,
  Observable,
  of,
  ReplaySubject,
  share,
  startWith,
  switchMap,
  throwError,
  timeout,
  timer,
} from 'rxjs';

import { WORDPRESS_API_URL } from '../../../core/wordpress/wordpress-api';
import { POSTS_PAGE_SIZE } from '../post-query';
import {
  excludeWordPressCategoryBranches,
  ResolvedWordPressContentPolicy,
} from '../../../core/wordpress/wordpress-content-policy';
import { WordPressContentPolicyService } from '../../../core/wordpress/wordpress-content-policy.service';
import {
  archiveExcludedCategoryIds,
  categoryBranchIds,
  readingCollection,
} from './post-collection-policy';
import { WordPressPostMapper } from './wordpress-post-mapper';
import {
  assertWordPressCategoryTree,
  parseWordPressCategories,
  parseWordPressPosts,
  parseWordPressTagContexts,
  parseWordPressTags,
  wordPressArray,
  wordPressCountHeader,
  wordPressPostReference,
  WordPressContractError,
  type WordPressCategory,
  type WordPressPost,
  type WordPressTag,
} from '../../../core/wordpress/wordpress-response';
import type { Post, PostCategory, PostDetail, PostNavigation } from '../post';

export { WORDPRESS_API_URL } from '../../../core/wordpress/wordpress-api';

/** Parâmetros aceitos pelo adaptador ao consultar o arquivo do WordPress. */
export interface PostsQuery {
  readonly page?: number;
  readonly perPage?: number;
  readonly search?: string;
  readonly categoryId?: number;
  readonly tagId?: number;
  readonly categorySlug?: string;
  readonly tagSlug?: string;
}

/** Página normalizada entregue à camada de estado, sem expor DTOs do WordPress. */
export interface PostsPage {
  readonly posts: readonly Post[];
  readonly page: number;
  readonly perPage: number;
  readonly total: number;
  readonly totalPages: number;
}

/** A consulta é válida, mas a coleção já não alcança a página solicitada. */
export class PostsPageOutOfRangeError extends Error {
  constructor() {
    super('A página solicitada está fora do arquivo.');
    this.name = 'PostsPageOutOfRangeError';
  }
}

interface NormalizedPostsQuery {
  readonly page: number;
  readonly perPage: number;
  readonly search: string;
  readonly categoryId?: number;
  readonly tagId?: number;
  readonly categorySlug?: string;
  readonly tagSlug?: string;
}

/**
 * Coordena as consultas, o cache de categorias e a paginação do acervo no WordPress.
 *
 * Os contratos externos são validados antes de converter os dados para os modelos da feature.
 */
@Injectable({
  providedIn: 'root',
})
export class WordPressPostsService {
  private readonly requestTimeoutMs = 10_000;
  private readonly defaultPerPage = POSTS_PAGE_SIZE;
  private readonly tagSuggestionLimit = 8;
  private readonly tagContextPostLimit = 5;

  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(WORDPRESS_API_URL);
  private readonly contentPolicy = inject(WordPressContentPolicyService);
  private readonly mapper = inject(WordPressPostMapper);

  private readonly categories$ = this.loadCategories().pipe(
    map((categories) => {
      assertWordPressCategoryTree(categories);
      return categories;
    }),
    share({
      connector: () => new ReplaySubject<readonly WordPressCategory[]>(1),
      resetOnError: true,
      resetOnComplete: () => timer(5 * 60_000),
      resetOnRefCountZero: true,
    }),
  );

  /**
   * Busca uma página de publicações com categorias e mídias incorporadas em paralelo.
   *
   * @param query Filtros e paginação solicitados pela store.
   * @returns Um fluxo com os dados convertidos para os modelos usados pela feature.
   */
  getPosts(query: PostsQuery = {}): Observable<PostsPage> {
    const normalizedQuery = this.normalizeQuery(query);

    return forkJoin({
      query: this.resolveTaxonomyFilters(normalizedQuery),
      policy: this.contentPolicy.resolve(),
    }).pipe(
      switchMap(({ query: resolvedQuery, policy }) => {
        if (!resolvedQuery)
          return of({
            posts: [],
            page: normalizedQuery.page,
            perPage: normalizedQuery.perPage,
            total: 0,
            totalPages: 0,
          });
        return forkJoin({
          response: this.http
            .get<unknown>(`${this.apiUrl}/posts`, {
              params: this.buildPostsParams(resolvedQuery, policy),
              observe: 'response',
            })
            .pipe(
              catchError((error: unknown) =>
                throwError(() =>
                  error instanceof HttpErrorResponse &&
                  error.status === 400 &&
                  error.error?.code === 'rest_post_invalid_page_number'
                    ? new PostsPageOutOfRangeError()
                    : error,
                ),
              ),
            ),
          categories: this.categories$,
        }).pipe(
          map(({ response, categories }) =>
            this.mapPostsPage(response, resolvedQuery, categories, policy),
          ),
        );
      }),
      timeout({ first: this.requestTimeoutMs }),
    );
  }

  getArchiveCategories(): Observable<readonly PostCategory[]> {
    return forkJoin({ categories: this.categories$, policy: this.contentPolicy.resolve() }).pipe(
      map(({ categories, policy }) => {
        const excludedIds = categoryBranchIds(categories, archiveExcludedCategoryIds(policy));
        return categories
          .filter((category) => !excludedIds.has(category.id))
          .map((category) => ({ ...this.mapper.toTaxonomy(category), parentId: category.parent }));
      }),
      timeout({ first: this.requestTimeoutMs }),
    );
  }

  /** Busca e normaliza uma publicação completa usando o slug público da aplicação. */
  getPostBySlug(slug: string): Observable<PostDetail | null> {
    return this.contentPolicy
      .resolve()
      .pipe(switchMap((policy) => this.loadPostDetail(slug, policy)));
  }

  private loadPostDetail(
    slug: string,
    policy: ResolvedWordPressContentPolicy,
  ): Observable<PostDetail | null> {
    const params = excludeWordPressCategoryBranches(
      new HttpParams()
        .set('slug', slug)
        .set('per_page', '1')
        .set('_embed', 'wp:featuredmedia')
        .set(
          '_fields',
          'id,slug,date,title,excerpt,content,featured_media,categories,tags,sanaka_character_slug,sanaka_character_name,sanaka_obolo_front,sanaka_obolo_back,_links,_embedded',
        ),
      policy.excludedCategoryIds,
    );

    return this.http.get<unknown>(`${this.apiUrl}/posts`, { params }).pipe(
      timeout({ first: this.requestTimeoutMs }),
      map((body) => parseWordPressPosts(body, true)),
      switchMap((posts) => {
        if (posts.length > 1 || (posts[0] && posts[0].slug !== slug))
          throw new WordPressContractError(
            'O WordPress retornou outro artigo para o slug solicitado.',
          );
        const post = posts[0];

        if (!post || post.categories.some((id) => policy.excludedCategoryIds.includes(id))) {
          return of(null);
        }

        const article = this.mapper.articleContent(post);
        const excludedRoots = archiveExcludedCategoryIds(policy);
        const emptyCategoryDetails = {
          categories: [] as readonly WordPressCategory[],
          previous: undefined,
          next: undefined,
        };
        const categoryDetails$ = this.categories$.pipe(
          timeout({ first: this.requestTimeoutMs }),
          // Sem categorias confirmadas, não se presume a coleção da navegação.
          switchMap((categories) =>
            combineLatest({
              previous: this.getAdjacentPost(post, categories, 'previous', policy).pipe(
                startWith(undefined),
              ),
              next: this.getAdjacentPost(post, categories, 'next', policy).pipe(
                startWith(undefined),
              ),
            }).pipe(map((navigation) => ({ categories, ...navigation }))),
          ),
          startWith(emptyCategoryDetails),
          catchError(() => of(emptyCategoryDetails)),
        );
        const tags$ = this.loadPostTags(post).pipe(
          timeout({ first: this.requestTimeoutMs }),
          catchError(() => of([])),
          startWith([]),
        );
        const exploreTags$ = this.categories$.pipe(
          switchMap((categories) => this.loadExploreTags(post, categories, policy)),
          timeout({ first: this.requestTimeoutMs }),
          catchError(() => of([])),
          startWith([]),
        );

        // O corpo aparece primeiro; complementos independentes nunca o substituem por erro.
        return combineLatest({
          categoryDetails: categoryDetails$,
          tags: tags$,
          exploreTags: exploreTags$,
        }).pipe(
          map(({ categoryDetails, tags, exploreTags }) => ({
            ...article,
            ...this.mapper.articleTaxonomies(
              post,
              categoryDetails.categories,
              tags,
              exploreTags,
              categoryBranchIds(categoryDetails.categories, excludedRoots),
            ),
            previous: categoryDetails.previous,
            next: categoryDetails.next,
          })),
        );
      }),
    );
  }

  private normalizeQuery(query: PostsQuery): NormalizedPostsQuery {
    return {
      page: this.toPositiveInteger(query.page, 1),
      perPage: Math.min(this.toPositiveInteger(query.perPage, this.defaultPerPage), 100),
      search: query.search?.trim() ?? '',
      categoryId: query.categoryId && query.categoryId > 0 ? query.categoryId : undefined,
      tagId: query.tagId && query.tagId > 0 ? query.tagId : undefined,
      categorySlug: query.categorySlug?.trim() || undefined,
      tagSlug: query.tagSlug?.trim() || undefined,
    };
  }

  private resolveTaxonomyFilters(
    query: NormalizedPostsQuery,
  ): Observable<NormalizedPostsQuery | null> {
    const categoryId$ =
      query.categoryId || !query.categorySlug
        ? of(query.categoryId)
        : this.categories$.pipe(
            map(
              (categories) =>
                categories.find((category) => category.slug === query.categorySlug)?.id,
            ),
          );
    const tagId$ =
      query.tagId || !query.tagSlug
        ? of(query.tagId)
        : this.http
            .get<unknown>(`${this.apiUrl}/tags`, {
              params: new HttpParams()
                .set('slug', query.tagSlug)
                .set('per_page', '1')
                .set('_fields', 'id,name,slug'),
            })
            .pipe(
              map(parseWordPressTags),
              map((tags) => tags.find((tag) => tag.slug === query.tagSlug)?.id),
            );
    return forkJoin({ categoryId: categoryId$, tagId: tagId$ }).pipe(
      map(({ categoryId, tagId }) => {
        if (
          (!query.categoryId && query.categorySlug && categoryId === undefined) ||
          (!query.tagId && query.tagSlug && tagId === undefined)
        )
          return null;
        return { ...query, categoryId, tagId };
      }),
    );
  }

  private buildPostsParams(
    query: NormalizedPostsQuery,
    policy: ResolvedWordPressContentPolicy,
  ): HttpParams {
    let params = new HttpParams()
      .set('page', String(query.page))
      .set('per_page', String(query.perPage))
      .set('_embed', 'wp:featuredmedia')
      .set('_fields', 'id,slug,date,title,excerpt,featured_media,categories,_links,_embedded');

    params = query.search ? params.set('search', query.search) : params;
    params = query.categoryId ? params.set('categories', String(query.categoryId)) : params;
    params = query.tagId ? params.set('tags', String(query.tagId)) : params;
    return excludeWordPressCategoryBranches(params, archiveExcludedCategoryIds(policy));
  }

  private mapPostsPage(
    response: HttpResponse<unknown>,
    query: NormalizedPostsQuery,
    categories: readonly WordPressCategory[],
    policy: ResolvedWordPressContentPolicy,
  ): PostsPage {
    const posts = parseWordPressPosts(response.body);
    const excludedIds = categoryBranchIds(categories, archiveExcludedCategoryIds(policy));
    // Um filtro local não pode corrigir os totais de outra coleção.
    if (posts.some((post) => post.categories.some((id) => excludedIds.has(id))))
      throw new WordPressContractError(
        'O WordPress retornou publicações fora da coleção editorial consultada.',
      );
    const total = this.readCountHeader(response.headers.get('X-WP-Total'));
    const totalPages = this.readCountHeader(response.headers.get('X-WP-TotalPages'));
    if (
      total < posts.length ||
      posts.length > query.perPage ||
      (total > 0 && (posts.length === 0 || query.page > totalPages)) ||
      totalPages !== Math.ceil(total / query.perPage)
    )
      throw new WordPressContractError('O WordPress retornou totais de paginação incoerentes.');

    return {
      posts: posts.map((post) => this.mapper.summary(post, categories)),
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages,
    };
  }

  private loadCategories(page = 1): Observable<readonly WordPressCategory[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/categories`, {
        params: new HttpParams()
          .set('page', String(page))
          .set('per_page', '100')
          .set('_fields', 'id,name,slug,parent'),
        observe: 'response',
      })
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        switchMap((response) => {
          const categories = parseWordPressCategories(response.body);
          const header = response.headers.get('X-WP-TotalPages');
          const totalPages = header === null ? undefined : wordPressCountHeader(header);
          if (categories.length > 100 || (totalPages === 0 && categories.length > 0))
            throw new WordPressContractError('Paginação de categorias inválida.');
          const hasMore = totalPages !== undefined ? page < totalPages : categories.length === 100;
          if (hasMore && categories.length === 0)
            throw new WordPressContractError('Paginação de categorias incompleta.');
          return hasMore
            ? this.loadCategories(page + 1).pipe(map((next) => [...categories, ...next]))
            : of(categories);
        }),
      );
  }

  private loadPostTags(post: WordPressPost, page = 1): Observable<readonly WordPressTag[]> {
    if (!post.tags?.length) return of([]);
    return this.http
      .get<unknown>(`${this.apiUrl}/tags`, {
        params: new HttpParams()
          .set('post', String(post.id))
          .set('page', String(page))
          .set('per_page', '100')
          .set('orderby', 'name')
          .set('order', 'asc')
          .set('_fields', 'id,name,slug'),
        observe: 'response',
      })
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        switchMap((response) => {
          const tags = parseWordPressTags(response.body);
          const total = this.readCountHeader(response.headers.get('X-WP-Total'));
          const totalPages = this.readCountHeader(response.headers.get('X-WP-TotalPages'));
          if (
            totalPages !== Math.ceil(total / 100) ||
            tags.length !== Math.min(100, Math.max(0, total - (page - 1) * 100))
          )
            throw new WordPressContractError('Paginação das tags do artigo incoerente.');
          return page < totalPages
            ? this.loadPostTags(post, page + 1).pipe(map((next) => [...tags, ...next]))
            : of(tags);
        }),
      );
  }

  /** Até oito tags dos cinco posts mais recentes da mesma coleção editorial. */
  private loadExploreTags(
    post: WordPressPost,
    categories: readonly WordPressCategory[],
    policy: ResolvedWordPressContentPolicy,
  ): Observable<readonly WordPressTag[]> {
    const collection = readingCollection(post, categories, policy);
    const categoryIds = collection.categoryIds ?? post.categories;
    if (!categoryIds.length) return of([]);
    const allowed = categoryBranchIds(categories, categoryIds);
    const excluded = categoryBranchIds(categories, collection.excludedIds);
    const selected = new Set(post.tags ?? []);
    const params = excludeWordPressCategoryBranches(
      new HttpParams()
        .set('categories[terms]', categoryIds.join(','))
        .set('categories[include_children]', 'true')
        .set('exclude', String(post.id))
        .set('per_page', String(this.tagContextPostLimit))
        .set('orderby', 'date')
        .set('order', 'desc')
        .set('_fields', 'tags,categories'),
      collection.excludedIds,
    );
    return this.http
      .get<unknown>(`${this.apiUrl}/posts`, {
        params,
      })
      .pipe(
        map(parseWordPressTagContexts),
        switchMap((posts) => {
          const ids = [
            ...new Set(
              posts
                .filter(
                  (item) =>
                    item.categories?.some((id) => allowed.has(id)) &&
                    !item.categories.some((id) => excluded.has(id)),
                )
                .flatMap((item) => item.tags ?? []),
            ),
          ]
            .filter((id) => Number.isSafeInteger(id) && id > 0 && !selected.has(id))
            .slice(0, this.tagSuggestionLimit);
          if (!ids.length) return of([]);
          return this.http
            .get<unknown>(`${this.apiUrl}/tags`, {
              params: new HttpParams()
                .set('include', ids.join(','))
                .set('per_page', String(this.tagSuggestionLimit))
                .set('orderby', 'include')
                .set('_fields', 'id,name,slug'),
            })
            .pipe(
              map(parseWordPressTags),
              map((tags) =>
                tags.filter((tag) => ids.includes(tag.id)).slice(0, this.tagSuggestionLimit),
              ),
            );
        }),
      );
  }

  private getAdjacentPost(
    post: WordPressPost,
    categories: readonly WordPressCategory[],
    direction: 'previous' | 'next',
    policy: ResolvedWordPressContentPolicy,
  ): Observable<PostNavigation | undefined> {
    const isPrevious = direction === 'previous';
    const collection = readingCollection(post, categories, policy);
    let params = excludeWordPressCategoryBranches(
      new HttpParams()
        .set(isPrevious ? 'before' : 'after', post.date)
        .set('per_page', '1')
        .set('orderby', 'date')
        .set('order', isPrevious ? 'desc' : 'asc')
        .set('exclude', String(post.id))
        .set('_fields', 'slug,title'),
      collection.excludedIds,
    );
    if (collection.categoryIds)
      params = params
        .set('categories[terms]', collection.categoryIds.join(','))
        .set('categories[include_children]', 'true');
    return this.http.get<unknown>(`${this.apiUrl}/posts`, { params }).pipe(
      map((body) => {
        const posts = wordPressArray(body);
        if (posts.length > 1) throw new WordPressContractError();
        return posts.map(wordPressPostReference);
      }),
      map((posts) => {
        const adjacent = posts[0];
        return adjacent ? this.mapper.navigation(adjacent) : undefined;
      }),
      timeout({ first: this.requestTimeoutMs }),
      catchError(() => of(undefined)),
    );
  }

  private toPositiveInteger(value: number | undefined, fallback: number): number {
    return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
  }

  private readCountHeader(value: string | null): number {
    return wordPressCountHeader(value);
  }
}
