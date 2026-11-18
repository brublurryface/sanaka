import { mergeApplicationConfig } from '@angular/core';
import {
  HTTP_TRANSFER_CACHE_ORIGIN_MAP,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  BootstrapContext,
  bootstrapApplication,
  provideClientHydration,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { App } from '../../src/app/app';
import { config } from '../../src/app/app.config.server';
import { WORDPRESS_REST_URL } from '../../src/app/core/wordpress/wordpress-api';
import {
  isPublicWordPressRead,
  WORDPRESS_TRANSFER_HEADERS,
} from '../../src/app/core/wordpress/wordpress-transfer-cache';
import { boundedOptionalReads } from './optional-requests';

// Configuração de benchmark: só aceita a fixture local, sem credenciais nem tráfego ao CMS real.
const fixtureRoot = 'http://127.0.0.1:45931/wp-json';
const benchmarkConfig = mergeApplicationConfig(config, {
  providers: [
    { provide: WORDPRESS_REST_URL, useValue: fixtureRoot },
    {
      provide: HTTP_TRANSFER_CACHE_ORIGIN_MAP,
      useValue: { 'http://127.0.0.1:45931': 'https://cms.sanaka.com.br' },
    },
    provideHttpClient(withInterceptors([boundedOptionalReads])),
    provideClientHydration(
      withHttpTransferCacheOptions({
        filter: (request) => isPublicWordPressRead(request, fixtureRoot),
        includeHeaders: WORDPRESS_TRANSFER_HEADERS,
      }),
    ),
  ],
});

export default (context: BootstrapContext) => bootstrapApplication(App, benchmarkConfig, context);
