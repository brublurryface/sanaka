import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, timeout } from 'rxjs';

import { WORDPRESS_REST_URL } from '../../../core/wordpress/wordpress-api';

interface WordPressOboloResponse {
  readonly characterSlug: string;
  readonly total: number;
}

/** Integra a oferta simbólica por personagem sem acoplar o contador a uma publicação. */
@Injectable({ providedIn: 'root' })
export class CharacterOboloService {
  private readonly requestTimeoutMs = 10_000;
  private readonly http = inject(HttpClient);
  private readonly restUrl = inject(WORDPRESS_REST_URL);

  /** Consulta o total persistido para a personagem. */
  getTotal(characterSlug: string): Observable<number> {
    return this.http.get<WordPressOboloResponse>(this.buildUrl(characterSlug)).pipe(
      map((response) => this.readTotal(response, characterSlug)),
      timeout({ first: this.requestTimeoutMs }),
    );
  }

  /** Deposita exatamente um óbolo; o backend não aceita um incremento escolhido pelo cliente. */
  offer(characterSlug: string): Observable<number> {
    return this.http.post<WordPressOboloResponse>(this.buildUrl(characterSlug), null).pipe(
      map((response) => this.readTotal(response, characterSlug)),
      timeout({ first: this.requestTimeoutMs }),
    );
  }

  private buildUrl(characterSlug: string): string {
    return `${this.restUrl}/sanaka/v1/obolos/${encodeURIComponent(characterSlug)}`;
  }

  private readTotal(response: WordPressOboloResponse, requestedSlug: string): number {
    if (
      response.characterSlug !== requestedSlug ||
      !Number.isInteger(response.total) ||
      response.total < 0
    ) {
      throw new Error('Resposta inválida do contador de óbolos.');
    }

    return response.total;
  }
}
