import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, switchMap, timeout } from 'rxjs';

import { WORDPRESS_API_URL } from '../../../core/wordpress/wordpress-api';
import { SANAKA_WORDPRESS_CONTENT_POLICY } from '../../../core/wordpress/wordpress-content-policy';
import { WordPressTextService } from '../../../core/wordpress/wordpress-text.service';
import { SanakaverseBook } from '../sanakaverse-book';

interface WordPressRenderedField {
  readonly rendered: string;
}

interface WordPressCategory {
  readonly id: number;
}

interface WordPressBookCover {
  readonly source_url?: string;
  readonly url?: string;
  readonly rendered?: string;
  readonly value?: string | readonly string[];
  readonly alt_text?: string;
  readonly alt?: string;
}

type WordPressBookCoverField = string | WordPressBookCover | readonly WordPressBookCoverField[];

function isCoverFieldList(
  cover: WordPressBookCoverField,
): cover is readonly WordPressBookCoverField[] {
  return Array.isArray(cover);
}

interface WordPressBookPost {
  readonly id: number;
  readonly slug: string;
  readonly title: WordPressRenderedField;
  readonly sanakaverse_cover?: WordPressBookCoverField;
  readonly meta?: {
    readonly sanakaverse_cover?: WordPressBookCoverField;
  };
}

/** Consulta apenas os posts publicados como volumes do Sanakaverse. */
@Injectable({ providedIn: 'root' })
export class SanakaverseBooksService {
  private readonly requestTimeoutMs = 10_000;
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(WORDPRESS_API_URL);
  private readonly contentPolicy = inject(SANAKA_WORDPRESS_CONTENT_POLICY);
  private readonly wordpressText = inject(WordPressTextService);

  /**
   * Resolve a categoria editorial e carrega seus volumes em ordem de publicação.
   *
   * A capa é deliberadamente independente da imagem destacada do post. O campo REST
   * `sanakaverse_cover` deve entregar a URL e, de preferência, o texto alternativo da capa.
   */
  getBooks(): Observable<readonly SanakaverseBook[]> {
    const categoryParams = new HttpParams()
      .set('slug', this.contentPolicy.sanakaverseCategorySlug)
      .set('per_page', '1')
      .set('_fields', 'id');

    return this.http
      .get<readonly WordPressCategory[]>(`${this.apiUrl}/categories`, {
        params: categoryParams,
      })
      .pipe(
        switchMap((categories) => {
          const categoryId = categories[0]?.id;

          if (!categoryId) {
            return of([]);
          }

          return this.loadCategoryBooks(categoryId);
        }),
        timeout({ first: this.requestTimeoutMs }),
      );
  }

  private loadCategoryBooks(categoryId: number): Observable<readonly SanakaverseBook[]> {
    const postsParams = new HttpParams()
      .set('categories', String(categoryId))
      .set('categories_exclude', this.contentPolicy.excludedCategoryIds.join(','))
      .set('per_page', '100')
      .set('orderby', 'date')
      .set('order', 'asc')
      .set('_fields', 'id,slug,title,sanakaverse_cover,meta');

    return this.http
      .get<readonly WordPressBookPost[]>(`${this.apiUrl}/posts`, { params: postsParams })
      .pipe(map((posts) => posts.map((post) => this.mapBook(post))));
  }

  private mapBook(post: WordPressBookPost): SanakaverseBook {
    const cover = post.sanakaverse_cover ?? post.meta?.sanakaverse_cover;

    return {
      id: post.id,
      slug: post.slug,
      title: this.wordpressText.toText(post.title.rendered),
      coverImageUrl: this.readCoverUrl(cover),
      coverImageAlt: this.readCoverAlt(cover),
    };
  }

  private readCoverUrl(cover: WordPressBookCoverField | undefined): string | undefined {
    if (cover && isCoverFieldList(cover)) {
      return cover.map((entry) => this.readCoverUrl(entry)).find(Boolean);
    }

    if (!cover || typeof cover === 'string') {
      return cover?.trim() || undefined;
    }

    const value = Array.isArray(cover.value) ? cover.value[0] : cover.value;
    const url = cover.source_url ?? cover.url ?? cover.rendered ?? value;

    return url?.trim() || undefined;
  }

  private readCoverAlt(cover: WordPressBookCoverField | undefined): string | undefined {
    if (cover && isCoverFieldList(cover)) {
      return cover.map((entry) => this.readCoverAlt(entry)).find(Boolean);
    }

    if (!cover || typeof cover === 'string') {
      return undefined;
    }

    return (cover.alt_text ?? cover.alt)?.trim() || undefined;
  }
}
