import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTACT_LIMITS, ContactMessage } from '../shared/contact';

const sendMail = vi.hoisted(() => vi.fn());
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

describe('contact rate-limit regression', () => {
  let handler: typeof import('./contact').contactHandler;

  beforeEach(async () => {
    vi.resetModules();
    sendMail.mockReset().mockResolvedValue({});
    vi.stubEnv('SMTP_HOST', 'smtp.example.com');
    vi.stubEnv('SMTP_USER', 'sender@example.com');
    vi.stubEnv('SMTP_PASS', 'fake-test-password');
    vi.stubEnv('CONTACT_FROM_EMAIL', 'Sanaka <sender@example.com>');
    vi.stubEnv('CONTACT_TO_EMAIL', 'recipient@example.com');
    handler = (await import('./contact')).contactHandler;
  });

  afterEach(() => vi.unstubAllEnvs());

  async function submit(website = '', overrides: Partial<ContactMessage> = {}) {
    const request = {
      is: () => 'application/json',
      ip: 'test-ip',
      socket: {},
      body: {
        name: 'Reader',
        email: 'reader@example.com',
        subject: 'Sanaka',
        message: 'Test message',
        website,
        ...overrides,
      },
    } as unknown as Request;
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };
    await handler(request, response as unknown as Response, vi.fn());
    return response;
  }

  it('preserves SMTP delivery and the existing four-attempt contact limit', async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect((await submit()).status).toHaveBeenCalledWith(200);
    }

    const blocked = await submit();
    expect(blocked.status).toHaveBeenCalledWith(429);
    expect(blocked.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    expect(sendMail).toHaveBeenCalledTimes(4);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'recipient@example.com',
        replyTo: 'reader@example.com',
        subject: '[Sanaka] Sanaka',
      }),
    );
  });

  it('preserves the contact honeypot without consuming valid-message attempts', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await submit('https://bot.example/')).json).toHaveBeenCalledWith({ delivered: true });
    }

    expect(sendMail).not.toHaveBeenCalled();
    expect((await submit()).status).toHaveBeenCalledWith(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('does not put addresses, message text or provider details in failure logs', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      sendMail.mockRejectedValueOnce(
        new Error('recipient@example.com password=private message=private'),
      );
      expect((await submit()).status).toHaveBeenCalledWith(503);
      expect(log).toHaveBeenCalledExactlyOnceWith('Contact message delivery failed.');
    } finally {
      log.mockRestore();
    }
  });

  it.each(['name', 'email', 'subject', 'message'] as const)(
    'enforces the shared %s limit even when the browser is bypassed',
    async (field) => {
      const limit = CONTACT_LIMITS[field];
      const text = (length: number) =>
        field === 'email'
          ? `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(length - 193)}`
          : 'x'.repeat(length);
      expect((await submit('', { [field]: text(limit) })).status).toHaveBeenCalledWith(200);
      expect((await submit('', { [field]: text(limit + 1) })).status).toHaveBeenCalledWith(400);
      expect(sendMail).toHaveBeenCalledOnce();
    },
  );
});
