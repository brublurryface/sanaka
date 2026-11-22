import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { assertFormFlag } from '../../../../core/http/form-response';

import {
  NewsletterAvailability,
  NewsletterSignupRequest,
  NewsletterSignupResponse,
} from '../../../../../shared/newsletter';

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private readonly http = inject(HttpClient);

  /** Consulta somente se o servidor está configurado; não chama a Brevo nem envia dados pessoais. */
  getAvailability(): Observable<NewsletterAvailability> {
    return this.http
      .get<unknown>('/api/newsletter/status', {
        transferCache: false,
      })
      .pipe(
        map((body) => {
          assertFormFlag(body, 'available');
          return { available: body.available };
        }),
      );
  }

  /** O navegador conhece apenas o contrato público. A chave e a lista ficam no servidor. */
  subscribe(signup: NewsletterSignupRequest): Observable<NewsletterSignupResponse> {
    return this.http.post<unknown>('/api/newsletter', signup).pipe(
      map((body) => {
        assertFormFlag(body, 'accepted');
        return { accepted: body.accepted };
      }),
    );
  }
}
