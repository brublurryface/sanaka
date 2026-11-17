import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap, throwError, timeout } from 'rxjs';

import { WORDPRESS_API_URL } from '../../../core/wordpress/wordpress-api';
import {
  excludeWordPressCategoryBranches,
  ResolvedWordPressContentPolicy,
} from '../../../core/wordpress/wordpress-content-policy';
import { WordPressContentPolicyService } from '../../../core/wordpress/wordpress-content-policy.service';
import { WordPressTextService } from '../../../core/wordpress/wordpress-text.service';
import {
  assertWordPressIdentities,
  isWordPressRecord,
  wordPressArray,
  wordPressCountHeader,
  wordPressIdentity,
  wordPressPostReference,
  wordPressRecord,
  WordPressContractError,
  type WordPressRenderedField,
} from '../../../core/wordpress/wordpress-response';
import { SanakaverseBook } from '../sanakaverse-book';

interface WordPressBookPost {
  readonly id: number;
  readonly slug: string;
  readonly title: WordPressRenderedField;
  readonly cover: unknown;
}

export interface SanakaverseBooksPage {
  readonly books: readonly SanakaverseBook[];
  readonly page: number;
  readonly perPage: number;
  readonly total: number;
  readonly totalPages: number;
}

/** Consulta apenas os posts publicados como volumes de Sanaka-loka. */
@Injectable({ providedIn: 'root' })
export class SanakaverseBooksService {
  private readonly requestTimeoutMs = 10_000;
  private readonly pageSize = 12;
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(WORDPRESS_API_URL);
  private readonly contentPolicy = inject(WordPressContentPolicyService);
  private readonly wordpressText = inject(WordPressTextService);

  /**
   * Resolve a categoria editorial e carrega seus volumes em ordem de publicação.
   *
   * A capa é deliberadamente independente da imagem destacada do post. O campo REST
   * `sanakaverse_cover` deve entregar a URL e, de preferência, o texto alternativo da capa.
   */
  getBooks(page = 1): Observable<SanakaverseBooksPage> {
    const requestedPage = Number.isSafeInteger(page) && page > 0 ? page : 1;
    return this.contentPolicy
      .resolve()
      .pipe(
        switchMap((policy) =>
          policy.sanakaverseCategoryId === undefined
            ? throwError(() => new Error('Categoria editorial de Sanaka-loka ausente.'))
            : this.loadCategoryBooks(policy.sanakaverseCategoryId, policy, requestedPage),
        ),
      );
  }

  private loadCategoryBooks(
    categoryId: number,
    policy: ResolvedWordPressContentPolicy,
    page: number,
  ): Observable<SanakaverseBooksPage> {
    const params = excludeWordPressCategoryBranches(
      new HttpParams()
        .set('categories[terms]', String(categoryId))
        .set('categories[include_children]', 'true')
        .set('page', String(page))
        .set('per_page', String(this.pageSize))
        .set('orderby', 'date')
        .set('order', 'asc')
        .set('_fields', 'id,slug,title,sanakaverse_cover,meta'),
      policy.excludedCategoryIds,
    );
    return this.http.get<unknown>(`${this.apiUrl}/posts`, { params, observe: 'response' }).pipe(
      map((response) => this.mapPage(response, page)),
      timeout({ first: this.requestTimeoutMs }),
    );
  }

  private mapPage(response: HttpResponse<unknown>, page: number): SanakaverseBooksPage {
    const posts = wordPressArray(response.body).map((entry) => {
      const item = wordPressRecord(entry);
      const meta = item['meta'];
      return {
        ...wordPressIdentity(item),
        ...wordPressPostReference(item),
        cover:
          item['sanakaverse_cover'] ??
          (isWordPressRecord(meta) ? meta['sanakaverse_cover'] : undefined),
      };
    });
    assertWordPressIdentities(posts);
    const total = wordPressCountHeader(response.headers.get('X-WP-Total'));
    const totalPages = wordPressCountHeader(response.headers.get('X-WP-TotalPages'));
    const expectedSize = Math.min(this.pageSize, Math.max(0, total - (page - 1) * this.pageSize));
    if (
      totalPages !== Math.ceil(total / this.pageSize) ||
      posts.length !== expectedSize ||
      (totalPages > 0 && page > totalPages)
    )
      throw new WordPressContractError('O WordPress retornou uma página de livros incoerente.');
    return {
      books: posts.map((post) => this.mapBook(post)),
      page,
      perPage: this.pageSize,
      total,
      totalPages,
    };
  }

  private mapBook(post: WordPressBookPost): SanakaverseBook {
    const cover = post.cover;

    return {
      id: post.id,
      slug: post.slug,
      title: this.wordpressText.toText(post.title.rendered),
      coverImageUrl: this.readCoverUrl(cover),
      coverImageAlt: this.readCoverAlt(cover),
    };
  }

  private readCoverUrl(cover: unknown, depth = 0): string | undefined {
    if (depth > 8) return undefined;
    if (Array.isArray(cover)) {
      return cover.map((entry: unknown) => this.readCoverUrl(entry, depth + 1)).find(Boolean);
    }
    if (typeof cover === 'string') return cover.trim() || undefined;
    if (!isWordPressRecord(cover)) return undefined;
    const value = Array.isArray(cover['value']) ? cover['value'][0] : cover['value'];
    return [cover['source_url'], cover['url'], cover['rendered'], value]
      .find((entry): entry is string => typeof entry === 'string' && !!entry.trim())
      ?.trim();
  }

  private readCoverAlt(cover: unknown, depth = 0): string | undefined {
    if (depth > 8) return undefined;
    if (Array.isArray(cover)) {
      return cover.map((entry: unknown) => this.readCoverAlt(entry, depth + 1)).find(Boolean);
    }
    if (!isWordPressRecord(cover)) return undefined;
    return [cover['alt_text'], cover['alt']]
      .find((entry): entry is string => typeof entry === 'string' && !!entry.trim())
      ?.trim();
  }
}
