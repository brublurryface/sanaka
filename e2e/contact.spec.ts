import { expectReady } from './support/assertions';
import { expect, test } from './support/site';
import type { Page } from '@playwright/test';

async function fillContact(page: Page) {
  await page.goto('/contato');
  await expectReady(page);
  await page.getByLabel('Nome', { exact: true }).fill('Reader');
  await page.getByLabel('E-mail', { exact: true }).fill('reader@example.test');
  await page.getByLabel('Mensagem', { exact: true }).fill('A synthetic contact message.');
}

// Page-scoped mocks take precedence over the context's no-write guard.
// These POSTs are fulfilled here and never reach Express, SMTP or an external service.
test('blocks duplicate contact submissions and resets only after confirmation', async ({
  page,
  baseURL,
}) => {
  let requests = 0;
  let release!: () => void;
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(new URL('/api/contact', baseURL).href, async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject({
      email: 'reader@example.test',
      message: 'A synthetic contact message.',
    });
    requests++;
    await response;
    await route.fulfill({ json: { delivered: true } });
  });
  try {
    await fillContact(page);
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();
    await expect.poll(() => requests).toBe(1);
    await expect(page.getByRole('button', { name: 'Enviando' })).toBeDisabled();
    await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
    expect(requests).toBe(1);
    release();
    await expect(page.locator('.contact-message__status')).toContainText(
      'Sua mensagem foi enviada.',
    );
    await expect(page.getByLabel('Nome', { exact: true })).toBeEmpty();
    await expect(page.getByLabel('Mensagem', { exact: true })).toBeEmpty();
    expect(requests).toBe(1);
  } finally {
    release();
  }
});

test('retains an unconfirmed message and translates feedback without another POST', async ({
  page,
  baseURL,
}) => {
  let requests = 0;
  await page.route(new URL('/api/contact', baseURL).href, async (route) => {
    expect(route.request().method()).toBe('POST');
    requests++;
    await route.fulfill({ status: 504, json: { delivered: false, reason: 'unconfirmed' } });
  });
  await fillContact(page);
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.locator('.contact-message__status')).toContainText(
    'Sua mensagem pode ter sido enviada.',
  );
  await expect(page.getByLabel('Mensagem', { exact: true })).toHaveValue(
    'A synthetic contact message.',
  );
  await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toBeEnabled();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('.contact-message__status')).toContainText(
    'Your message may have been sent.',
  );
  expect(requests).toBe(1);
});

test('preserves rate-limit feedback without retrying a contact automatically', async ({
  page,
  baseURL,
}) => {
  let requests = 0;
  await page.route(new URL('/api/contact', baseURL).href, async (route) => {
    expect(route.request().method()).toBe('POST');
    requests++;
    await route.fulfill({
      status: 429,
      headers: { 'Retry-After': '900' },
      json: { delivered: false },
    });
  });
  await fillContact(page);
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.locator('.contact-message__status')).toContainText(
    'Muitas mensagens chegaram em pouco tempo.',
  );
  await expect(page.getByLabel('Mensagem', { exact: true })).toHaveValue(
    'A synthetic contact message.',
  );
  await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toBeEnabled();
  expect(requests).toBe(1);
});

test('preserves a message after a malformed delivery receipt', async ({ page, baseURL }) => {
  let submits = 0;
  await page.route(new URL('/api/contact', baseURL).href, async (route) => {
    submits++;
    await route.fulfill({ json: { delivered: 'false' } });
  });
  await fillContact(page);
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.locator('.contact-message__status')).toContainText(
    'Sua mensagem pode ter sido enviada.',
  );
  await expect(page.getByLabel('Mensagem', { exact: true })).toHaveValue(
    'A synthetic contact message.',
  );
  expect(submits).toBe(1);
});
