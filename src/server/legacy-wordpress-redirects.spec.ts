import express from 'express';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  legacyWordPressRedirect,
  resolveLegacyWordPressRedirect,
} from './legacy-wordpress-redirects';

describe('legacy WordPress addresses', () => {
  it.each([
    ['/2026/10/akasha/', '/posts/akasha'],
    ['/2026/10/vii-aplicacao', '/posts/vii-aplicacao'],
    [
      '/2022/09/medo-de-barata/?utm_source=boletim&ref=a%20b',
      '/posts/medo-de-barata?utm_source=boletim&ref=a%20b',
    ],
    ['/?p=6835&utm_source=boletim', '/posts/akasha?utm_source=boletim'],
    ['/?p=6662', '/posts/medo-de-barata'],
    ['/?page_id=2500', '/contato'],
  ])('moves a Sanaka address (%s) to its Angular destination', (source, destination) => {
    expect(resolveLegacyWordPressRedirect('GET', source)).toEqual({
      status: 301,
      location: destination,
    });
  });

  it.each([
    '/2019/04/oh-no-no-lo-ves/',
    '/2026/10/another-wordpress-post/',
    '/perguntas/?from=menu',
    '/compendio-garou/',
    '/category/romance/',
    '/tag/garou/',
    '/author/sanaka/',
    '/feed/',
    '/comments/feed/',
    '/search/garou/',
    '/page/2/',
    '/2026/',
    '/2026/10/',
    '/sitemap_index.xml',
    '/post-sitemap2.xml',
    '/?p=6120',
    '/?page_id=6614',
    '/?page_id=6835',
    '/?p=2500',
    '/?rest_route=%2Fwp%2Fv2%2Fposts',
    '/?s=garou',
    '/?p=6835&preview=true',
    '/2026/10/akasha/?feed=rss2',
  ])('preserves WordPress content and editorial URLs (%s)', (source) => {
    expect(resolveLegacyWordPressRedirect('GET', source)).toEqual({
      status: 301,
      location: `https://cms.sanaka.com.br${source}`,
    });
  });

  it.each([
    ['GET', '/wp-content/uploads/2026/10/akasha_obolo_front.webp?version=2'],
    ['HEAD', '/wp-includes/js/jquery/jquery.min.js'],
    ['GET', '/wp-admin/'],
    ['POST', '/wp-login.php'],
    ['POST', '/wp-comments-post.php'],
    ['POST', '/wp-json/sanaka/v1/obolos/nandini'],
    ['PUT', '/wp-json/wp/v2/posts/6835'],
    ['GET', '/wp-cron.php?doing_wp_cron=123'],
    ['POST', '/xmlrpc.php'],
  ])('preserves methods on WordPress services (%s %s)', (method, source) => {
    expect(resolveLegacyWordPressRedirect(method, source)).toEqual({
      status: 308,
      location: `https://cms.sanaka.com.br${source}`,
    });
  });

  it.each([
    '/',
    '/?utm_source=boletim',
    '/contato',
    '/contato/',
    '/posts/akasha',
    '/matrix',
    '/api/health',
    '/images/samvit/samvit-sanaka.png',
    '/wp-json-lookalike',
    '/wp-admin.example',
    '/2026/13/not-a-month',
    '/rota-inexistente',
    '//attacker.example/wp-json',
    'https://attacker.example/wp-json',
    '/wp-admin\\attacker',
    '/wp-json/\r\nLocation: https://attacker.example',
  ])('leaves native or invalid request targets to the application (%s)', (source) => {
    expect(resolveLegacyWordPressRedirect('GET', source)).toBeNull();
  });

  it.each(['/api/contact', '/api/newsletter', '/2026/10/akasha/', '/?p=6835'])(
    'does not move non-WordPress submissions (%s)',
    (source) => {
      expect(resolveLegacyWordPressRedirect('POST', source)).toBeNull();
    },
  );
});

describe('legacy WordPress HTTP redirects', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(legacyWordPressRedirect);
    app.post('/api/contact', (_request, response) => response.json({ application: true }));
    app.use((_request, response) => response.status(404).json({ fallback: true }));
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it('returns a permanent relative destination for a published Sanaka post', async () => {
    const response = await fetch(`${baseUrl}/2026/10/akasha/?utm_source=old-link`, {
      redirect: 'manual',
    });

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('/posts/akasha?utm_source=old-link');
  });

  it('uses a method-preserving response for old WordPress API clients', async () => {
    const response = await fetch(`${baseUrl}/wp-json/sanaka/v1/obolos/nandini`, {
      method: 'POST',
      body: '{}',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'manual',
    });

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'https://cms.sanaka.com.br/wp-json/sanaka/v1/obolos/nandini',
    );
  });

  it('keeps HEAD semantics on old media addresses', async () => {
    const response = await fetch(`${baseUrl}/wp-content/uploads/example.webp`, {
      method: 'HEAD',
      redirect: 'manual',
    });

    expect(response.status).toBe(308);
    expect(await response.text()).toBe('');
  });

  it('keeps contact submissions and unknown-route status codes in the application', async () => {
    const contact = await fetch(`${baseUrl}/api/contact`, { method: 'POST', redirect: 'manual' });
    const unknown = await fetch(`${baseUrl}/rota-inexistente`, { redirect: 'manual' });

    expect(contact.status).toBe(200);
    expect(await contact.json()).toEqual({ application: true });
    expect(unknown.status).toBe(404);
    expect(unknown.headers.get('location')).toBeNull();
  });
});
