import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  NewsletterAvailability,
  NewsletterSignupRequest,
  NewsletterSignupResponse,
} from '../../../../../shared/newsletter';

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private readonly http = inject(HttpClient);

  /** Consulta somente se o servidor está configurado; não chama a Brevo nem envia dados pessoais. */
  getAvailability() {
    return this.http.get<NewsletterAvailability>('/api/newsletter/status', {
      transferCache: false,
    });
  }

  /** O navegador conhece apenas o contrato público. A chave e a lista ficam no servidor. */
  subscribe(signup: NewsletterSignupRequest) {
    return this.http.post<NewsletterSignupResponse>('/api/newsletter', signup);
  }
}
