import { describe, expect, it } from 'vitest';

import { getStaticCacheControl, HTML_CACHE_CONTROL } from './cache-policy';

describe('server cache policy', () => {
  it.each([
    '/browser/main-TVLXBZIB.js',
    '/browser/chunk-B0u0S9A3.js',
    '/browser/polyfills-X2AR5D33.js',
    String.raw`C:\sanaka\browser\styles-GGEDIL6N.css`,
  ])('keeps a versioned Angular bundle immutable (%s)', (filePath) => {
    expect(getStaticCacheControl(filePath)).toBe('public, max-age=31536000, immutable');
  });

  it.each([
    '/browser/images/maya/maya-sanaka.png',
    '/browser/i18n/pt-BR.json',
    '/browser/favicon.ico',
    '/browser/main.js',
    '/browser/index.html',
  ])('revalidates a public resource with a stable name (%s)', (filePath) => {
    expect(getStaticCacheControl(filePath)).toBe('public, max-age=0, must-revalidate');
  });

  it('requires HTML revalidation between deployments', () => {
    expect(HTML_CACHE_CONTROL).toBe('public, max-age=0, must-revalidate');
  });
});
