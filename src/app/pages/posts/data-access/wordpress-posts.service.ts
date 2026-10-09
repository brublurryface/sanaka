import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { SecurityContext, inject, Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { concat, forkJoin, map, Observable, of, shareReplay, switchMap, timeout } from 'rxjs';

import { WORDPRESS_API_URL } from '../../../core/wordpress/wordpress-api';
import { SANAKA_WORDPRESS_CONTENT_POLICY } from '../../../core/wordpress/wordpress-content-policy';
import { WordPressTextService } from '../../../core/wordpress/wordpress-text.service';
import { Post, PostDetail, PostNavigation, PostTaxonomy } from '../post';

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
  private readonly defaultPerPage = 20;
  private readonly defaultCoverImageUrl = '/images/posts/posts-atmosphere-desktop.webp';

  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(WORDPRESS_API_URL);
  private readonly contentPolicy = inject(SANAKA_WORDPRESS_CONTENT_POLICY);
  private readonly wordpressText = inject(WordPressTextService);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly categories$ = this.loadCategories().pipe(
    shareReplay({
      bufferSize: 1,
      refCount: false,
    }),
  );

  private readonly tags$ = this.loadTags().pipe(
    shareReplay({
      bufferSize: 1,
      refCount: false,
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

    return this.resolveTaxonomyFilters(normalizedQuery).pipe(
      switchMap((resolvedQuery) =>
        forkJoin({
          response: this.http.get<readonly WordPressPost[]>(`${this.apiUrl}/posts`, {
            params: this.buildPostsParams(resolvedQuery),
            observe: 'response',
          }),
          categories: this.categories$,
        }).pipe(
          map(({ response, categories }) => this.mapPostsPage(response, resolvedQuery, categories)),
        ),
      ),
      timeout({ first: this.requestTimeoutMs }),
    );
  }

  /** Busca e normaliza uma publicação completa usando o slug público da aplicação. */
  getPostBySlug(slug: string): Observable<PostDetail | null> {
    const params = new HttpParams()
      .set('slug', slug)
      .set('per_page', '1')
      .set('categories_exclude', this.excludedCategoryIds)
      .set('_embed', 'wp:featuredmedia')
      .set(
        '_fields',
        'id,slug,date,title,excerpt,content,featured_media,categories,tags,_links,_embedded',
      );

    return forkJoin({
      posts: this.http.get<readonly WordPressPost[]>(`${this.apiUrl}/posts`, { params }),
      categories: this.categories$,
      tags: this.tags$,
    }).pipe(
      switchMap(({ posts, categories, tags }) => {
        const post = posts[0];

        if (!post) {
          return of(null);
        }

        const detail = this.mapPostDetail(post, categories, tags);

        return concat(
          of(detail),
          forkJoin({
            previous: this.getAdjacentPost(post, 'previous'),
            next: this.getAdjacentPost(post, 'next'),
          }).pipe(map((navigation) => ({ ...detail, ...navigation }))),
        );
      }),
      timeout({ first: this.requestTimeoutMs }),
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

  private resolveTaxonomyFilters(query: NormalizedPostsQuery): Observable<NormalizedPostsQuery> {
    const categoryId$ =
      query.categoryId || !query.categorySlug
        ? of(query.categoryId)
        : this.categories$.pipe(
            map(
              (categories) =>
                categories.find((category) => category.slug === query.categorySlug)?.id ?? -1,
            ),
          );
    const tagId$ =
      query.tagId || !query.tagSlug
        ? of(query.tagId)
        : this.tags$.pipe(map((tags) => tags.find((tag) => tag.slug === query.tagSlug)?.id ?? -1));

    return forkJoin({ categoryId: categoryId$, tagId: tagId$ }).pipe(
      map(({ categoryId, tagId }) => ({ ...query, categoryId, tagId })),
    );
  }

  private buildPostsParams(query: NormalizedPostsQuery): HttpParams {
    let params = new HttpParams()
      .set('page', String(query.page))
      .set('per_page', String(query.perPage))
      .set('categories_exclude', this.archiveExcludedCategoryIds)
      .set('_embed', 'wp:featuredmedia')
      .set('_fields', 'id,slug,date,title,excerpt,featured_media,categories,_links,_embedded');

    params = query.search ? params.set('search', query.search) : params;
    params = query.categoryId ? params.set('categories', String(query.categoryId)) : params;
    return query.tagId ? params.set('tags', String(query.tagId)) : params;
  }

  private mapPostsPage(
    response: HttpResponse<readonly WordPressPost[]>,
    query: NormalizedPostsQuery,
    categories: readonly WordPressCategory[],
  ): PostsPage {
    const posts = response.body ?? [];
    const fallbackTotal = (query.page - 1) * query.perPage + posts.length;
    const total = this.readCountHeader(response.headers.get('X-WP-Total'), fallbackTotal);
    const totalPages = this.readCountHeader(
      response.headers.get('X-WP-TotalPages'),
      total === 0 ? 0 : Math.ceil(total / query.perPage),
    );

    return {
      posts: this.mapPosts(posts, categories),
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages,
    };
  }

  private loadCategories(): Observable<readonly WordPressCategory[]> {
    return this.http.get<readonly WordPressCategory[]>(`${this.apiUrl}/categories`, {
      params: new HttpParams().set('per_page', '100').set('_fields', 'id,name,slug,parent'),
    });
  }

  private loadTags(): Observable<readonly WordPressTag[]> {
    return this.http.get<readonly WordPressTag[]>(`${this.apiUrl}/tags`, {
      params: new HttpParams().set('per_page', '100').set('_fields', 'id,name,slug'),
    });
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
  ): PostDetail {
    const coverImage = this.getFeaturedMedia(post);
    const content = post.content?.rendered ?? '';
    const plainContent = this.wordpressText.toText(content);
    const mappedCategories = this.mapTaxonomies(post.categories, categories);
    const selectedCategoryIds = new Set(post.categories);
    const selectedTagIds = new Set(post.tags ?? []);
    const rootCategory = mappedCategories[0];
    const mappedTags = tags.map((tag) => this.toTaxonomy(tag));

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
                !this.isArchiveExcludedCategory(category.id),
            )
            .map((category) => this.toTaxonomy(category))
        : [],
      exploreCategories: categories
        .filter(
          (category) =>
            category.parent === 0 &&
            category.id !== rootCategory?.id &&
            !this.isArchiveExcludedCategory(category.id),
        )
        .map((category) => this.toTaxonomy(category)),
      tags: mappedTags.filter((tag) => selectedTagIds.has(tag.id)),
      exploreTags: mappedTags.filter((tag) => !selectedTagIds.has(tag.id)),
      readingMinutes: Math.max(
        1,
        Math.ceil(plainContent.split(/\s+/).filter(Boolean).length / 200),
      ),
    };
  }

  private mapPost(
    post: WordPressPost,
    categories: readonly WordPressCategory[],
    coverImage?: WordPressMedia,
    options: { readonly detail: boolean } = { detail: false },
  ): Post {
    return {
      id: post.id,
      slug: post.slug,
      title: this.wordpressText.toText(post.title.rendered),
      excerpt: this.wordpressText.toText(post.excerpt.rendered),
      publishedAt: post.date.slice(0, 10),
      category: this.mapTaxonomies(post.categories, categories)
        .map((item) => item.name)
        .join(' · '),
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
    direction: 'previous' | 'next',
  ): Observable<PostNavigation | undefined> {
    const isPrevious = direction === 'previous';
    const isSanakaverseVolume = post.categories.includes(this.contentPolicy.sanakaverseCategoryId);
    let params = new HttpParams()
      .set(isPrevious ? 'before' : 'after', post.date)
      .set('per_page', '1')
      .set('orderby', 'date')
      .set('order', isPrevious ? 'desc' : 'asc')
      .set('exclude', String(post.id))
      .set(
        'categories_exclude',
        isSanakaverseVolume ? this.excludedCategoryIds : this.archiveExcludedCategoryIds,
      )
      .set('_fields', 'slug,title');

    if (isSanakaverseVolume) {
      params = params.set('categories', String(this.contentPolicy.sanakaverseCategoryId));
    }

    return this.http
      .get<readonly Pick<WordPressPost, 'slug' | 'title'>[]>(`${this.apiUrl}/posts`, { params })
      .pipe(
        map((posts) => {
          const adjacent = posts[0];

          return adjacent
            ? {
                slug: adjacent.slug,
                title: this.wordpressText.toText(adjacent.title.rendered),
              }
            : undefined;
        }),
      );
  }

  private toPositiveInteger(value: number | undefined, fallback: number): number {
    return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
  }

  private get excludedCategoryIds(): string {
    return this.contentPolicy.excludedCategoryIds.join(',');
  }

  private get archiveExcludedCategoryIds(): string {
    return [
      ...this.contentPolicy.excludedCategoryIds,
      this.contentPolicy.sanakaverseCategoryId,
    ].join(',');
  }

  private isArchiveExcludedCategory(categoryId: number): boolean {
    return (
      this.contentPolicy.excludedCategoryIds.includes(categoryId) ||
      categoryId === this.contentPolicy.sanakaverseCategoryId
    );
  }

  private readCountHeader(value: string | null, fallback: number): number {
    if (value === null) {
      return fallback;
    }

    const parsedValue = Number(value);

    return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
  }
}
