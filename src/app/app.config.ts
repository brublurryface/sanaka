import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { TitleStrategy, provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { routes } from './app.routes';
import { translocoConfig } from './core/i18n/transloco.config';
import { SanakaTitleStrategy } from './core/navigation/sanaka-title.strategy';
import {
  isPublicWordPressRead,
  WORDPRESS_TRANSFER_HEADERS,
} from './core/wordpress/wordpress-transfer-cache';

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
    provideClientHydration(
      withHttpTransferCacheOptions({
        filter: isPublicWordPressRead,
        includeHeaders: WORDPRESS_TRANSFER_HEADERS,
      }),
    ),
    provideHttpClient(),
    provideTransloco(translocoConfig),
    { provide: TitleStrategy, useClass: SanakaTitleStrategy },
  ],
};
