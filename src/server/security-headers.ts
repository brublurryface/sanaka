import type { RequestHandler } from 'express';

export const CSP_REPORT_PATH = '/api/security/csp-reports';

const observationPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://cms.sanaka.com.br https://images-assets.nasa.gov",
  "connect-src 'self' https://cms.sanaka.com.br https://images-api.nasa.gov",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'report-to csp',
  `report-uri ${CSP_REPORT_PATH}`,
].join('; ');

/** Resource restrictions are observed first; only same-origin framing is enforced. */
export const securityResponseHeaders: RequestHandler = (_request, response, next) => {
  response.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy': "frame-ancestors 'self'",
    'Content-Security-Policy-Report-Only': observationPolicy,
    'Reporting-Endpoints': `csp="${CSP_REPORT_PATH}"`,
  });
  next();
};
