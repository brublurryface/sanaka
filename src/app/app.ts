import { afterNextRender, Component, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { PageLoadingState } from './core/navigation/page-loading-state';
import { LoadingIndicator } from './shared/loading-indicator/loading-indicator';
import {
  LanguagePreferenceService,
  type SupportedLanguage,
} from './core/i18n/language-preference.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    TranslocoPipe,
    LoadingIndicator,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: { '[class.app--loading]': 'pageLoading.active()' },
})
export class App {
  protected readonly pageLoading = inject(PageLoadingState);
  private readonly languagePreference = inject(LanguagePreferenceService);

  constructor() {
    afterNextRender(() => {
      this.languagePreference.initialize();
    });
  }

  setLanguage(language: SupportedLanguage): void {
    this.languagePreference.setLanguage(language);
  }

  isActiveLanguage(language: SupportedLanguage): boolean {
    return this.languagePreference.isActiveLanguage(language);
  }
}
