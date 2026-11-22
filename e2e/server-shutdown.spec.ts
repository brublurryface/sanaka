import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { createSmtpFixture } from '../testing/smtp-fixture';

test('finishes one accepted contact request when the production server receives SIGTERM', async () => {
  const smtp = await createSmtpFixture('hold');
  const child = spawn(process.execPath, ['dist/sanaka/server/server.mjs'], {
    stdio: ['ignore', 'pipe', 'inherit'],
    env: {
      ...process.env,
      ...smtp.environment,
      PORT: '0',
      NG_ALLOWED_HOSTS: '127.0.0.1,localhost',
    },
  });
  const exited = once(child, 'exit');
  const output = createInterface({ input: child.stdout });
  try {
    const firstLine = await Promise.race([
      once(output, 'line').then(([line]) => String(line)),
      exited.then(([code, signal]) => {
        throw new Error(`Server stopped on startup: ${code ?? signal}`);
      }),
    ]);
    const port = firstLine.match(/listening on http:\/\/localhost:(\d+)$/u)?.[1];
    expect(port).toBeTruthy();
    const origin = `http://127.0.0.1:${port}`;
    const delivery = fetch(origin + '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Reader', email: 'reader@example.test', message: 'Local test' }),
    })
      .then(async (response) => ({ status: response.status, body: await response.json() }))
      .catch(String);
    await expect.poll(() => smtp.stats.messages).toBe(1);
    expect(child.kill('SIGTERM')).toBe(true);
    // Uma nova conexão deve ser recusada enquanto o SMTP ainda deve a confirmação da primeira.
    await expect
      .poll(async () => {
        try {
          const health = await fetch(origin + '/api/health', { headers: { Connection: 'close' } });
          await health.arrayBuffer();
          return 'listening';
        } catch (error) {
          return ((error as Error).cause as NodeJS.ErrnoException | undefined)?.code;
        }
      })
      .toBe('ECONNREFUSED');
    expect(child.kill('SIGTERM')).toBe(true);
    smtp.confirm();
    expect(await delivery).toEqual({ status: 200, body: { delivered: true } });
    expect(await exited).toEqual([0, null]);
    expect(smtp.stats.messages).toBe(1);
  } finally {
    output.close();
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await exited;
    await smtp.close();
  }
});
