import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { defer, finalize, map, Observable, of, shareReplay, tap, timeout } from 'rxjs';

import { WORDPRESS_API_URL } from './wordpress-api';
import {
  ResolvedWordPressContentPolicy,
  SANAKA_WORDPRESS_CONTENT_POLICY,
} from './wordpress-content-policy';

interface WordPressEditorialCategory {
  readonly id: number;
  readonly slug: string;
}

/** Compartilha a resolução editorial entre Posts, Sobre e a biblioteca. */
@Injectable({ providedIn: 'root' })
export class WordPressContentPolicyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(WORDPRESS_API_URL);
  private readonly policy = inject(SANAKA_WORDPRESS_CONTENT_POLICY);
  private readonly cacheDurationMs = 5 * 60_000;
  private readonly requestTimeoutMs = 10_000;
  private cached?: { readonly value: ResolvedWordPressContentPolicy; readonly expiresAt: number };
  private pending$?: Observable<ResolvedWordPressContentPolicy>;

  /** Revalida na próxima assinatura após expirar; falhas nunca removem as exclusões. */
  resolve(): Observable<ResolvedWordPressContentPolicy> {
    return defer(() => {
      if (this.cached && Date.now() < this.cached.expiresAt) return of(this.cached.value);
      if (!this.pending$) {
        const request$: Observable<ResolvedWordPressContentPolicy> = this.load().pipe(
          tap({
            next: (value) => {
              this.cached = { value, expiresAt: Date.now() + this.cacheDurationMs };
            },
            error: () => {
              if (this.pending$ === request$) this.pending$ = undefined;
            },
          }),
          // Uma tentativa anterior não pode limpar outra iniciada no callback de erro.
          finalize(() => {
            if (this.pending$ === request$) this.pending$ = undefined;
          }),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
        this.pending$ = request$;
      }
      return this.pending$;
    });
  }

  private load(): Observable<ResolvedWordPressContentPolicy> {
    const slugs = [
      ...new Set([
        ...this.policy.excludedCategorySlugs,
        this.policy.aboutCycleCategorySlug,
        this.policy.sanakaverseCategorySlug,
      ]),
    ];
    const params = new HttpParams()
      .set('slug', slugs.join(','))
      .set('per_page', '100')
      .set('_fields', 'id,slug');
    return this.http
      .get<readonly WordPressEditorialCategory[]>(`${this.apiUrl}/categories`, { params })
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        map((categories) => {
          const idFor = (slug: string): number | undefined => {
            const category = categories.find((item) => item.slug === slug);
            if (category && (!Number.isInteger(category.id) || category.id <= 0))
              throw new Error(`Categoria editorial inválida: ${slug}.`);
            return category?.id;
          };
          const excludedCategoryIds = this.policy.excludedCategorySlugs.map((slug) => {
            const id = idFor(slug);
            if (id === undefined)
              throw new Error(`Categoria editorial obrigatória ausente: ${slug}.`);
            return id;
          });
          return {
            excludedCategoryIds,
            aboutCycleCategoryId: idFor(this.policy.aboutCycleCategorySlug),
            sanakaverseCategoryId: idFor(this.policy.sanakaverseCategorySlug),
          };
        }),
      );
  }
}
