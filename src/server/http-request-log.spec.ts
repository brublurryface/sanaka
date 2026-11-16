import express, { type Request, type Response } from 'express';
import { EventEmitter, once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { get, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createHttpRequestLog } from './http-request-log';

const REVISION = 'a'.repeat(40);
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/iu;

function observe({
  target = '/posts/ausente',
  method = 'GET',
  revision = REVISION,
  headers = {} as Request['headers'],
  write = vi.fn<(line: string) => void>(),
} = {}) {
  const response = Object.assign(new EventEmitter(), {
    statusCode: 200,
    getHeader: vi.fn().mockReturnValue('text/html; charset=utf-8'),
  });
  const request = {
    originalUrl: target,
    method,
    headers,
    body: { email: 'private@example.com', token: 'private-token', message: 'private-message' },
    ip: '192.0.2.10',
  } as unknown as Request;
  const next = vi.fn();
  createHttpRequestLog({ revision, write })(request, response as unknown as Response, next);
  return { response, write, next, record: () => JSON.parse(write.mock.calls[0][0]) };
}

describe('completed HTTP error records', () => {
  it('waits for the final status and records exactly once across finish and close', () => {
    const log = observe();
    log.response.statusCode = 404;
    expect(log.write).not.toHaveBeenCalled();
    expect(log.next).toHaveBeenCalledOnce();
    log.response.emit('finish');
    log.response.emit('finish');
    log.response.emit('close');
    expect(log.write).toHaveBeenCalledOnce();
    expect(log.record()).toEqual({
      event: 'http_response_error',
      level: 'warning',
      timestamp: expect.any(String),
      method: 'GET',
      path: '/posts/ausente',
      status: 404,
      resource_type: 'document',
      duration_ms: expect.any(Number),
      request_id: expect.stringMatching(UUID),
      revision: REVISION,
    });
    expect(new Date(log.record().timestamp).toISOString()).toBe(log.record().timestamp);
    expect(log.record().duration_ms).toBeGreaterThanOrEqual(0);
    expect(log.response.listenerCount('finish')).toBe(0);
    expect(log.response.listenerCount('close')).toBe(0);
  });

  it.each([200, 201, 204, 301, 302, 304, 307, 308, 400, 401, 403, 429])(
    'leaves status %i out of the 404/5xx stream',
    (status) => {
      const log = observe();
      log.response.statusCode = status;
      log.response.emit('finish');
      expect(log.write).not.toHaveBeenCalled();
    },
  );

  it.each([500, 502, 503, 504, 599])('records final server failure %i', (status) => {
    const log = observe({ target: '/api/missing' });
    log.response.statusCode = status;
    log.response.emit('finish');
    expect(log.record()).toMatchObject({ status, level: 'error', resource_type: 'api' });
  });

  it('does not count an interrupted stream as a completed 503', () => {
    const log = observe();
    log.response.statusCode = 503;
    log.response.emit('close');
    log.response.emit('finish');
    expect(log.write).not.toHaveBeenCalled();
    expect(log.response.listenerCount('finish')).toBe(0);
    expect(log.response.listenerCount('close')).toBe(0);
  });

  it('excludes query strings, headers, addresses, bodies and confirmation tokens', () => {
    const log = observe({
      target:
        '/api/newsletter/confirm?email=private@example.com&token=private-token#private-fragment',
      headers: {
        cookie: 'private-cookie',
        authorization: 'Bearer private-authorization',
        'x-forwarded-for': '192.0.2.11',
        'user-agent': 'private-agent',
        referer: 'https://private.example/',
        'x-request-id': 'private-request-id',
      },
    });
    log.response.statusCode = 503;
    log.response.emit('finish');
    expect(log.record().path).toBe('/api/newsletter/confirm');
    expect(log.write.mock.calls[0][0]).not.toMatch(/private|192\.0\.2/iu);
  });

  it.each([
    ['/posts/Saṃvit%2FII?ref=private', '/posts/Saṃvit%2FII'],
    ['/email/private@example.com', '/email/[redacted]'],
    ['/private%40example.com', '/[redacted]'],
    ['/private%2540example.com', '/[redacted]'],
    ['/token/private-value', '/token/[redacted]'],
    ['/confirm/private-value', '/confirm/[redacted]'],
    ['/route%3Ftoken%3Dprivate', '/[redacted]'],
    ['/bad%zz', '/[invalid-encoding]'],
    ['/line\r\nforged\u2028record', '/line__forged_record'],
    ['https://private.example/path', '[invalid-target]'],
    ['//private.example/path', '[invalid-target]'],
  ])('limits request-target exposure for %j', (target, path) => {
    const log = observe({ target });
    log.response.statusCode = 404;
    log.response.emit('finish');
    expect(log.record().path).toBe(path);
    expect(log.write.mock.calls[0][0]).not.toMatch(/[\r\n\u2028\u2029]/u);
  });

  it('bounds unusually long paths without dropping their request count', () => {
    const log = observe({ target: `/images/${'a'.repeat(1_000)}.png?token=private` });
    log.response.statusCode = 404;
    log.response.emit('finish');
    expect(log.record().path).toHaveLength(256);
    expect(log.record().path).toMatch(/…$/u);
    expect(log.record().resource_type).toBe('asset');
    expect(log.write).toHaveBeenCalledOnce();
  });

  it.each(['8ebfa3c3-8929-4885', '12345678-abcd-1234-abcd-123456789abc'])(
    'correlates a validated Render request ID %s',
    (id) => {
      const log = observe({ headers: { 'rndr-id': id } });
      log.response.statusCode = 404;
      log.response.emit('finish');
      expect(log.record().request_id).toBe(id);
    },
  );

  it.each(['private@example.com', 'a'.repeat(1_000), '12345678\nforged', ['12345678-abcd-1234']])(
    'replaces an invalid or repeated Render ID instead of logging it',
    (id) => {
      const log = observe({ headers: { 'rndr-id': id } });
      log.response.statusCode = 404;
      log.response.emit('finish');
      expect(log.record().request_id).toMatch(UUID);
      expect(log.record().request_id).not.toEqual(id);
    },
  );

  it.each(['', 'private@example.com', 'a'.repeat(65)])(
    'rejects an unsafe revision value',
    (revision) => {
      const log = observe({ revision });
      log.response.statusCode = 404;
      log.response.emit('finish');
      expect(log.record().revision).toBe('unknown');
    },
  );

  it('uses the runtime commit and safe defaults without modifying response headers', () => {
    const write = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubEnv('RENDER_GIT_COMMIT', REVISION);
    try {
      const response = Object.assign(new EventEmitter(), {
        statusCode: 404,
        getHeader: () => undefined,
      });
      createHttpRequestLog()(
        { originalUrl: '/untyped', method: 'UNRECOGNIZED', headers: {} } as Request,
        response as unknown as Response,
        vi.fn(),
      );
      response.emit('finish');
      expect(JSON.parse(write.mock.calls[0][0])).toMatchObject({
        revision: REVISION,
        method: 'OTHER',
        resource_type: 'other',
      });
    } finally {
      write.mockRestore();
      vi.unstubAllEnvs();
    }
  });

  it('contains a log destination failure after the response has completed', () => {
    const log = observe({
      write: vi.fn(() => {
        throw new Error('test sink unavailable');
      }),
    });
    log.response.statusCode = 404;
    expect(() => log.response.emit('finish')).not.toThrow();
    expect(log.response.listenerCount('close')).toBe(0);
  });
});

describe('HTTP request logging through a real Express server', () => {
  const write = vi.fn<(line: string) => void>();
  let server: Server;
  let baseUrl: string;
  let folder: string;
  let connectionClosed: Promise<unknown>;

  beforeAll(async () => {
    folder = await mkdtemp(join(tmpdir(), 'sanaka-http-log-'));
    await writeFile(join(folder, 'present.txt'), 'present');
    const app = express();
    app.use(createHttpRequestLog({ write, revision: REVISION }));
    app.get('/redirect', (_request, response) => response.redirect(301, '/'));
    app.get('/handler-failure', () => {
      throw new Error('private-handler-detail');
    });
    app.get('/abort', (_request, response) => {
      connectionClosed = once(response, 'close');
      response.status(503).write('incomplete response');
    });
    app.use('/assets', express.static(folder));
    const api = express.Router();
    api.use((_request, response) => response.status(404).json({ missing: true }));
    app.use('/api', api);
    app.use((_request, response) => response.status(404).type('html').send('<h1>Missing</h1>'));
    app.use((_error: Error, _request: Request, response: Response, _next: express.NextFunction) => {
      response.status(503).json({ unavailable: true });
    });
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(folder, { recursive: true, force: true });
  });

  it('retains final renderer-shaped HTML, missing assets and handler failures as distinct records', async () => {
    for (const [path, status] of [
      ['/missing-article', 404],
      ['/assets/missing.js', 404],
      ['/handler-failure', 503],
    ] as const) {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status).toBe(status);
      await response.text();
    }
    expect(write.mock.calls.map(([line]) => JSON.parse(line))).toEqual([
      expect.objectContaining({ path: '/missing-article', status: 404, resource_type: 'document' }),
      expect.objectContaining({ path: '/assets/missing.js', status: 404, resource_type: 'asset' }),
      expect.objectContaining({ path: '/handler-failure', status: 503, resource_type: 'other' }),
    ]);
    expect(write.mock.calls.flat().join('')).not.toContain('private-handler-detail');
  });

  it('retains the full original path through a mounted router', async () => {
    const response = await fetch(`${baseUrl}/api/missing?email=private@example.com`);
    await response.text();
    expect(write).toHaveBeenCalledOnce();
    expect(JSON.parse(write.mock.calls[0][0])).toMatchObject({
      path: '/api/missing',
      status: 404,
      resource_type: 'api',
    });
  });

  it('does not log a successful static file or a redirect as an error', async () => {
    expect((await fetch(`${baseUrl}/assets/present.txt`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/redirect`, { redirect: 'manual' })).status).toBe(301);
    expect(write).not.toHaveBeenCalled();
  });

  it('does not invent a delivered status when the client closes a streaming response', async () => {
    await new Promise<void>((resolve, reject) => {
      get(`${baseUrl}/abort`, (response) => {
        response.on('error', () => {});
        response.destroy();
        resolve();
      }).on('error', reject);
    });
    await connectionClosed;
    expect(write).not.toHaveBeenCalled();
  });
});
