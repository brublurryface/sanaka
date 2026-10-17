const REVALIDATED_RESOURCE_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
const VERSIONED_BUNDLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const VERSIONED_BROWSER_BUNDLE =
  /(?:^|[\\/])(?:chunk|main|polyfills|styles)-[A-Za-z0-9_-]+\.(?:css|js)$/;

/**
 * Bundles com hash podem durar um ano: a URL muda junto com o conteúdo.
 * Artes e traduções conservam o nome e precisam ser revalidadas a cada nova visita.
 */
export function getStaticCacheControl(filePath: string): string {
  return VERSIONED_BROWSER_BUNDLE.test(filePath)
    ? VERSIONED_BUNDLE_CACHE_CONTROL
    : REVALIDATED_RESOURCE_CACHE_CONTROL;
}

export const HTML_CACHE_CONTROL = REVALIDATED_RESOURCE_CACHE_CONTROL;
