import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { securityResponseHeaders } from './security-headers';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

describe('security response headers over HTTP', () => {
  it('keeps contracts for documents, resources, APIs, redirects and errors', async () => {
    const app = express();
    app.use(securityResponseHeaders);
    app.get('/document', (_request, response) => response.type('html').send('<p>Sanaka</p>'));
    app.get('/asset.js', (_request, response) => response.type('js').send('void 0;'));
    app.get('/api/health', (_request, response) => {
      response.setHeader('Cache-Control', 'no-store');
      response.json({ status: 'ok' });
    });
    app.get('/legacy', (_request, response) => response.redirect(301, '/document'));
    app.get('/failure', (_request, response) => response.status(503).json({ available: false }));
    app.use((_request, response) => response.status(404).type('html').send('<p>Missing</p>'));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    cleanups.push(async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    });
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    for (const [path, status, contentType] of [
      ['/document', 200, 'text/html'],
      ['/asset.js', 200, 'text/javascript'],
      ['/api/health', 200, 'application/json'],
      ['/legacy', 301, 'text/plain'],
      ['/failure', 503, 'application/json'],
      ['/missing', 404, 'text/html'],
    ] as const) {
      for (const method of ['GET', 'HEAD']) {
        const response = await fetch(origin + path, { method, redirect: 'manual' });
        expect(response.status).toBe(status);
        expect(response.headers.get('Content-Type')).toContain(contentType);
        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
        expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
        expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
        expect(response.headers.get('Content-Security-Policy')).toBe("frame-ancestors 'self'");
        const observation = response.headers.get('Content-Security-Policy-Report-Only');
        expect(observation).toContain("script-src 'self'");
        expect(observation).toContain("style-src 'self' 'unsafe-inline'");
        expect(observation).toContain('report-to csp');
        expect(observation).toContain('report-uri /api/security/csp-reports');
        expect(observation).not.toMatch(/unsafe-eval|script-src[^;]*unsafe-inline|\*/u);
        expect(response.headers.get('Reporting-Endpoints')).toBe('csp="/api/security/csp-reports"');
        expect(response.headers.get('Strict-Transport-Security')).toBeNull();
        if (method === 'HEAD') expect(await response.text()).toBe('');
        if (path === '/legacy') expect(response.headers.get('Location')).toBe('/document');
        if (path === '/api/health') {
          expect(response.headers.get('Cache-Control')).toBe('no-store');
          if (method === 'GET') expect(await response.json()).toEqual({ status: 'ok' });
        }
      }
    }
  });
});
