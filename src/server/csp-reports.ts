import express from 'express';

import { createRateLimiter } from './request-rate-limit';

interface CspReportOptions {
  readonly write?: (line: string) => void;
  readonly revision?: string;
}

const directives = new Set([
  'default-src',
  'script-src',
  'script-src-elem',
  'script-src-attr',
  'style-src',
  'style-src-elem',
  'style-src-attr',
  'font-src',
  'img-src',
  'connect-src',
  'frame-src',
  'frame-ancestors',
  'object-src',
  'base-uri',
  'form-action',
  'media-src',
  'worker-src',
  'manifest-src',
]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function reportUrl(value: unknown): URL | null {
  if (typeof value !== 'string' || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

function documentGroup(path: string): string {
  if (path === '/') return 'home';
  if (path === '/posts' || path.startsWith('/posts/')) return 'posts';
  if (path === '/matrix' || path.startsWith('/matrix/')) return 'matrix';
  if (path === '/loadings/sabala/hysteria/index.html') return 'sabala';
  if (path === '/sobre') return 'about';
  if (path === '/contato') return 'contact';
  if (path === '/sanaka-loka') return 'sanaka-loka';
  if (path === '/samvit') return 'samvit';
  return 'other';
}

function sourceGroup(value: unknown, document: URL): string {
  if (value === 'inline' || value === 'eval') return value;
  if (typeof value === 'string' && value.startsWith('data:')) return 'data';
  if (typeof value === 'string' && value.startsWith('blob:')) return 'blob';
  const url = reportUrl(value);
  if (!url) return 'unknown';
  if (url.origin === document.origin) return 'same-origin';
  switch (url.origin) {
    case 'https://cms.sanaka.com.br':
      return 'cms';
    case 'https://fonts.googleapis.com':
    case 'https://fonts.gstatic.com':
      return 'google-fonts';
    case 'https://images-api.nasa.gov':
    case 'https://images-assets.nasa.gov':
      return 'nasa';
    default:
      return 'external';
  }
}

/** Keep finite labels; discard all browser-provided URLs and samples. */
function summarize(body: unknown) {
  if (!record(body)) return null;
  const directive = body['effectiveDirective'] ?? body['effective-directive'];
  const document = reportUrl(body['documentURL'] ?? body['document-uri']);
  if (typeof directive !== 'string' || !directives.has(directive) || !document) return null;
  const disposition = body['disposition'];
  return {
    directive,
    disposition: disposition === 'report' || disposition === 'enforce' ? disposition : 'unknown',
    document_group: documentGroup(document.pathname),
    blocked_source: sourceGroup(body['blockedURL'] ?? body['blocked-uri'], document),
  };
}

/** Best-effort telemetry, bounded per process; reports are untrusted, not proof of an attack. */
export function createCspReportRouter({
  write = (line) => console.log(line),
  revision: candidate = process.env['RENDER_GIT_COMMIT'],
}: CspReportOptions = {}): express.Router {
  const revision = candidate && /^[a-f0-9]{7,64}$/iu.test(candidate) ? candidate : 'unknown';
  const allowRequest = createRateLimiter({ maxRequests: 60, windowMs: 60_000, maxEntries: 1 });
  const parse = express.json({
    type: ['application/csp-report', 'application/reports+json'],
    limit: '16kb',
    inflate: false,
  });
  const router = express.Router();
  router.post(
    '/',
    (_request, response, next) => {
      if (allowRequest('telemetry')) response.status(204).end();
      else next();
    },
    (request, response, next) => {
      parse(request, response, (error?: unknown) => {
        // Acknowledge unusable telemetry without exposing parser errors or provoking retries.
        if (error) response.status(204).end();
        else next();
      });
    },
    (request, response) => {
      const body: unknown = request.body;
      const reports: unknown[] = [];
      if (Array.isArray(body)) {
        for (const item of body.slice(0, 10)) {
          if (record(item) && item['type'] === 'csp-violation') reports.push(item['body']);
        }
      } else if (record(body)) {
        reports.push(body['csp-report']);
      }
      for (const report of reports) {
        const summary = summarize(report);
        if (!summary) continue;
        try {
          write(
            JSON.stringify({
              event: 'csp_violation',
              level: 'info',
              timestamp: new Date().toISOString(),
              revision,
              ...summary,
            }),
          );
        } catch {
          // Telemetry must not make a page or the reporting endpoint fail.
        }
      }
      response.status(204).end();
    },
  );
  return router;
}
