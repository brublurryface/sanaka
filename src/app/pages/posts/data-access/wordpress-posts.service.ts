import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { forkJoin, map, Observable, of, shareReplay, switchMap, timeout } from 'rxjs';

import { Post } from '../post';

export const WORDPRESS_API_URL = new InjectionToken<string>('WORDPRESS_API_URL', {
  factory: () => 'https://www.sanaka.com.br/wp-json/wp/v2',
});

/** Parâmetros aceitos pelo adaptador ao consultar o arquivo do WordPress. */
export interface PostsQuery {
  readonly page?: number;
  readonly perPage?: number;
  readonly search?: string;
  readonly categoryId?: number;
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
  readonly featured_media: number;
  readonly categories: readonly number[];
}

interface WordPressCategory {
  readonly id: number;
  readonly name: string;
}

interface WordPressMedia {
  readonly id: number;
  readonly source_url: string;
  readonly alt_text: string;
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

  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(WORDPRESS_API_URL);

  private readonly categories$ = this.loadCategories().pipe(
    shareReplay({
      bufferSize: 1,
      refCount: false,
    }),
  );

  /**
   * Busca uma página de publicações e reúne categorias e mídias relacionadas.
   *
   * @param query Filtros e paginação solicitados pela store.
   * @returns Um fluxo com os dados convertidos para os modelos usados pela feature.
   */
  getPosts(query: PostsQuery = {}): Observable<PostsPage> {
    const page = this.toPositiveInteger(query.page, 1);
    const perPage = Math.min(this.toPositiveInteger(query.perPage, this.defaultPerPage), 100);
    const search = query.search?.trim() ?? '';

    let params = new HttpParams()
      .set('page', String(page))
      .set('per_page', String(perPage))
      .set('_fields', 'id,slug,date,title,excerpt,featured_media,categories');

    if (search) {
      params = params.set('search', search);
    }

    if (query.categoryId && query.categoryId > 0) {
      params = params.set('categories', String(query.categoryId));
    }

    return this.http
      .get<readonly WordPressPost[]>(`${this.apiUrl}/posts`, {
        params,
        observe: 'response',
      })
      .pipe(
        switchMap((response) => {
          const posts = response.body ?? [];
          const fallbackTotal = (page - 1) * perPage + posts.length;
          const total = this.readCountHeader(response.headers.get('X-WP-Total'), fallbackTotal);
          const totalPages = this.readCountHeader(
            response.headers.get('X-WP-TotalPages'),
            total === 0 ? 0 : Math.ceil(total / perPage),
          );

          return forkJoin({
            categories: this.categories$,
            media: this.getMedia(posts),
          }).pipe(
            map(({ categories, media }) => ({
              posts: this.mapPosts(posts, categories, media),
              page,
              perPage,
              total,
              totalPages,
            })),
          );
        }),
        timeout({ first: this.requestTimeoutMs }),
      );
  }

  private loadCategories(): Observable<readonly WordPressCategory[]> {
    return this.http.get<readonly WordPressCategory[]>(`${this.apiUrl}/categories`, {
      params: new HttpParams().set('per_page', '100').set('_fields', 'id,name'),
    });
  }

  private getMedia(posts: readonly WordPressPost[]): Observable<readonly WordPressMedia[]> {
    const mediaIds = [...new Set(posts.map((post) => post.featured_media).filter((id) => id > 0))];

    if (mediaIds.length === 0) {
      return of([]);
    }

    return this.http.get<readonly WordPressMedia[]>(`${this.apiUrl}/media`, {
      params: new HttpParams()
        .set('include', mediaIds.join(','))
        .set('per_page', String(mediaIds.length))
        .set('_fields', 'id,source_url,alt_text'),
    });
  }

  private mapPosts(
    posts: readonly WordPressPost[],
    categories: readonly WordPressCategory[],
    media: readonly WordPressMedia[],
  ): readonly Post[] {
    const categoryById = new Map(
      categories.map((category) => [category.id, this.htmlToText(category.name)]),
    );
    const mediaById = new Map(media.map((item) => [item.id, item]));

    return posts.map((post) => {
      const coverImage = mediaById.get(post.featured_media);
      const category = post.categories
        .map((categoryId) => categoryById.get(categoryId))
        .filter((name): name is string => Boolean(name))
        .join(' · ');

      return {
        id: post.id,
        slug: post.slug,
        title: this.htmlToText(post.title.rendered),
        excerpt: this.htmlToText(post.excerpt.rendered),
        publishedAt: post.date.slice(0, 10),
        category,
        coverImageUrl: coverImage?.source_url,
        coverImageAlt: coverImage?.alt_text,
      };
    });
  }

  private htmlToText(html: string): string {
    const container = this.document.createElement('div');

    container.innerHTML = html.replace(/<\/(?:p|div|blockquote|li|h[1-6])>/gi, ' ');
    container.querySelectorAll('.more-link, script, style').forEach((element) => element.remove());

    return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  private toPositiveInteger(value: number | undefined, fallback: number): number {
    return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
  }

  private readCountHeader(value: string | null, fallback: number): number {
    if (value === null) {
      return fallback;
    }

    const parsedValue = Number(value);

    return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
  }
}
