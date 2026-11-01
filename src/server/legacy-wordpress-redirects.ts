import type { RequestHandler } from 'express';

import {
  LEGACY_CONTACT_PAGE_ID,
  LEGACY_SANAKA_POSTS,
  LEGACY_WORDPRESS_PAGES,
} from './legacy-wordpress-data';

const WORDPRESS_ORIGIN = 'https://cms.sanaka.com.br';
const applicationPosts = new Map<string, string>(
  LEGACY_SANAKA_POSTS.map(({ path }) => [path, `/posts/${path.slice(path.lastIndexOf('/') + 1)}`]),
);
const applicationShortlinks = new Map<string, string>([
  ...LEGACY_SANAKA_POSTS.map(({ id, path }) => [`p=${id}`, applicationPosts.get(path)!] as const),
  [`page_id=${LEGACY_CONTACT_PAGE_ID}`, '/contato'],
]);
const wordpressPages = new Set<string>(LEGACY_WORDPRESS_PAGES);

const wordpressServices = [
  '/wp-admin',
  '/wp-json',
  '/wp-content',
  '/wp-includes',
  '/wp-login.php',
  '/wp-comments-post.php',
  '/wp-cron.php',
  '/xmlrpc.php',
];
const wordpressArchives = ['/category', '/tag', '/author', '/search', '/feed', '/comments/feed'];
const wordpressQueryFlags = [
  'rest_route',
  'feed',
  's',
  'paged',
  'preview',
  'preview_id',
  'preview_nonce',
];

function belongsTo(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export interface LegacyWordPressRedirect {
  readonly status: 301 | 308;
  readonly location: string;
}

/**
 * Preserva os endereços anteriores à troca do domínio, sem consultar a API por requisição.
 * O destino externo é fixo: caminhos e parâmetros nunca escolhem outro servidor.
 */
export function resolveLegacyWordPressRedirect(
  method: string,
  target: string,
): LegacyWordPressRedirect | null {
  if (
    !target.startsWith('/') ||
    target.startsWith('//') ||
    /[\\\u0000-\u001f\u007f]/u.test(target)
  ) {
    return null;
  }

  const queryIndex = target.indexOf('?');
  const pathname = queryIndex < 0 ? target : target.slice(0, queryIndex);
  const search = queryIndex < 0 ? '' : target.slice(queryIndex);
  const path = pathname.replace(/\/+$/u, '') || '/';
  const toWordPress = (status: 301 | 308): LegacyWordPressRedirect => ({
    status,
    location: `${WORDPRESS_ORIGIN}${target}`,
  });

  // 308 preserva método e corpo de formulários e clientes antigos da API WordPress.
  if (wordpressServices.some((prefix) => belongsTo(path, prefix))) {
    return toWordPress(308);
  }

  if (method !== 'GET' && method !== 'HEAD') {
    return null;
  }

  const parameters = new URLSearchParams(search);
  const hasWordPressQuery = wordpressQueryFlags.some((name) => parameters.has(name));
  const applicationPost = applicationPosts.get(path);

  if (applicationPost) {
    return hasWordPressQuery
      ? toWordPress(301)
      : { status: 301, location: `${applicationPost}${search}` };
  }

  if (path === '/') {
    if (hasWordPressQuery) {
      return toWordPress(301);
    }

    const idParameter = parameters.has('p') ? 'p' : 'page_id';
    const id = parameters.get(idParameter);
    if (id !== null) {
      const destination = applicationShortlinks.get(`${idParameter}=${id}`);
      if (!destination) {
        return toWordPress(301);
      }

      parameters.delete(idParameter);
      const remainingSearch = parameters.toString();
      return {
        status: 301,
        location: `${destination}${remainingSearch ? `?${remainingSearch}` : ''}`,
      };
    }

    return null;
  }

  if (
    wordpressPages.has(path) ||
    wordpressArchives.some((prefix) => belongsTo(path, prefix)) ||
    /^\/\d{4}(?:\/(?:0[1-9]|1[0-2])(?:\/.*)?)?$/u.test(path) ||
    /^\/page\/[1-9]\d*$/u.test(path) ||
    /^\/(?:sitemap_index|(?:post|page|category|post_tag|author)-sitemap\d*)\.xml$/u.test(path)
  ) {
    return toWordPress(301);
  }

  return null;
}

export const legacyWordPressRedirect: RequestHandler = (request, response, next) => {
  const redirect = resolveLegacyWordPressRedirect(request.method, request.originalUrl);
  if (redirect) {
    response.redirect(redirect.status, redirect.location);
    return;
  }
  next();
};
