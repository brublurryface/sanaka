import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { SecurityContext, inject, Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
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
import { WordPressTextService } from '../../../core/wordpress/wordpress-text.service';
import {
  CharacterObolo,
  Post,
  PostCategory,
  PostDetail,
  PostNavigation,
  PostTaxonomy,
} from '../post';

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

interface WordPressRenderedField {
  readonly rendered: string;
}

interface WordPressPost {
  readonly id: number;
  readonly slug: string;
  readonly date: string;
  readonly title: WordPressRenderedField;
  readonly excerpt: WordPressRenderedField;
  readonly content?: WordPressRenderedField;
  readonly featured_media: number;
  readonly categories: readonly number[];
  readonly tags?: readonly number[];
  readonly sanaka_character_slug?: string;
  readonly sanaka_character_name?: string;
  readonly sanaka_obolo_front?: string;
  readonly sanaka_obolo_back?: string;
  readonly _embedded?: WordPressEmbeddedResources;
}

interface WordPressEmbeddedResources {
  readonly 'wp:featuredmedia'?: readonly WordPressMedia[];
}

interface WordPressCategory {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly parent: number;
}

interface WordPressTag {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
}

interface WordPressMedia {
  readonly id: number;
  readonly source_url: string;
  readonly alt_text: string;
  readonly media_details?: {
    readonly sizes?: Readonly<Record<string, WordPressMediaSize>>;
  };
}

interface WordPressMediaSize {
  readonly source_url: string;
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
 * Adaptador HTTP responsável por consultar e normalizar o acervo mantido no WordPress.
 *
 * Os DTOs externos permanecem privados para impedir que detalhes da API atravessem a fronteira
 * de `data-access`.
 */
@Injectable({
  providedIn: 'root',
})
export class WordPressPostsService {
  private readonly requestTimeoutMs = 10_000;
  private readonly defaultPerPage = POSTS_PAGE_SIZE;
  private readonly defaultCoverImageUrl = '/images/posts/posts-atmosphere-desktop.webp';
  private readonly tagSuggestionLimit = 8;
  private readonly tagContextPostLimit = 5;

  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(WORDPRESS_API_URL);
  private readonly contentPolicy = inject(WordPressContentPolicyService);
  private readonly wordpressText = inject(WordPressTextService);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly categories$ = this.loadCategories().pipe(
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
            .get<readonly WordPressPost[]>(`${this.apiUrl}/posts`, {
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
        const excludedIds = this.categoryBranchIds(
          categories,
          this.archiveExcludedCategoryIds(policy),
        );
        return categories
          .filter((category) => !excludedIds.has(category.id))
          .map((category) => ({ ...this.toTaxonomy(category), parentId: category.parent }));
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

    return this.http.get<readonly WordPressPost[]>(`${this.apiUrl}/posts`, { params }).pipe(
      timeout({ first: this.requestTimeoutMs }),
      switchMap((posts) => {
        const post = posts[0];

        if (!post || post.categories.some((id) => policy.excludedCategoryIds.includes(id))) {
          return of(null);
        }

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
            ...this.mapPostDetail(post, categoryDetails.categories, tags, exploreTags, policy),
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
            .get<readonly WordPressTag[]>(`${this.apiUrl}/tags`, {
              params: new HttpParams()
                .set('slug', query.tagSlug)
                .set('per_page', '1')
                .set('_fields', 'id,name,slug'),
            })
            .pipe(map((tags) => tags.find((tag) => tag.slug === query.tagSlug)?.id));
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
    return excludeWordPressCategoryBranches(params, this.archiveExcludedCategoryIds(policy));
  }

  private mapPostsPage(
    response: HttpResponse<readonly WordPressPost[]>,
    query: NormalizedPostsQuery,
    categories: readonly WordPressCategory[],
    policy: ResolvedWordPressContentPolicy,
  ): PostsPage {
    const posts = response.body ?? [];
    const excludedIds = this.categoryBranchIds(categories, this.archiveExcludedCategoryIds(policy));
    // Um filtro local não pode corrigir os totais de outra coleção.
    if (posts.some((post) => post.categories.some((id) => excludedIds.has(id))))
      throw new Error('O WordPress retornou publicações fora da coleção editorial consultada.');
    const total = this.readCountHeader(response.headers.get('X-WP-Total'));
    const totalPages = this.readCountHeader(response.headers.get('X-WP-TotalPages'));
    if (total < posts.length || totalPages !== Math.ceil(total / query.perPage))
      throw new Error('O WordPress retornou totais de paginação incoerentes.');

    return {
      posts: this.mapPosts(posts, categories),
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages,
    };
  }

  private loadCategories(page = 1): Observable<readonly WordPressCategory[]> {
    return this.http
      .get<readonly WordPressCategory[]>(`${this.apiUrl}/categories`, {
        params: new HttpParams()
          .set('page', String(page))
          .set('per_page', '100')
          .set('_fields', 'id,name,slug,parent'),
        observe: 'response',
      })
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        switchMap((response) => {
          const categories = response.body ?? [];
          const header = response.headers.get('X-WP-TotalPages');
          const totalPages = Number(header);
          if (header !== null && (!Number.isInteger(totalPages) || totalPages < 0))
            throw new Error('Paginação de categorias inválida.');
          const hasMore = header !== null ? page < totalPages : categories.length === 100;
          if (hasMore && categories.length === 0)
            throw new Error('Paginação de categorias incompleta.');
          return hasMore
            ? this.loadCategories(page + 1).pipe(map((next) => [...categories, ...next]))
            : of(categories);
        }),
      );
  }

  private loadPostTags(post: WordPressPost, page = 1): Observable<readonly WordPressTag[]> {
    if (!post.tags?.length) return of([]);
    return this.http
      .get<readonly WordPressTag[]>(`${this.apiUrl}/tags`, {
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
          const tags = response.body ?? [];
          const total = this.readCountHeader(response.headers.get('X-WP-Total'));
          const totalPages = this.readCountHeader(response.headers.get('X-WP-TotalPages'));
          if (
            totalPages !== Math.ceil(total / 100) ||
            tags.length !== Math.min(100, Math.max(0, total - (page - 1) * 100))
          )
            throw new Error('Paginação das tags do artigo incoerente.');
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
    const collection = this.readingCollection(post, categories, policy);
    const categoryIds = collection.categoryIds ?? post.categories;
    if (!categoryIds.length) return of([]);
    const allowed = this.categoryBranchIds(categories, categoryIds);
    const excluded = this.categoryBranchIds(categories, collection.excludedIds);
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
      .get<readonly Pick<WordPressPost, 'tags' | 'categories'>[]>(`${this.apiUrl}/posts`, {
        params,
      })
      .pipe(
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
            .get<readonly WordPressTag[]>(`${this.apiUrl}/tags`, {
              params: new HttpParams()
                .set('include', ids.join(','))
                .set('per_page', String(this.tagSuggestionLimit))
                .set('orderby', 'include')
                .set('_fields', 'id,name,slug'),
            })
            .pipe(
              map((tags) =>
                tags.filter((tag) => ids.includes(tag.id)).slice(0, this.tagSuggestionLimit),
              ),
            );
        }),
      );
  }

  private mapPosts(
    posts: readonly WordPressPost[],
    categories: readonly WordPressCategory[],
  ): readonly Post[] {
    return posts.map((post) => this.mapPost(post, categories, this.getFeaturedMedia(post)));
  }

  private mapPostDetail(
    post: WordPressPost,
    categories: readonly WordPressCategory[],
    tags: readonly WordPressTag[],
    exploreTags: readonly WordPressTag[],
    policy: ResolvedWordPressContentPolicy,
  ): PostDetail {
    const coverImage = this.getFeaturedMedia(post);
    const content = post.content?.rendered ?? '';
    const plainContent = this.wordpressText.toText(content);
    const mappedCategories = this.mapTaxonomies(post.categories, categories);
    const selectedCategoryIds = new Set(post.categories);
    const excludedIds = this.categoryBranchIds(categories, this.archiveExcludedCategoryIds(policy));
    const selectedTagIds = new Set(post.tags ?? []);
    const rootCategory = mappedCategories[0];
    const mappedTags = [...new Map(tags.map((tag) => [tag.id, this.toTaxonomy(tag)])).values()];

    return {
      ...this.mapPost(post, categories, coverImage, { detail: true }),
      contentHtml: this.sanitizer.sanitize(SecurityContext.HTML, content) ?? '',
      categories: mappedCategories,
      relatedCategories: rootCategory
        ? categories
            .filter(
              (category) =>
                category.parent === rootCategory.id &&
                !selectedCategoryIds.has(category.id) &&
                !excludedIds.has(category.id),
            )
            .map((category) => this.toTaxonomy(category))
        : [],
      exploreCategories: categories
        .filter(
          (category) =>
            category.parent === 0 &&
            category.id !== rootCategory?.id &&
            !excludedIds.has(category.id),
        )
        .map((category) => this.toTaxonomy(category)),
      tags: mappedTags.filter((tag) => selectedTagIds.has(tag.id)),
      exploreTags: [...new Map(exploreTags.map((tag) => [tag.id, this.toTaxonomy(tag)])).values()],
      readingMinutes: Math.max(
        1,
        Math.ceil(plainContent.split(/\s+/).filter(Boolean).length / 200),
      ),
      obolo: this.mapCharacterObolo(post),
    };
  }

  /** Só expõe o óbolo quando o conjunto mínimo de metadados está completo no WordPress. */
  private mapCharacterObolo(post: WordPressPost): CharacterObolo | undefined {
    const characterSlug = post.sanaka_character_slug?.trim();
    const characterName = post.sanaka_character_name?.trim();
    const frontImageUrl = post.sanaka_obolo_front?.trim();
    const backImageUrl = post.sanaka_obolo_back?.trim();

    if (!characterSlug || !characterName || !frontImageUrl) {
      return undefined;
    }

    return {
      characterSlug,
      characterName,
      frontImageUrl,
      backImageUrl: backImageUrl || undefined,
    };
  }

  private mapPost(
    post: WordPressPost,
    categories: readonly WordPressCategory[],
    coverImage?: WordPressMedia,
    options: { readonly detail: boolean } = { detail: false },
  ): Post {
    const mappedCategories = this.mapTaxonomies(post.categories, categories);

    return {
      id: post.id,
      slug: post.slug,
      title: this.wordpressText.toText(post.title.rendered),
      excerpt: this.wordpressText.toText(post.excerpt.rendered),
      publishedAt: post.date.slice(0, 10),
      category: mappedCategories.map((item) => item.name).join(' · '),
      categories: mappedCategories,
      coverImageUrl:
        this.getCoverImageUrl(coverImage, options.detail) ??
        (options.detail ? this.defaultCoverImageUrl : undefined),
      coverImageAlt: coverImage?.alt_text ?? (options.detail ? '' : undefined),
    };
  }

  private mapTaxonomies(
    selectedIds: readonly number[],
    categories: readonly WordPressCategory[],
  ): readonly PostTaxonomy[] {
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const ordered: WordPressCategory[] = [];

    for (const selectedId of selectedIds) {
      const lineage: WordPressCategory[] = [];
      let current = categoryById.get(selectedId);

      while (current) {
        lineage.unshift(current);
        current = current.parent > 0 ? categoryById.get(current.parent) : undefined;
      }

      for (const category of lineage) {
        if (!ordered.some((item) => item.id === category.id)) {
          ordered.push(category);
        }
      }
    }

    return ordered.map((category) => this.toTaxonomy(category));
  }

  private toTaxonomy(item: WordPressCategory | WordPressTag): PostTaxonomy {
    return {
      id: item.id,
      name: this.wordpressText.toText(item.name),
      slug: item.slug,
    };
  }

  private getFeaturedMedia(post: WordPressPost): WordPressMedia | undefined {
    return post._embedded?.['wp:featuredmedia']?.find((media) => media.id === post.featured_media);
  }

  private getCoverImageUrl(
    coverImage: WordPressMedia | undefined,
    useOriginalImage: boolean,
  ): string | undefined {
    if (!coverImage) {
      return undefined;
    }

    if (useOriginalImage) {
      return coverImage.source_url;
    }

    const sizes = coverImage.media_details?.sizes;

    return (
      sizes?.['medium_large']?.source_url ?? sizes?.['large']?.source_url ?? coverImage.source_url
    );
  }

  private getAdjacentPost(
    post: WordPressPost,
    categories: readonly WordPressCategory[],
    direction: 'previous' | 'next',
    policy: ResolvedWordPressContentPolicy,
  ): Observable<PostNavigation | undefined> {
    const isPrevious = direction === 'previous';
    const collection = this.readingCollection(post, categories, policy);
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
    return this.http
      .get<readonly Pick<WordPressPost, 'slug' | 'title'>[]>(`${this.apiUrl}/posts`, { params })
      .pipe(
        map((posts) => {
          const adjacent = posts[0];
          return adjacent
            ? { slug: adjacent.slug, title: this.wordpressText.toText(adjacent.title.rendered) }
            : undefined;
        }),
        timeout({ first: this.requestTimeoutMs }),
        catchError(() => of(undefined)),
      );
  }

  private toPositiveInteger(value: number | undefined, fallback: number): number {
    return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
  }

  private readingCollection(
    post: WordPressPost,
    categories: readonly WordPressCategory[],
    policy: ResolvedWordPressContentPolicy,
  ): { readonly categoryIds?: readonly number[]; readonly excludedIds: readonly number[] } {
    const volumeId = policy.sanakaverseCategoryId;
    const volumeIds = this.categoryBranchIds(categories, volumeId === undefined ? [] : [volumeId]);
    const isVolume = volumeId !== undefined && post.categories.some((id) => volumeIds.has(id));
    return {
      categoryIds: isVolume ? [volumeId] : undefined,
      excludedIds: isVolume ? policy.excludedCategoryIds : this.archiveExcludedCategoryIds(policy),
    };
  }

  private archiveExcludedCategoryIds(policy: ResolvedWordPressContentPolicy): readonly number[] {
    return [
      ...policy.excludedCategoryIds,
      ...(policy.sanakaverseCategoryId === undefined ? [] : [policy.sanakaverseCategoryId]),
    ];
  }

  private categoryBranchIds(
    categories: readonly WordPressCategory[],
    roots: readonly number[],
  ): ReadonlySet<number> {
    const ids = new Set(roots);
    let previousSize: number;
    do {
      previousSize = ids.size;
      for (const category of categories) if (ids.has(category.parent)) ids.add(category.id);
    } while (ids.size !== previousSize);
    return ids;
  }

  private readCountHeader(value: string | null): number {
    const parsedValue = Number(value);
    if (
      value === null ||
      value.trim() === '' ||
      !Number.isSafeInteger(parsedValue) ||
      parsedValue < 0
    )
      throw new Error('Metadados de paginação do WordPress indisponíveis ou inválidos.');
    return parsedValue;
  }
}
