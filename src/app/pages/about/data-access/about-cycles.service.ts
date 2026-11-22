import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, switchMap, timeout } from 'rxjs';

import { WORDPRESS_API_URL } from '../../../core/wordpress/wordpress-api';
import { excludeWordPressCategoryBranches } from '../../../core/wordpress/wordpress-content-policy';
import { WordPressContentPolicyService } from '../../../core/wordpress/wordpress-content-policy.service';
import { WordPressTextService } from '../../../core/wordpress/wordpress-text.service';
import {
  assertWordPressIdentities,
  isWordPressRecord,
  wordPressArray,
  wordPressIdentity,
  wordPressRecord,
  wordPressRenderedField,
  WordPressContractError,
} from '../../../core/wordpress/wordpress-response';

export interface AboutCyclePost {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly hoverText: string;
  readonly excerpt: string;
  readonly order: number;
}

const ROMAN_CYCLE_ORDER = new Map<string, number>([
  ['I', 1],
  ['II', 2],
  ['III', 3],
  ['IV', 4],
  ['V', 5],
  ['VI', 6],
  ['VII', 7],
  ['VIII', 8],
  ['IX', 9],
]);

/** Consulta a coleção autobiográfica publicada no WordPress. */
@Injectable({ providedIn: 'root' })
export class AboutCyclesService {
  private readonly requestTimeoutMs = 10_000;
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(WORDPRESS_API_URL);
  private readonly contentPolicy = inject(WordPressContentPolicyService);
  private readonly wordpressText = inject(WordPressTextService);

  /** Preserva os nove fragmentos e sua ordem; resolve a categoria pelo slug editorial. */
  getCycles(): Observable<readonly AboutCyclePost[]> {
    return this.contentPolicy.resolve().pipe(
      switchMap((policy) => {
        if (policy.aboutCycleCategoryId === undefined) return of([]);
        const params = excludeWordPressCategoryBranches(
          new HttpParams()
            .set('categories', String(policy.aboutCycleCategoryId))
            .set('per_page', ROMAN_CYCLE_ORDER.size)
            .set('_fields', 'id,slug,title,excerpt,hover_text,meta'),
          policy.excludedCategoryIds,
        );
        return this.http.get<unknown>(`${this.apiUrl}/posts`, { params }).pipe(
          map((posts) => this.normalizeCycles(posts)),
          timeout({ first: this.requestTimeoutMs }),
        );
      }),
    );
  }

  private normalizeCycles(body: unknown): readonly AboutCyclePost[] {
    const posts = wordPressArray(body);
    if (posts.length > ROMAN_CYCLE_ORDER.size) throw new WordPressContractError();
    const cycles = posts
      .map((entry) => {
        const post = wordPressRecord(entry);
        const title = this.wordpressText.toText(wordPressRenderedField(post['title']).rendered);
        const meta = post['meta'];

        return {
          ...wordPressIdentity(post),
          title,
          hoverText:
            this.readRenderedText(post['hover_text']) ??
            this.readRenderedText(isWordPressRecord(meta) ? meta['hover_text'] : undefined) ??
            '',
          excerpt: this.wordpressText.toText(wordPressRenderedField(post['excerpt']).rendered),
          order: this.readCycleOrder(title),
        };
      })
      .sort((first, second) => first.order - second.order);
    assertWordPressIdentities(cycles);
    if (new Set(cycles.map((cycle) => cycle.order)).size !== cycles.length) {
      throw new WordPressContractError('Dois fragmentos ocupam a mesma posição no quebra-cabeça.');
    }
    return cycles;
  }

  private readCycleOrder(title: string): number {
    const numeral = title.match(/^\s*([IVXLCDM]+)\b/u)?.[1];
    const order = ROMAN_CYCLE_ORDER.get(numeral ?? '');
    if (order === undefined) throw new WordPressContractError('Posição do fragmento inválida.');
    return order;
  }

  private readRenderedText(value: unknown): string | undefined {
    if (typeof value === 'string') return this.wordpressText.toText(value);
    return isWordPressRecord(value) && typeof value['rendered'] === 'string'
      ? this.wordpressText.toText(value['rendered'])
      : undefined;
  }
}
