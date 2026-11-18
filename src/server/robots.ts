import type { RequestHandler } from 'express';

import { getStaticCacheControl } from './cache-policy';

const CRAWL_RULES = 'User-agent: *\nDisallow:\n';
const SITEMAP = '\nSitemap: https://sanaka.com.br/sitemap.xml\n';

export function createRobotsResponse(noIndex: boolean): RequestHandler {
  // Na prévia, o crawler precisa conseguir ler o X-Robots-Tag dos documentos.
  const body = noIndex ? CRAWL_RULES : CRAWL_RULES + SITEMAP;

  return (_request, response) => {
    response
      .set('Cache-Control', noIndex ? 'no-store' : getStaticCacheControl('robots.txt'))
      .type('text/plain')
      .send(body);
  };
}
