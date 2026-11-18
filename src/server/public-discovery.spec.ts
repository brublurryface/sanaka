import express from 'express';
import { once } from 'node:events';
import { request, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { rejectAmbiguousRequestTarget } from './request-target';
import { createRobotsResponse } from './robots';

let server: Server;
let port: number;

beforeAll(async () => {
  const app = express();
  app.use(rejectAmbiguousRequestTarget);
  app.get('/robots.txt', createRobotsResponse(false));
  app.get('/preview/robots.txt', createRobotsResponse(true));
  app.get('/posts', (_request, response) => response.status(200).end());
  app.use((_request, response) => response.status(404).end());

  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function get(path: string, method = 'GET') {
  return new Promise<{
    status: number | undefined;
    headers: IncomingHttpHeaders;
    body: string;
  }>((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method }, (response) => {
      response.setEncoding('utf8');
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.once('error', reject);
      response.once('end', () =>
        resolve({ status: response.statusCode, headers: response.headers, body }),
      );
    });
    req.once('error', reject);
    req.end();
  });
}

describe('request targets and crawler discovery', () => {
  it.each(['GET', 'HEAD', 'POST'])(
    'returns a non-cacheable 400 for %s with a double leading slash',
    async (method) => {
      const { status, headers, body } = await get('//arquivo-inexistente.xml', method);
      expect(status).toBe(400);
      expect(headers['cache-control']).toBe('no-store');
      expect(headers.location).toBeUndefined();
      expect(body).toBe(method === 'HEAD' ? '' : 'Endereço inválido.\n');
    },
  );

  it('preserves an ordinary path whose query contains double slashes', async () => {
    expect((await get('/posts?ref=//arquivo-inexistente.xml')).status).toBe(200);
    expect((await get('/arquivo-inexistente.xml')).status).toBe(404);
  });

  it('announces the public sitemap as plain text and answers a HEAD without a body', async () => {
    const { status, headers, body } = await get('/robots.txt');
    const head = await get('/robots.txt', 'HEAD');

    expect(status).toBe(200);
    expect(headers['content-type']).toMatch(/^text\/plain;.*charset=utf-8$/i);
    expect(body).toBe('User-agent: *\nDisallow:\n\nSitemap: https://sanaka.com.br/sitemap.xml\n');
    expect(head.status).toBe(200);
    expect(head.headers['content-length']).toBe(String(Buffer.byteLength(body)));
    expect(head.body).toBe('');
  });

  it('omits the sitemap in an environment whose documents have a noindex header', async () => {
    const { status, headers, body } = await get('/preview/robots.txt');
    expect(status).toBe(200);
    expect(headers['cache-control']).toBe('no-store');
    expect(body).toBe('User-agent: *\nDisallow:\n');
  });
});
