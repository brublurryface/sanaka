import type { ActivatedRouteSnapshot } from '@angular/router';

import { SANAKA_ORIGIN } from '../navigation/sanaka-seo.service';

export interface AnalyticsView {
  readonly location: string;
  readonly article: boolean;
}

/** Projeta a rota e o slug público do artigo para limitar os dados enviados à análise. */
export function analyticsView(root: ActivatedRouteSnapshot): AnalyticsView | null {
  let route = root;
  while (route.firstChild) route = route.firstChild;
  if (!route.routeConfig || route.data['indexable'] === false) return null;

  const path =
    '/' +
    route.pathFromRoot
      .map((item) => item.routeConfig?.path)
      .filter(Boolean)
      .join('/');
  if (path === '/posts/:slug') {
    const slug = route.paramMap.get('slug');
    return slug && /^[\p{L}\p{N}\p{M}][\p{L}\p{N}\p{M}_-]{0,199}$/u.test(slug)
      ? { location: `${SANAKA_ORIGIN}/posts/${encodeURIComponent(slug)}`, article: true }
      : null;
  }

  if (path === '/posts/paged' || path === '/posts/paged/:page') {
    return { location: `${SANAKA_ORIGIN}/posts`, article: false };
  }

  return typeof route.data['titleKey'] === 'string' && /^\/[a-z0-9/-]*$/u.test(path)
    ? { location: SANAKA_ORIGIN + path, article: false }
    : null;
}

export function referrerOrigin(referrer: string): string {
  try {
    const url = new URL(referrer);
    return url.protocol === 'https:' || url.protocol === 'http:' ? `${url.origin}/` : '';
  } catch {
    return '';
  }
}
