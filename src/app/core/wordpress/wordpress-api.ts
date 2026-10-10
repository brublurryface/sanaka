import { inject, InjectionToken } from '@angular/core';

/** Raiz compartilhada por namespaces públicos e próprios da REST API do WordPress. */
export const WORDPRESS_REST_URL = new InjectionToken<string>('WORDPRESS_REST_URL', {
  factory: () => 'https://www.sanaka.com.br/wp-json',
});

/** Endereço-base compartilhado pelas integrações públicas com o WordPress. */
export const WORDPRESS_API_URL = new InjectionToken<string>('WORDPRESS_API_URL', {
  factory: () => `${inject(WORDPRESS_REST_URL)}/wp/v2`,
});
