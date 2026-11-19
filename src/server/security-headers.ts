import type { RequestHandler } from 'express';

export const CSP_REPORT_PATH = '/api/security/csp-reports';

const analyticsResources = ' https://www.googletagmanager.com https://*.google-analytics.com';

function observationPolicy(analytics: boolean): string {
  const googleScript = analytics ? ' https://www.googletagmanager.com' : '';
  const googleResources = analytics ? analyticsResources : '';
  const googleConnections = analytics ? `${googleResources} https://*.google.com` : '';
  return [
    "default-src 'self'",
    `script-src 'self'${googleScript}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: https://cms.sanaka.com.br https://images-assets.nasa.gov${googleResources}`,
    `connect-src 'self' https://cms.sanaka.com.br https://images-api.nasa.gov${googleConnections}`,
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'report-to csp',
    `report-uri ${CSP_REPORT_PATH}`,
  ].join('; ');
}

export const securityResponseHeaders = createSecurityResponseHeaders();

/** Resource restrictions are observed first; only same-origin framing is enforced. */
export function createSecurityResponseHeaders(analytics = false): RequestHandler {
  const policy = observationPolicy(analytics);
  return (_request, response, next) => {
    response.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "frame-ancestors 'self'",
      'Content-Security-Policy-Report-Only': policy,
      'Reporting-Endpoints': `csp="${CSP_REPORT_PATH}"`,
    });
    next();
  };
}
