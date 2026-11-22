import { inject, InjectionToken } from '@angular/core';

export const DEFAULT_WORDPRESS_REST_URL = 'https://cms.sanaka.com.br/wp-json';

/**
 * Raiz compartilhada por namespaces públicos e próprios da REST API do WordPress.
 * O hostname do CMS mantém essas integrações na Locaweb quando o site público mudar de servidor.
 */
export const WORDPRESS_REST_URL = new InjectionToken<string>('WORDPRESS_REST_URL', {
  factory: () => DEFAULT_WORDPRESS_REST_URL,
});

/** Endereço-base compartilhado pelas integrações públicas com o WordPress. */
export const WORDPRESS_API_URL = new InjectionToken<string>('WORDPRESS_API_URL', {
  factory: () => `${inject(WORDPRESS_REST_URL)}/wp/v2`,
});
