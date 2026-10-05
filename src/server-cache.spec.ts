import { describe, expect, it } from 'vitest';

import { getStaticCacheControl, HTML_CACHE_CONTROL } from './server-cache';

describe('server cache policy', () => {
  it.each([
    '/browser/main-TVLXBZIB.js',
    '/browser/chunk-B0u0S9A3.js',
    String.raw`C:\sanaka\browser\styles-GGEDIL6N.css`,
  ])('keeps the versioned Angular bundle immutable: %s', (filePath) => {
    expect(getStaticCacheControl(filePath)).toBe('public, max-age=31536000, immutable');
  });

  it.each([
    '/browser/images/maya/maya-sanaka.png',
    '/browser/i18n/pt-BR.json',
    '/browser/favicon.ico',
  ])('requires revalidation for a stable public filename: %s', (filePath) => {
    expect(getStaticCacheControl(filePath)).toBe('public, max-age=0, must-revalidate');
  });

  it('uses the revalidation policy for rendered HTML', () => {
    expect(HTML_CACHE_CONTROL).toBe('public, max-age=0, must-revalidate');
  });
});
