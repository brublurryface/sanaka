import { HttpRequest } from '@angular/common/http';

export const WORDPRESS_TRANSFER_HEADERS = ['X-WP-Total', 'X-WP-TotalPages'];

/** Só transfere leituras públicas editoriais. Contadores e dados autenticados ficam fora. */
export function isPublicWordPressRead(
  request: HttpRequest<unknown>,
  restUrl = 'https://cms.sanaka.com.br/wp-json',
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
