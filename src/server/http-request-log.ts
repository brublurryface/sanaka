import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

interface HttpRequestLogOptions {
  readonly revision?: string;
  readonly write?: (line: string) => void;
}

const METHODS = new Set([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'TRACE',
  'CONNECT',
]);
const SENSITIVE_SEGMENT = /^(?:email|token|password|secret|confirm|reset-password)$/iu;
const ASSET_PATH =
  /\.(?:m?js|css|map|json|xml|txt|png|apng|jpe?g|webp|svg|ico|gif|avif|woff2?|ttf|otf)$/iu;
const REQUEST_ID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){2}(?:-[a-f0-9]{4}-[a-f0-9]{12})?$/iu;

/** Preserva o caminho recebido; não resolve segmentos, muda caixa ou decodifica barras. */
function logPath(target: string): string {
  if (!target.startsWith('/') || target.startsWith('//')) return '[invalid-target]';
  const rawPath = target.split(/[?#]/u, 1)[0];
  let previous = '';
  const path = rawPath
    .split('/')
    .map((segment) => {
      let decoded: string;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        previous = '';
        return '[invalid-encoding]';
      }
      const redact = SENSITIVE_SEGMENT.test(previous) || /[@?#]|%40/iu.test(decoded);
      previous = decoded;
      return redact
        ? '[redacted]'
        : segment.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/gu, '_');
    })
    .join('/');
  return path.length > 256 ? `${path.slice(0, 255)}…` : path;
}

function resourceType(path: string, contentType: unknown): string {
  if (/^\/api(?:\/|$)/iu.test(path)) return 'api';
  if (/^\/(?:images|assets|loadings|i18n)(?:\/|$)/u.test(path) || ASSET_PATH.test(path)) {
    return 'asset';
  }
  return typeof contentType === 'string' && /^text\/html(?:;|$)/iu.test(contentType)
    ? 'document'
    : 'other';
}

/** Registra somente respostas 404/5xx concluídas, sem alterar status, headers ou corpo. */
export function createHttpRequestLog({
  revision: candidate = process.env['RENDER_GIT_COMMIT'],
  write = (line) => console.log(line),
}: HttpRequestLogOptions = {}): RequestHandler {
  const revision = candidate && /^[a-f0-9]{7,64}$/iu.test(candidate) ? candidate : 'unknown';

  return (request, response, next) => {
    const started = performance.now();
    const target = request.originalUrl;
    const method = METHODS.has(request.method) ? request.method : 'OTHER';
    const renderId = request.headers['rndr-id'];

    const cleanup = () => {
      response.off('finish', finish);
      response.off('close', cleanup);
    };
    const finish = () => {
      cleanup();
      const status = response.statusCode;
      if (status !== 404 && (status < 500 || status > 599)) return;
      const path = logPath(target);
      try {
        write(
          JSON.stringify({
            event: 'http_response_error',
            level: status === 404 ? 'warning' : 'error',
            timestamp: new Date().toISOString(),
            method,
            path,
            status,
            resource_type: resourceType(path, response.getHeader('Content-Type')),
            duration_ms: Math.round((performance.now() - started) * 1_000) / 1_000,
            request_id:
              typeof renderId === 'string' && REQUEST_ID.test(renderId) ? renderId : randomUUID(),
            revision,
          }),
        );
      } catch {
        // Uma falha no destino dos logs não pode lançar erro depois de enviar a resposta.
      }
    };

    response.once('finish', finish);
    // close também ocorre após sucesso. Se vier antes de finish, não inventar status entregue.
    response.once('close', cleanup);
    next();
  };
}
