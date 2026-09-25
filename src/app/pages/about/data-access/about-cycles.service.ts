import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap, timeout } from 'rxjs';

import { WORDPRESS_API_URL } from '../../../core/wordpress/wordpress-api';
import { WordPressTextService } from '../../../core/wordpress/wordpress-text.service';

export interface AboutCyclePost {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly hoverText: string;
  readonly excerpt: string;
  readonly url: string;
  readonly order: number;
}

interface WordPressRenderedField {
  readonly rendered: string;
}

interface WordPressCategory {
  readonly id: number;
}

interface WordPressCyclePost {
  readonly id: number;
  readonly slug: string;
  readonly link: string;
  readonly title: WordPressRenderedField;
  readonly excerpt: WordPressRenderedField;
  readonly hover_text?: string | WordPressRenderedField;
  readonly meta?: {
    readonly hover_text?: string | WordPressRenderedField;
  };
}

const ROMAN_CYCLE_ORDER = new Map<string, number>([
  ['I', 1],
  ['II', 2],
  ['III', 3],
  ['IV', 4],
  ['V', 5],
  ['VI', 6],
]);

/** Consulta a coleção autobiográfica publicada no WordPress. */
@Injectable({ providedIn: 'root' })
export class AboutCyclesService {
  private readonly requestTimeoutMs = 10_000;
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(WORDPRESS_API_URL);
  private readonly wordpressText = inject(WordPressTextService);

  /**
   * Resolve a categoria por slug antes de carregar seus capítulos.
   *
   * O slug é estável entre ambientes; o ID numérico pertence à instalação atual do WordPress.
   */
  getCycles(categorySlug = 'sobre'): Observable<readonly AboutCyclePost[]> {
    const categoryParams = new HttpParams().set('slug', categorySlug).set('_fields', 'id');

    return this.http
      .get<readonly WordPressCategory[]>(`${this.apiUrl}/categories`, {
        params: categoryParams,
      })
      .pipe(
        map((categories) => categories[0]?.id),
        switchMap((categoryId) => this.loadCycles(categoryId)),
        timeout({ first: this.requestTimeoutMs }),
      );
  }

  private loadCycles(categoryId: number | undefined): Observable<readonly AboutCyclePost[]> {
    if (!categoryId) {
      throw new Error('Categoria autobiográfica não encontrada no WordPress.');
    }

    const postsParams = new HttpParams()
      .set('categories', String(categoryId))
      .set('per_page', '100')
      .set('_fields', 'id,slug,link,title,excerpt,hover_text,meta');

    return this.http
      .get<readonly WordPressCyclePost[]>(`${this.apiUrl}/posts`, {
        params: postsParams,
      })
      .pipe(map((posts) => this.normalizeCycles(posts)));
  }

  private normalizeCycles(posts: readonly WordPressCyclePost[]): readonly AboutCyclePost[] {
    return posts
      .map((post) => {
        const title = this.wordpressText.toText(post.title.rendered);

        return {
          id: post.id,
          slug: post.slug,
          title,
          hoverText: this.readRenderedText(post.hover_text ?? post.meta?.hover_text),
          excerpt: this.wordpressText.toText(post.excerpt.rendered),
          url: post.link,
          order: this.readCycleOrder(title),
        };
      })
      .sort((first, second) => first.order - second.order);
  }

  private readCycleOrder(title: string): number {
    const romanNumeral = title.match(/^\s*(I{1,3}|IV|V|VI)\b/)?.[1];
    return ROMAN_CYCLE_ORDER.get(romanNumeral ?? '') ?? Number.MAX_SAFE_INTEGER;
  }

  private readRenderedText(value: string | WordPressRenderedField | undefined): string {
    if (!value) {
      return '';
    }

    return this.wordpressText.toText(typeof value === 'string' ? value : value.rendered);
  }
}
