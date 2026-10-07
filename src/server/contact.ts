import { RequestHandler } from 'express';
import nodemailer from 'nodemailer';

const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 4_000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000;
const RATE_LIMIT_MAX_REQUESTS = 4;

interface ContactPayload {
  readonly name: string;
  readonly email: string;
  readonly subject: string;
  readonly message: string;
  readonly website: string;
}

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

const attemptsByIp = new Map<string, RateLimitEntry>();
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function readText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length <= maxLength ? normalized : null;
}

function parseContactPayload(body: unknown): ContactPayload | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const candidate = body as Record<string, unknown>;
  const name = readText(candidate['name'], MAX_NAME_LENGTH);
  const email = readText(candidate['email'], MAX_EMAIL_LENGTH);
  const subject = readText(candidate['subject'] ?? '', MAX_SUBJECT_LENGTH);
  const message = readText(candidate['message'], MAX_MESSAGE_LENGTH);
  const website = readText(candidate['website'] ?? '', MAX_EMAIL_LENGTH);

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

function exceedsRateLimit(ip: string): boolean {
  const now = Date.now();

  if (attemptsByIp.size > 500) {
    for (const [storedIp, attempt] of attemptsByIp) {
      if (attempt.expiresAt <= now) {
        attemptsByIp.delete(storedIp);
      }
    }
  }

  const current = attemptsByIp.get(ip);

  if (!current || current.expiresAt <= now) {
    attemptsByIp.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function buildMessageText(payload: ContactPayload): string {
  return [
    `Nome: ${payload.name}`,
    `E-mail: ${payload.email}`,
    `Assunto: ${payload.subject || 'Sem assunto'}`,
    '',
    payload.message,
  ].join('\n');
}

function getTransporter(): ReturnType<typeof nodemailer.createTransport> {
  if (transporter) {
    return transporter;
  }

  const smtpPort = Number.parseInt(process.env['SMTP_PORT'] ?? '465', 10);
  transporter = nodemailer.createTransport({
    host: requireEnvironment('SMTP_HOST'),
    port: Number.isNaN(smtpPort) ? 465 : smtpPort,
    secure: (process.env['SMTP_SECURE'] ?? 'true').toLowerCase() === 'true',
    auth: {
      user: requireEnvironment('SMTP_USER'),
      pass: requireEnvironment('SMTP_PASS'),
    },
  });

  return transporter;
}

export const contactHandler: RequestHandler = async (request, response) => {
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
  if (exceedsRateLimit(clientIp)) {
    response.status(429).json({ delivered: false });
    return;
  }

  try {
    await getTransporter().sendMail({
      from: requireEnvironment('CONTACT_FROM_EMAIL'),
      to: process.env['CONTACT_TO_EMAIL']?.trim() || 'sanaka@sanaka.com.br',
      replyTo: payload.email,
      subject: `[Sanaka] ${(payload.subject || 'Nova mensagem').replace(/[\r\n]+/gu, ' ')}`,
      text: buildMessageText(payload),
    });

    response.status(200).json({ delivered: true });
  } catch (error) {
    console.error('Contact message delivery failed.', error);
    response.status(503).json({ delivered: false });
  }
};
