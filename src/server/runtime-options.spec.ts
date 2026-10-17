import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';

import { readRuntimeOptions } from './runtime-options';

describe('server runtime options', () => {
  it('preserves the Angular build allowlist when no extra hostname is configured', () => {
    expect(readRuntimeOptions({})).toEqual({
      allowedHosts: undefined,
      trustProxyHops: 0,
      noIndex: false,
    });
  });

  it('adds only this Render service to manually configured hostnames', () => {
    const options = readRuntimeOptions({
      NG_ALLOWED_HOSTS: 'localhost, ,sanaka.onrender.com',
      RENDER_EXTERNAL_HOSTNAME: 'sanaka.onrender.com',
      SITE_NOINDEX: 'true',
    });

    expect(options.allowedHosts).toEqual(['localhost', 'sanaka.onrender.com']);
    expect(options.noIndex).toBe(true);
  });

  it.each(['true', '-1', '1.5', '1x', '9007199254740992'])(
    'rejects an invalid proxy configuration (%s)',
    (value) => {
      expect(() => readRuntimeOptions({ TRUST_PROXY_HOPS: value })).toThrow('TRUST_PROXY_HOPS');
    },
  );

  it.each([
    ['0', '127.0.0.1'],
    ['1', '192.0.2.10'],
  ])('ignores untrusted forwarded IPs with %s trusted proxy hops', async (hops, expectedIp) => {
    const app = express();
    app.set('trust proxy', readRuntimeOptions({ TRUST_PROXY_HOPS: hops }).trustProxyHops);
    app.get('/', (request, response) => response.json({ ip: request.ip }));
    const server = app.listen(0, '127.0.0.1');

    try {
      await once(server, 'listening');
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        // O último proxy acrescenta o IP do cliente; o prefixo pode ter sido falsificado.
        headers: { 'X-Forwarded-For': '198.51.100.99, 192.0.2.10' },
      });

      expect(await response.json()).toEqual({ ip: expectedIp });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
