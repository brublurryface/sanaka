import type { HttpRequest } from '@angular/common/http';
import { DEFAULT_WORDPRESS_REST_URL } from './wordpress-api';

export const WORDPRESS_TRANSFER_HEADERS = ['X-WP-Total', 'X-WP-TotalPages'];

/** Só transfere leituras públicas editoriais. Contadores e dados autenticados ficam fora. */
export function isPublicWordPressRead(
  request: HttpRequest<unknown>,
  restUrl = DEFAULT_WORDPRESS_REST_URL,
): boolean {
  if (
    !['GET', 'HEAD'].includes(request.method) ||
    request.withCredentials ||
    ['Authorization', 'Proxy-Authorization', 'Cookie'].some((name) => request.headers.has(name))
  )
    return false;
  try {
    const url = new URL(request.urlWithParams);
    const root = new URL(restUrl);
    return (
      url.origin === root.origin &&
      new RegExp(
        `^${root.pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/wp/v2/(posts|categories|tags)(/\\d+)?$`,
      ).test(url.pathname) &&
      (!url.searchParams.has('context') || url.searchParams.get('context') === 'view') &&
      (!url.searchParams.has('status') || url.searchParams.get('status') === 'publish') &&
      !url.searchParams.has('password')
    );
  } catch {
    return false;
  }
}
