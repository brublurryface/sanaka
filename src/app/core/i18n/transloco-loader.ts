import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string) {
    // Revalida o dicionário para obter novas chaves mesmo com uma cópia antiga no cache.
    return this.http.get<Translation>(`/i18n/${lang}.json`, { cache: 'no-cache' });
  }
}
