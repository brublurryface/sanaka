import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';

import { ANALYTICS_CONFIG_PATH } from '../shared/analytics';
import { analyticsMeasurementId, createAnalyticsConfigResponse } from './analytics-config';
import { createSecurityResponseHeaders } from './security-headers';

const fixtureId = 'G-TEST000001';

describe('optional analytics configuration', () => {
  it.each([undefined, '', '  ', 'GT-AAAAAA', 'G-inline<script>', 'G-abc123'])(
    'disables an absent or invalid measurement ID (%j)',
    (value) => {
      expect(analyticsMeasurementId(false, { SANAKA_GA4_MEASUREMENT_ID: value })).toBeNull();
    },
  );

  it.each([true, false])(
    'serves only the public measurement ID with no-store and respects preview=%s',
    async (preview) => {
      const id = analyticsMeasurementId(preview, { SANAKA_GA4_MEASUREMENT_ID: ` ${fixtureId} ` });
      const app = express();
      app.use(createSecurityResponseHeaders(!!id));
      app.get(ANALYTICS_CONFIG_PATH, createAnalyticsConfigResponse(id));
      const server = app.listen(0, '127.0.0.1');
      try {
        await once(server, 'listening');
        const port = (server.address() as AddressInfo).port;
        const response = await fetch(`http://127.0.0.1:${port}${ANALYTICS_CONFIG_PATH}`);
        expect(response.status).toBe(200);
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(await response.json()).toEqual({ measurementId: preview ? null : fixtureId });
        expect(response.headers.get('content-security-policy')).toBe("frame-ancestors 'self'");
        const observed = response.headers.get('content-security-policy-report-only');
        expect(observed?.includes('www.googletagmanager.com')).toBe(!preview);
        expect(observed?.includes('*.google-analytics.com')).toBe(!preview);
        expect(observed).not.toMatch(/doubleclick|googleadservices|unsafe-eval/u);
      } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
  );
});
