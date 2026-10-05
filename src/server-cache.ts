const REVALIDATED_RESOURCE_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
const VERSIONED_BUNDLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

const VERSIONED_BROWSER_BUNDLE =
  /(?:^|[\\/])(?:chunk|main|polyfills|styles)-[A-Za-z0-9_-]+\.(?:css|js)$/;

/**
 * Define o cache de cada arquivo público sem tornar artes e traduções obsoletas no navegador.
 *
 * Bundles gerados pelo Angular recebem um novo hash quando seu conteúdo muda e, por isso, podem
 * ser imutáveis. Arquivos copiados de `public/` mantêm nomes estáveis e precisam ser revalidados.
 */
export function getStaticCacheControl(filePath: string): string {
  return VERSIONED_BROWSER_BUNDLE.test(filePath)
    ? VERSIONED_BUNDLE_CACHE_CONTROL
    : REVALIDATED_RESOURCE_CACHE_CONTROL;
}

export const HTML_CACHE_CONTROL = REVALIDATED_RESOURCE_CACHE_CONTROL;
