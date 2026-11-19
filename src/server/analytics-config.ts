import type { RequestHandler } from 'express';

import { parseGa4MeasurementId } from '../shared/analytics';

export function analyticsMeasurementId(noIndex: boolean, environment = process.env): string | null {
  return noIndex ? null : parseGa4MeasurementId(environment['SANAKA_GA4_MEASUREMENT_ID']);
}

export function createAnalyticsConfigResponse(measurementId: string | null): RequestHandler {
  return (_request, response) => {
    response.set('Cache-Control', 'no-store').json({ measurementId });
  };
}
