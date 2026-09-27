import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { routes } from './app.routes';
import { translocoConfig } from './core/i18n/transloco.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'top',
      }),
    ),
    provideClientHydration(),
    provideHttpClient(),
    provideTransloco(translocoConfig),
  ],
};
