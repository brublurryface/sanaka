import express, { type ErrorRequestHandler, type RequestHandler } from 'express';

import { NEWSLETTER_EMAIL_MAX_LENGTH, type NewsletterSignupRequest } from '../shared/newsletter';
import { createRateLimiter } from './request-rate-limit';

const BREVO_DOI_ENDPOINT = 'https://api.brevo.com/v3/contacts/doubleOptinConfirmation';
const PROVIDER_TIMEOUT_MS = 8_000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000;

interface NewsletterConfiguration {
  readonly apiKey: string;
  readonly listId: number;
  readonly templateId: number;
  readonly redirectionUrl: string;
}

function positiveInteger(value: string | undefined): number | null {
  if (!value || !/^\d+$/u.test(value.trim())) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Configuração incompleta fecha somente o cadastro; não impede o restante do site de abrir. */
function readConfiguration(): NewsletterConfiguration | null {
  const apiKey = process.env['BREVO_API_KEY']?.trim();
  const listId = positiveInteger(process.env['BREVO_NEWSLETTER_LIST_ID']);
  const templateId = positiveInteger(process.env['BREVO_NEWSLETTER_TEMPLATE_ID']);
  const redirect = process.env['BREVO_NEWSLETTER_REDIRECT_URL'];

  if (!apiKey || !listId || !templateId || !redirect) {
    return null;
  }

  try {
    const url = new URL(redirect);
    const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

    // HTTP fica restrito aos testes locais. O visitante não escolhe a URL de retorno.
    if (
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocal)) ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return { apiKey, listId, templateId, redirectionUrl: url.href };
  } catch {
    return null;
  }
}

function parseSignup(body: unknown): NewsletterSignupRequest | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  const candidate = body as Record<string, unknown>;
  const rawEmail = candidate['email'];
  const website = candidate['website'] ?? '';

  if (
    typeof rawEmail !== 'string' ||
    typeof website !== 'string' ||
    candidate['consent'] !== true
  ) {
    return null;
  }

  const email = rawEmail.trim();

  if (
    !email ||
    email.length > NEWSLETTER_EMAIL_MAX_LENGTH ||
    website.length > NEWSLETTER_EMAIL_MAX_LENGTH ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)
  ) {
    return null;
  }

  return { email, consent: true, website: website.trim() };
}

/**
 * O cadastro é público, mas a requisição autenticada à Brevo acontece somente neste servidor.
 * A lista recebe a pessoa pelo fluxo double opt-in, nunca por inclusão direta sem confirmação.
 * A função de rede pode ser substituída nos testes, que não criam contatos nem enviam e-mails.
 */
export function createNewsletterRouter(fetcher: typeof fetch = fetch): express.Router {
  const router = express.Router();
  const limitAttempts = createRateLimiter({ maxRequests: 5, windowMs: RATE_LIMIT_WINDOW_MS });

  // Nunca transferir este estado pelo cache SSR: a configuração pode mudar após a publicação.
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.get('/status', (_request, response) => {
    response.json({ available: readConfiguration() !== null });
  });

  const handleSignup: RequestHandler = async (request, response) => {
    if (!request.is('application/json')) {
      response.status(415).json({ accepted: false });
      return;
    }

    const signup = parseSignup(request.body);
    if (!signup) {
      response.status(400).json({ accepted: false });
      return;
    }

    // Campo-isca preenchido: não chama a Brevo e não revela ao bot que ele foi reconhecido.
    if (signup.website) {
      response.status(202).json({ accepted: true });
      return;
    }

    const configuration = readConfiguration();
    if (!configuration) {
      response.status(503).json({ accepted: false });
      return;
    }

    const retryAfter = limitAttempts(request.ip || request.socket.remoteAddress || 'unknown');
    if (retryAfter > 0) {
      response.setHeader('Retry-After', retryAfter);
      response.status(429).json({ accepted: false });
      return;
    }

    try {
      const upstream = await fetcher(BREVO_DOI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'api-key': configuration.apiKey,
        },
        body: JSON.stringify({
          email: signup.email,
          includeListIds: [configuration.listId],
          templateId: configuration.templateId,
          redirectionUrl: configuration.redirectionUrl,
        }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });

      // Não repassar a resposta da Brevo: ela pode revelar endereço, conta ou detalhes internos.
      // A resposta não é usada; cancelar o corpo também libera a conexão HTTP do provedor.
      await upstream.body?.cancel();

      if (!upstream.ok) {
        console.error('Newsletter provider rejected a confirmation request.', upstream.status);
        response.status(upstream.status === 429 ? 429 : 502).json({ accepted: false });
        return;
      }

      // Aceitar o pedido não significa confirmar a assinatura: a pessoa ainda precisa clicar no e-mail.
      response.status(202).json({ accepted: true });
    } catch {
      console.error('Newsletter confirmation request could not reach the provider.');
      response.status(502).json({ accepted: false });
    }
  };

  router.post('/', express.json({ limit: '2kb' }), handleSignup);

  const handleBodyError: ErrorRequestHandler = (error, _request, response, next) => {
    if (error?.type === 'entity.too.large' || error?.type === 'entity.parse.failed') {
      response.status(error.type === 'entity.too.large' ? 413 : 400).json({ accepted: false });
      return;
    }

    next(error);
  };

  router.use(handleBodyError);
  return router;
}
