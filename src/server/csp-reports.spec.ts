import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCspReportRouter } from './csp-reports';
import { securityResponseHeaders } from './security-headers';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
  vi.restoreAllMocks();
});

function legacy(overrides: Record<string, unknown> = {}) {
  return {
    'csp-report': {
      'document-uri': 'https://sanaka.com.br/posts/private-slug?token=private#private',
      'effective-directive': 'script-src-elem',
      'blocked-uri': 'inline',
      disposition: 'report',
      'script-sample': 'private content',
      referrer: 'https://example.test/private?email=private@example.test',
      ...overrides,
    },
  };
}

async function serve(write = vi.fn<(line: string) => void>(), revision = 'abcdef123') {
  const app = express();
  app.use(securityResponseHeaders);
  app.use('/api', (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/security/csp-reports', createCspReportRouter({ write, revision }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  cleanups.push(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/security/csp-reports`;
  return {
    write,
    post: (body: unknown = legacy(), contentType = 'application/csp-report') =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
    url,
  };
}

describe('CSP report collection', () => {
  it('accepts legacy reports and keeps only finite labels in logs', async () => {
    const { post, write } = await serve();
    const response = await post();
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(write).toHaveBeenCalledTimes(1);
    expect(JSON.parse(write.mock.calls[0][0])).toEqual({
      event: 'csp_violation',
      level: 'info',
      timestamp: expect.any(String),
      revision: 'abcdef123',
      directive: 'script-src-elem',
      disposition: 'report',
      document_group: 'posts',
      blocked_source: 'inline',
    });
    expect(write.mock.calls[0][0]).not.toMatch(/private|https:|@|token|sample|referrer/u);
  });

  it('accepts modern batches, ignores other report types and caps them at ten items', async () => {
    const { post, write } = await serve();
    const body = {
      documentURL: 'https://sanaka.com.br/sanaka-loka',
      effectiveDirective: 'img-src',
      blockedURL: 'https://outside.test/private?token=private',
      disposition: 'report',
    };
    const response = await post(
      [
        null,
        { type: 'deprecation', body },
        ...Array.from({ length: 15 }, () => ({ type: 'csp-violation', body })),
      ],
      'application/reports+json',
    );
    expect(response.status).toBe(204);
    expect(write).toHaveBeenCalledTimes(8);
    for (const [line] of write.mock.calls) {
      expect(JSON.parse(line)).toMatchObject({
        document_group: 'sanaka-loka',
        directive: 'img-src',
        blocked_source: 'external',
      });
      expect(line).not.toContain('private');
    }
  });

  it.each([
    ['/', 'home'],
    ['/posts', 'posts'],
    ['/matrix', 'matrix'],
    ['/matrix/rest-api', 'matrix'],
    ['/loadings/sabala/hysteria/index.html', 'sabala'],
    ['/sobre', 'about'],
    ['/contato', 'contact'],
    ['/sanaka-loka', 'sanaka-loka'],
    ['/samvit', 'samvit'],
    ['/unknown-private-path', 'other'],
  ])('classifies document %s without logging its path', async (path, group) => {
    const { post, write } = await serve();
    await post(legacy({ 'document-uri': `https://sanaka.com.br${path}?private=private` }));
    expect(JSON.parse(write.mock.calls[0][0]).document_group).toBe(group);
    expect(write.mock.calls[0][0]).not.toContain('private');
  });

  it.each([
    ['inline', 'inline'],
    ['eval', 'eval'],
    ['data:image/png;base64,private', 'data'],
    ['blob:https://sanaka.com.br/private', 'blob'],
    ['https://sanaka.com.br/private', 'same-origin'],
    ['https://cms.sanaka.com.br/private', 'cms'],
    ['https://fonts.googleapis.com/private', 'google-fonts'],
    ['https://fonts.gstatic.com/private', 'google-fonts'],
    ['https://images-api.nasa.gov/private', 'nasa'],
    ['https://images-assets.nasa.gov/private', 'nasa'],
    ['https://unknown.test/private', 'external'],
    ['not a URL', 'unknown'],
    ['ftp://private.test/private', 'unknown'],
    ['x'.repeat(2_049), 'unknown'],
    [42, 'unknown'],
    [null, 'unknown'],
  ])('normalizes a blocked source to a finite label (%#)', async (source, group) => {
    const { post, write } = await serve();
    await post(legacy({ 'blocked-uri': source }));
    expect(JSON.parse(write.mock.calls[0][0]).blocked_source).toBe(group);
    expect(write.mock.calls[0][0]).not.toContain('private');
  });

  it.each(['report', 'enforce', undefined, 'private'])(
    'restricts disposition to its known labels (%s)',
    async (disposition) => {
      const { post, write } = await serve();
      await post(legacy({ disposition }));
      expect(JSON.parse(write.mock.calls[0][0]).disposition).toBe(
        disposition === 'report' || disposition === 'enforce' ? disposition : 'unknown',
      );
    },
  );

  it.each([
    null,
    [],
    {},
    { 'csp-report': [] },
    { 'csp-report': null },
    legacy({ 'effective-directive': undefined }),
    legacy({ 'effective-directive': 5 }),
    legacy({ 'effective-directive': 'private-injected-directive' }),
    legacy({ 'document-uri': null }),
    legacy({ 'document-uri': 'bad URL' }),
    legacy({ 'document-uri': 'javascript:private' }),
    legacy({ 'document-uri': 'x'.repeat(2_049) }),
  ])('drops invalid report contracts without logging them (%#)', async (body) => {
    const { post, write } = await serve();
    expect((await post(body)).status).toBe(204);
    expect(write).not.toHaveBeenCalled();
  });

  it.each([
    ['{"private":', 'application/csp-report'],
    [JSON.stringify(legacy()), 'text/plain'],
    [JSON.stringify(legacy()), 'application/json'],
    [JSON.stringify(legacy()), 'application/csp-report; charset=invalid'],
    [JSON.stringify(legacy({ extra: 'private'.repeat(3_000) })), 'application/csp-report'],
  ])('acknowledges unusable bodies without parser details (%#)', async (body, contentType) => {
    const { post, write } = await serve();
    const response = await post(body, contentType);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(write).not.toHaveBeenCalled();
  });

  it('does not inflate compressed telemetry', async () => {
    const { url, write } = await serve();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/csp-report', 'Content-Encoding': 'gzip' },
      body: new Uint8Array(gzipSync(JSON.stringify(legacy()))).buffer,
    });
    expect(response.status).toBe(204);
    expect(write).not.toHaveBeenCalled();
  });

  it('caps the whole process at sixty requests per minute and renews the window', async () => {
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const { post, write } = await serve();
    for (let index = 0; index < 62; index++) expect((await post()).status).toBe(204);
    expect(write).toHaveBeenCalledTimes(60);
    now += 60_000;
    expect((await post()).status).toBe(204);
    expect(write).toHaveBeenCalledTimes(61);
  });

  it('keeps invalid revisions and failing log destinations out of the response', async () => {
    const { post, write } = await serve(vi.fn(), 'private-invalid-revision');
    expect((await post()).status).toBe(204);
    expect(JSON.parse(write.mock.calls[0][0]).revision).toBe('unknown');
    write.mockImplementation(() => {
      throw new Error('private write failure');
    });
    const response = await post();
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it('supports its default log writer without retaining raw report fields', async () => {
    const write = vi.spyOn(console, 'log').mockImplementation(() => {});
    const app = express();
    app.use(createCspReportRouter());
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    cleanups.push(async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });
    await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/csp-report' },
      body: JSON.stringify(legacy()),
    });
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0]).not.toContain('private');
  });
});
