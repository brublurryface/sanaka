import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { analyticsMeasurementId, createAnalyticsConfigResponse } from './server/analytics-config';
import { getHtmlCacheControl, getStaticCacheControl } from './server/cache-policy';
import { createContactRouter } from './server/contact-router';
import { createCspReportRouter } from './server/csp-reports';
import { createHttpRequestLog } from './server/http-request-log';
import { legacyWordPressRedirect } from './server/legacy-wordpress-redirects';
import { createNewsletterRouter } from './server/newsletter';
import { rejectAmbiguousRequestTarget } from './server/request-target';
import { createRobotsResponse } from './server/robots';
import { readRuntimeOptions } from './server/runtime-options';
import {
  CSP_REPORT_PATH,
  createSecurityResponseHeaders,
  securityResponseHeaders,
} from './server/security-headers';
import { ANALYTICS_CONFIG_PATH } from './shared/analytics';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const runtimeOptions = readRuntimeOptions();
const measurementId = analyticsMeasurementId(runtimeOptions.noIndex);
const angularApp = new AngularNodeAppEngine({ allowedHosts: runtimeOptions.allowedHosts });

app.disable('x-powered-by');
app.set('trust proxy', runtimeOptions.trustProxyHops);
app.use(createHttpRequestLog());
app.use(measurementId ? createSecurityResponseHeaders(true) : securityResponseHeaders);

if (runtimeOptions.noIndex) {
  app.use((_request, response, next) => {
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });
}

app.use(rejectAmbiguousRequestTarget);
app.get('/robots.txt', createRobotsResponse(runtimeOptions.noIndex));

app.use('/api', (_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

// Verifica o processo sem chamar SMTP, Brevo ou WordPress a cada sondagem do Render.
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.get(ANALYTICS_CONFIG_PATH, createAnalyticsConfigResponse(measurementId));

app.use(CSP_REPORT_PATH, createCspReportRouter());
app.use('/api/contact', createContactRouter());
app.use('/api/newsletter', createNewsletterRouter());
app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'not_found' });
});

// Os links do WordPress continuam válidos quando o domínio público passar para o Render.
app.use(legacyWordPressRedirect);

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders: (response, filePath) => {
      response.setHeader('Cache-Control', getStaticCacheControl(filePath));
    },
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => {
      if (!response) {
        return next();
      }

      // Alterar a própria resposta evita que o Angular sobrescreva o cache ao copiá-la.
      response.headers.set(
        'Cache-Control',
        getHtmlCacheControl(
          response.status,
          response.headers.get('Cache-Control'),
          res.getHeader('Cache-Control')?.toString(),
        ),
      );
      return writeResponseToNodeResponse(response, res);
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT'] || 4000);
  app.listen(port, '0.0.0.0', (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
