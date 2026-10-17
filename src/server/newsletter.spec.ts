import express from 'express';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createNewsletterRouter } from './newsletter';

const validSignup = { email: 'reader@example.com', consent: true, website: '' };

describe('newsletter HTTP endpoints', () => {
  let server: Server;
  let endpoint: string;
  let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(async () => {
    // Valores fictícios: nenhuma chave real, conta, lista ou mensagem externa participa dos testes.
    vi.stubEnv('BREVO_API_KEY', 'fake-server-key');
    vi.stubEnv('BREVO_NEWSLETTER_LIST_ID', '23');
    vi.stubEnv('BREVO_NEWSLETTER_TEMPLATE_ID', '7');
    vi.stubEnv('BREVO_NEWSLETTER_REDIRECT_URL', 'https://sanaka.example/posts#newsletter');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response('{}', { status: 201 }));

    const app = express();
    app.use('/api/newsletter', createNewsletterRouter(fetcher));
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/newsletter`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function submit(body: unknown = validSignup): Promise<Response> {
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('reports availability without exposing configuration or contacting Brevo', async () => {
    const response = await fetch(`${endpoint}/status`);

    expect(await response.json()).toEqual({ available: true });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ['BREVO_API_KEY', ''],
    ['BREVO_NEWSLETTER_LIST_ID', ''],
    ['BREVO_NEWSLETTER_LIST_ID', '0'],
    ['BREVO_NEWSLETTER_LIST_ID', '2.5'],
    ['BREVO_NEWSLETTER_LIST_ID', '-1'],
    ['BREVO_NEWSLETTER_LIST_ID', '9007199254740992'],
    ['BREVO_NEWSLETTER_TEMPLATE_ID', 'wrong'],
    ['BREVO_NEWSLETTER_REDIRECT_URL', ''],
    ['BREVO_NEWSLETTER_REDIRECT_URL', 'not-a-url'],
    ['BREVO_NEWSLETTER_REDIRECT_URL', 'http://sanaka.example/posts'],
    ['BREVO_NEWSLETTER_REDIRECT_URL', 'javascript:alert(1)'],
    ['BREVO_NEWSLETTER_REDIRECT_URL', 'https://user:secret@sanaka.example/posts'],
  ])('disables only registration when %s is invalid (%s)', async (name, value) => {
    vi.stubEnv(name, value);

    const availability = await fetch(`${endpoint}/status`);
    const response = await submit();

    expect(await availability.json()).toEqual({ available: false });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ accepted: false });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(['http://localhost:4200/posts#newsletter', 'http://127.0.0.1:4200/posts#newsletter'])(
    'permits HTTP only for the local confirmation test (%s)',
    async (redirect) => {
      vi.stubEnv('BREVO_NEWSLETTER_REDIRECT_URL', redirect);
      const response = await submit();

      expect(response.status).toBe(202);
      expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string).redirectionUrl).toBe(redirect);
    },
  );

  it('uses the DOI endpoint and ignores any list, template, key or redirect supplied by a visitor', async () => {
    const response = await submit({
      ...validSignup,
      email: '  reader@example.com  ',
      apiKey: 'visitor-key',
      listId: 999,
      templateId: 999,
      redirectionUrl: 'https://untrusted.example/',
    });

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: true });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/contacts/doubleOptinConfirmation');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toMatchObject({ 'api-key': 'fake-server-key' });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(options?.body as string)).toEqual({
      email: 'reader@example.com',
      includeListIds: [23],
      templateId: 7,
      redirectionUrl: 'https://sanaka.example/posts#newsletter',
    });
  });

  it('accepts a request without the optional honeypot field', async () => {
    const response = await submit({ email: 'reader@example.com', consent: true });
    expect(response.status).toBe(202);
  });

  it.each([
    null,
    [],
    {},
    { ...validSignup, email: '' },
    { ...validSignup, email: 10 },
    { ...validSignup, email: 'not-an-email' },
    { ...validSignup, email: `${'a'.repeat(250)}@example.com` },
    { ...validSignup, consent: false },
    { ...validSignup, consent: 'true' },
    { ...validSignup, website: {} },
    { ...validSignup, website: 'a'.repeat(255) },
  ])('rejects invalid input without requesting any confirmation (%j)', async (body) => {
    const response = await submit(body);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ accepted: false });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not call Brevo when the honeypot is filled', async () => {
    const response = await submit({ ...validSignup, website: 'https://bot.example/' });

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: true });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects requests which are not JSON', async () => {
    const response = await fetch(endpoint, { method: 'POST', body: 'email=reader@example.com' });
    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({ accepted: false });
  });

  it('returns a safe JSON response for malformed JSON', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email":',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ accepted: false });
  });

  it('rejects payloads larger than 2 KB', async () => {
    const response = await submit({ ...validSignup, padding: 'a'.repeat(3_000) });
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ accepted: false });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('limits confirmation requests per IP with a retry header', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await submit()).status).toBe(202);
    }

    const response = await submit();
    expect(response.status).toBe(429);
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it.each([400, 401, 403, 500])(
    'does not expose Brevo errors or subscriber details (%s)',
    async (status) => {
      fetcher.mockResolvedValueOnce(
        new Response('private account or email information', { status }),
      );
      const response = await submit();

      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ accepted: false });
      expect(console.error).toHaveBeenCalledWith(
        'Newsletter provider rejected a confirmation request.',
        status,
      );
    },
  );

  it('preserves a provider rate-limit response without automatically retrying', async () => {
    fetcher.mockResolvedValueOnce(new Response('', { status: 429 }));
    const response = await submit();

    expect(response.status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('handles a network failure or timeout without logging secrets or personal data', async () => {
    fetcher.mockRejectedValueOnce(new Error('secret and email inside a provider error'));
    const response = await submit();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ accepted: false });
    expect(console.error).toHaveBeenCalledWith(
      'Newsletter confirmation request could not reach the provider.',
    );
  });

  it('accepts a successful provider response with no body', async () => {
    fetcher.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect((await submit()).status).toBe(202);
  });
});
