export const ANALYTICS_CONFIG_PATH = '/api/analytics/config';

export function parseGa4MeasurementId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return /^G-[A-Z0-9]{4,20}$/u.test(id) ? id : null;
}
