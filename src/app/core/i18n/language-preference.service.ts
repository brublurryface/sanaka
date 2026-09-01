import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type SupportedLanguage = 'pt-BR' | 'en';

@Injectable({
  providedIn: 'root',
})
export class LanguagePreferenceService {
  private readonly document = inject(DOCUMENT);
  private readonly transloco = inject(TranslocoService);

  private readonly storageKey = 'sanaka.language';

  initialize(): void {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return;
    }

    const savedLanguage = this.getSavedLanguage(browserWindow);

    if (savedLanguage) {
      this.transloco.setActiveLang(savedLanguage);
      return;
    }

    this.transloco.setActiveLang(this.detectBrowserLanguage(browserWindow.navigator));
  }

  setLanguage(language: SupportedLanguage): void {
    this.transloco.setActiveLang(language);

    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return;
    }

    try {
      browserWindow.localStorage.setItem(this.storageKey, language);
    } catch {
      // The language still changes even when browser storage is unavailable.
    }
  }

  isActiveLanguage(language: SupportedLanguage): boolean {
    return this.transloco.getActiveLang() === language;
  }

  private getSavedLanguage(browserWindow: Window): SupportedLanguage | null {
    try {
      const savedLanguage = browserWindow.localStorage.getItem(this.storageKey);

      return this.isSupportedLanguage(savedLanguage) ? savedLanguage : null;
    } catch {
      return null;
    }
  }

  private detectBrowserLanguage(navigator: Navigator): SupportedLanguage {
    const browserLanguage = navigator.languages?.[0] ?? navigator.language;

    const normalizedLanguage = browserLanguage.toLowerCase();

    if (normalizedLanguage.startsWith('pt')) {
      return 'pt-BR';
    }

    return 'en';
  }

  private isSupportedLanguage(language: string | null): language is SupportedLanguage {
    return language === 'pt-BR' || language === 'en';
  }
}
