import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string) {
    // Revalidate even when the browser still considers an older dictionary fresh.
    return this.http.get<Translation>(`/i18n/${lang}.json`, { cache: 'no-cache' });
  }
}
