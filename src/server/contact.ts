import { RequestHandler } from 'express';
import nodemailer from 'nodemailer';
import {
  CONTACT_LIMITS,
  CONTACT_SEND_TIMEOUT_MS,
  ContactMessage,
  ContactResponse,
} from '../shared/contact';

import { logProviderFailure } from './request-log-context';
import { createRateLimiter } from './request-rate-limit';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000;
const RATE_LIMIT_MAX_REQUESTS = 4;

const SMTP_TIMEOUTS = Object.freeze({
  connectionTimeout: 10_000,
  greetingTimeout: 5_000,
  socketTimeout: 10_000,
});

interface ContactHandlerOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly smtpTimeouts?: { readonly [Key in keyof typeof SMTP_TIMEOUTS]: number };
  readonly sendTimeoutMs?: number;
}

function readText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length <= maxLength ? normalized : null;
}

function parseContactPayload(body: unknown): ContactMessage | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const candidate = body as Record<string, unknown>;
  const name = readText(candidate['name'], CONTACT_LIMITS.name);
  const email = readText(candidate['email'], CONTACT_LIMITS.email);
  const subject = readText(candidate['subject'] ?? '', CONTACT_LIMITS.subject);
  const message = readText(candidate['message'], CONTACT_LIMITS.message);
  const website = readText(candidate['website'] ?? '', CONTACT_LIMITS.email);

  if (
    !name ||
    !email ||
    !message ||
    subject === null ||
    website === null ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)
  ) {
    return null;
  }

  return { name, email, subject, message, website };
}

function requireEnvironment(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function buildMessageText(payload: ContactMessage): string {
  return [
    `Nome: ${payload.name}`,
    `E-mail: ${payload.email}`,
    `Assunto: ${payload.subject || 'Sem assunto'}`,
    '',
    payload.message,
  ].join('\n');
}

/** Cada instância preserva seu limitador e transporte, sem depender de estado de outro teste/app. */
export function createContactHandler({
  environment = process.env,
  smtpTimeouts = SMTP_TIMEOUTS,
  sendTimeoutMs = CONTACT_SEND_TIMEOUT_MS,
}: ContactHandlerOptions = {}): RequestHandler {
  const limitAttempts = createRateLimiter({
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

  function getTransporter(): ReturnType<typeof nodemailer.createTransport> {
    if (!transporter) {
      const smtpPort = Number.parseInt(environment['SMTP_PORT'] ?? '465', 10);
      transporter = nodemailer.createTransport({
        host: requireEnvironment(environment, 'SMTP_HOST'),
        port: Number.isNaN(smtpPort) ? 465 : smtpPort,
        secure: (environment['SMTP_SECURE'] ?? 'true').toLowerCase() === 'true',
        auth: {
          user: requireEnvironment(environment, 'SMTP_USER'),
          pass: requireEnvironment(environment, 'SMTP_PASS'),
        },
        ...smtpTimeouts,
      });
    }
    return transporter;
  }

  return async (request, response) => {
    if (!request.is('application/json')) {
      response.status(415).json({ delivered: false });
      return;
    }

    const payload = parseContactPayload(request.body);
    if (!payload) {
      response.status(400).json({ delivered: false });
      return;
    }

    // Bots costumam preencher o campo invisível. Respondemos sem entregar a
    // mensagem para não revelar que o filtro foi acionado.
    if (payload.website) {
      response.status(200).json({ delivered: true });
      return;
    }

    const clientIp = request.ip || request.socket.remoteAddress || 'unknown';
    const retryAfter = limitAttempts(clientIp);
    if (retryAfter > 0) {
      response.setHeader('Retry-After', retryAfter);
      response.status(429).json({ delivered: false });
      return;
    }

    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      const transport = getTransporter();
      const controller = new AbortController();
      const message = {
        from: requireEnvironment(environment, 'CONTACT_FROM_EMAIL'),
        to: environment['CONTACT_TO_EMAIL']?.trim() || 'sanaka@sanaka.com.br',
        replyTo: payload.email,
        subject: `[Sanaka] ${(payload.subject || 'Nova mensagem').replace(/[\r\n]+/gu, ' ')}`,
        text: buildMessageText(payload),
        signal: controller.signal,
      };
      deadline = setTimeout(() => controller.abort(), sendTimeoutMs);
      deadline.unref();
      await transport.sendMail(message);

      response.status(200).json({ delivered: true });
    } catch (error: unknown) {
      logProviderFailure(request, 'smtp');
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      const timedOut = code === 'EABORT' || code === 'ETIMEDOUT';
      const unconfirmed = timedOut || code === 'ECONNECTION' || code === 'ESOCKET';
      const result: ContactResponse = unconfirmed
        ? { delivered: false, reason: 'unconfirmed' }
        : { delivered: false };
      response.status(timedOut ? 504 : 503).json(result);
    } finally {
      clearTimeout(deadline);
    }
  };
}

export const contactHandler = createContactHandler();
