import express, { type RequestHandler } from 'express';
import { once } from 'node:events';
import { createServer, type AddressInfo, type Socket } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createContactHandler } from './contact';
import { createContactRouter } from './contact-router';

const payload = {
  name: 'Reader',
  email: 'reader@example.test',
  subject: '',
  message: 'Private test text',
  website: '',
};
const cleanups: (() => Promise<void>)[] = [];

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  vi.restoreAllMocks();
});

async function serve(handler?: RequestHandler) {
  const app = express();
  app.use('/api', (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/contact', createContactRouter(handler));
  app.use(
    (
      _error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      response.status(500).json({ fallback: true });
    },
  );
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  cleanups.push(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/contact`;
  return (body: unknown = payload, contentType = 'application/json') =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
}

async function smtp(mode: 'success' | 'silent' | 'idle' | 'active' | 'reject' | 'disconnect') {
  const sockets = new Set<Socket>();
  const stats = { connections: 0, messages: 0, beats: 0 };
  const server = createServer((socket) => {
    stats.connections++;
    sockets.add(socket);
    socket.setEncoding('utf8');
    let buffer = '';
    let data = false;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    socket.on('error', () => {});
    socket.on('close', () => {
      sockets.delete(socket);
      clearInterval(heartbeat);
    });
    if (mode === 'silent') return;
    socket.write('220 local.test ESMTP\r\n');
    socket.on('data', (chunk) => {
      buffer += chunk;
      while (buffer.includes('\r\n')) {
        if (data) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end === -1) return;
          buffer = buffer.slice(end + 5);
          data = false;
          stats.messages++;
          if (mode === 'success') socket.write('250 queued\r\n');
          else if (mode === 'disconnect') socket.destroy();
          else if (mode === 'active') {
            heartbeat = setInterval(() => {
              stats.beats++;
              socket.write('250-still processing\r\n');
            }, 15);
            heartbeat.unref();
          }
          continue;
        }
        const end = buffer.indexOf('\r\n');
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (line.startsWith('EHLO')) socket.write('250-local.test\r\n250 AUTH PLAIN\r\n');
        else if (line.startsWith('AUTH'))
          socket.write(
            mode === 'reject' ? '535 credentials rejected\r\n' : '235 authenticated\r\n',
          );
        else if (line.startsWith('MAIL') || line.startsWith('RCPT')) socket.write('250 ok\r\n');
        else if (line === 'DATA') {
          data = true;
          socket.write('354 send data\r\n');
        } else if (line === 'QUIT') socket.end('221 bye\r\n');
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  cleanups.push(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  return {
    stats,
    activeConnections: () => sockets.size,
    environment: {
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String((server.address() as AddressInfo).port),
      SMTP_SECURE: 'false',
      SMTP_USER: 'sender@example.test',
      SMTP_PASS: 'fake-test-secret',
      CONTACT_FROM_EMAIL: 'sender@example.test',
      CONTACT_TO_EMAIL: 'recipient@example.test',
    },
  };
}

describe('contact HTTP composition', () => {
  it.each([
    {
      name: 'malformed JSON',
      body: '{"email":"private@example.test"',
      contentType: 'application/json',
      status: 400,
    },
    {
      name: 'excessive JSON',
      body: { ...payload, message: 'x'.repeat(17_000) },
      contentType: 'application/json',
      status: 413,
    },
    {
      name: 'unsupported charset',
      body: payload,
      contentType: 'application/json; charset=invalid',
      status: 415,
    },
  ])(
    'returns bounded JSON for $name before attempting SMTP',
    async ({ body, contentType, status }) => {
      const handler = vi.fn<RequestHandler>();
      const post = await serve(handler);
      const response = await post(body, contentType);
      expect(response.status).toBe(status);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(await response.json()).toEqual({ delivered: false });
      expect(handler).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    },
  );

  it.each([
    {},
    [],
    { ...payload, name: 5 },
    { ...payload, name: ' ' },
    { ...payload, email: 'invalid' },
    { ...payload, message: '' },
    { ...payload, message: false },
    { ...payload, subject: 7 },
    { ...payload, website: 7 },
    { ...payload, website: 'x'.repeat(255) },
  ])('rejects an invalid payload without delivery (%j)', async (body) => {
    const fixture = await smtp('success');
    const post = await serve(createContactHandler({ environment: fixture.environment }));
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ delivered: false });
    expect(fixture.stats.connections).toBe(0);
  });

  it('keeps the default router usable without credentials for non-JSON requests', async () => {
    const post = await serve();
    expect((await post(payload, 'text/plain')).status).toBe(415);
  });

  it('forwards unexpected handler errors to the application error chain', async () => {
    const post = await serve((_request, _response, next) => next(new Error('private detail')));
    const response = await post();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ fallback: true });
  });

  it('reports missing SMTP configuration without exposing names, values or message content', async () => {
    const post = await serve(createContactHandler({ environment: {} }));
    const response = await post();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ delivered: false });
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('"provider":"smtp"'),
    );
  });
});

describe('contact deadlines with an isolated real SMTP socket', () => {
  it('waits for SMTP acceptance and sends each submitted message once', async () => {
    const fixture = await smtp('success');
    const post = await serve(
      createContactHandler({ environment: fixture.environment, sendTimeoutMs: 1_500 }),
    );
    const response = await post();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ delivered: true });
    expect(fixture.stats).toMatchObject({ connections: 1, messages: 1 });
    await expect.poll(fixture.activeConnections).toBe(0);
  });

  it.each([
    { name: 'connection budget', connectionTimeout: 80, greetingTimeout: 1_000 },
    { name: 'greeting budget', connectionTimeout: 1_000, greetingTimeout: 80 },
  ])(
    'closes an unresponsive greeting at the $name',
    async ({ connectionTimeout, greetingTimeout }) => {
      const fixture = await smtp('silent');
      const post = await serve(
        createContactHandler({
          environment: fixture.environment,
          sendTimeoutMs: 1_500,
          smtpTimeouts: { connectionTimeout, greetingTimeout, socketTimeout: 1_000 },
        }),
      );
      const response = await post();
      expect(response.status).toBe(504);
      expect(await response.json()).toEqual({ delivered: false, reason: 'unconfirmed' });
      expect(fixture.stats).toMatchObject({ connections: 1, messages: 0 });
      await expect.poll(fixture.activeConnections).toBe(0);
    },
  );

  it('closes a stalled final SMTP reply at the inactivity timeout', async () => {
    const fixture = await smtp('idle');
    const post = await serve(
      createContactHandler({
        environment: fixture.environment,
        sendTimeoutMs: 1_500,
        smtpTimeouts: { connectionTimeout: 1_000, greetingTimeout: 1_000, socketTimeout: 80 },
      }),
    );
    const response = await post();
    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ delivered: false, reason: 'unconfirmed' });
    expect(fixture.stats).toMatchObject({ connections: 1, messages: 1 });
    await expect.poll(fixture.activeConnections).toBe(0);
  });

  it('cancels the actual send at the total deadline even while SMTP traffic continues', async () => {
    const fixture = await smtp('active');
    const post = await serve(
      createContactHandler({
        environment: fixture.environment,
        sendTimeoutMs: 180,
        smtpTimeouts: { connectionTimeout: 1_000, greetingTimeout: 1_000, socketTimeout: 5_000 },
      }),
    );
    const response = await post();
    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ delivered: false, reason: 'unconfirmed' });
    expect(fixture.stats.beats).toBeGreaterThan(1);
    expect(fixture.stats).toMatchObject({ connections: 1, messages: 1 });
    await expect.poll(fixture.activeConnections).toBe(0);
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('"provider":"smtp"'),
    );
  });

  it('does not declare non-delivery when SMTP disconnects after receiving the message', async () => {
    const fixture = await smtp('disconnect');
    const post = await serve(
      createContactHandler({ environment: fixture.environment, sendTimeoutMs: 1_500 }),
    );
    const response = await post();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ delivered: false, reason: 'unconfirmed' });
    expect(fixture.stats).toMatchObject({ connections: 1, messages: 1 });
  });

  it('returns controlled unavailability when the SMTP port refuses connections', async () => {
    const closed = createServer();
    closed.listen(0, '127.0.0.1');
    await once(closed, 'listening');
    const port = (closed.address() as AddressInfo).port;
    await new Promise<void>((resolve) => closed.close(() => resolve()));
    const post = await serve(
      createContactHandler({
        environment: {
          SMTP_HOST: '127.0.0.1',
          SMTP_PORT: String(port),
          SMTP_SECURE: 'false',
          SMTP_USER: 'fake',
          SMTP_PASS: 'fake',
          CONTACT_FROM_EMAIL: 'sender@example.test',
        },
        sendTimeoutMs: 1_000,
      }),
    );
    const response = await post();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ delivered: false, reason: 'unconfirmed' });
  });

  it('keeps explicit authentication rejection distinct from an uncertain delivery', async () => {
    const fixture = await smtp('reject');
    const post = await serve(
      createContactHandler({ environment: fixture.environment, sendTimeoutMs: 1_500 }),
    );
    const response = await post();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ delivered: false });
    expect(fixture.stats).toMatchObject({ connections: 1, messages: 0 });
  });
});
