import { InjectionToken } from '@angular/core';

/** Endereço-base compartilhado pelas integrações públicas com o WordPress. */
export const WORDPRESS_API_URL = new InjectionToken<string>('WORDPRESS_API_URL', {
  factory: () => 'https://www.sanaka.com.br/wp-json/wp/v2',
});
