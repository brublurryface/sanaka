import type { Request } from 'express';
import { randomUUID } from 'node:crypto';

const ids = new WeakMap<Request, string>();
const RENDER_ID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){2}(?:-[a-f0-9]{4}-[a-f0-9]{12})?$/iu;

/** O provedor e a resposta HTTP usam o mesmo identificador enquanto a requisição existir. */
export function requestIdFor(request: Request): string {
  const known = ids.get(request);
  if (known) return known;
  const header = request.headers['rndr-id'];
  const id = typeof header === 'string' && RENDER_ID.test(header) ? header : randomUUID();
  ids.set(request, id);
  return id;
}

/** Registra somente campos operacionais. Erros e corpos do provedor podem conter dados pessoais. */
export function logProviderFailure(
  request: Request,
  provider: 'smtp' | 'brevo',
  upstreamStatus?: number,
): void {
  try {
    console.error(
      JSON.stringify({
        event: 'provider_failure',
        level: 'error',
        timestamp: new Date().toISOString(),
        provider,
        request_id: requestIdFor(request),
        upstream_status: upstreamStatus,
      }),
    );
  } catch {
    // O resultado da operação continua disponível mesmo se o destino dos logs falhar.
  }
}
