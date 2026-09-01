import { afterNextRender, Component, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import {
  LanguagePreferenceService,
  type SupportedLanguage,
} from './core/i18n/language-preference.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, TranslocoPipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
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
