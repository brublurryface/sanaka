import type { APIRequestContext, Page } from '@playwright/test';

import { article } from './fixtures/wordpress';
import { expectReady } from './support/assertions';
import { expectSabalaReady } from './support/sabala-renderer';
import { expect, test } from './support/site';

const publicOrigin = 'https://sanaka.com.br';
const fixtureId = 'G-TEST000001';
const storageKey = `sanaka.analytics.v1.${fixtureId}`;

async function isolatedAnalytics(page: Page, request: APIRequestContext, baseURL: string) {
  let tagLoads = 0;
  const fixtureOrigin = new URL(baseURL).origin;
  expect(new URL(fixtureOrigin).hostname).toBe('127.0.0.1');
  // The public origin exists only in this browser fixture. Every response is local or simulated.
  await page.route(`${publicOrigin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/security/csp-reports') return route.fulfill({ status: 204 });
    expect(route.request().method()).toBe('GET');
    if (url.pathname === '/api/analytics/config')
      return route.fulfill({ json: { measurementId: fixtureId } });
    const local = await request.get(fixtureOrigin + url.pathname + url.search, { maxRedirects: 0 });
    await route.fulfill({ response: local });
  });
  await page.route('https://www.googletagmanager.com/**', async (route) => {
    expect(new URL(route.request().url()).searchParams.get('id')).toBe(fixtureId);
    tagLoads++;
    await route.fulfill({
      contentType: 'application/javascript',
      body: "document.cookie='sanaka_ga=test; Path=/; Secure'; document.cookie='unrelated=test; Path=/; Secure';",
    });
  });
  return () => tagLoads;
}

function commands(page: Page): Promise<unknown[][]> {
  return page.evaluate(() => {
    const layer = (window as Window & { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? [];
    return layer.map((entry) => Array.from(entry));
  });
}

async function pageViews(page: Page) {
  return (await commands(page)).filter(
    ([action, name]) => action === 'event' && name === 'page_view',
  );
}

test('previews the cookie choice on loopback without loading analytics', async ({ page }) => {
  await page.goto('/');
  const preferences = page.locator('footer details.analytics-preferences');
  const summary = preferences.locator('summary');
  const accept = preferences.getByRole('button', { name: 'Aceitar análise' });
  const decline = preferences.getByRole('button', { name: 'Recusar análise' });
  await expect(accept).toBeVisible();
  await expect(decline).toBeVisible();
  await accept.click();
  await expect(summary).toBeFocused();

  await page.reload();
  await expect(summary).toBeVisible();
  await expect(preferences).not.toHaveAttribute('open');
  await summary.click();
  await expect(accept).toHaveAttribute('aria-pressed', 'true');
  await decline.click();
  await summary.click();
  await expect(decline).toHaveAttribute('aria-pressed', 'true');

  expect(await commands(page)).toEqual([]);
  expect(await page.evaluate(() => document.cookie)).not.toContain('sanaka_ga');
});

test('measures published pages once after consent, filters URL data, and honors withdrawal', async ({
  page,
  request,
  baseURL,
  site,
}) => {
  const tagLoads = await isolatedAnalytics(page, request, baseURL!);
  await page.goto(`${publicOrigin}/posts/${article.slug}?email=synthetic@example.test#editorial`, {
    referer: 'https://origem.example/private?token=synthetic',
  });
  await expectReady(page);
  await expect(page.getByRole('heading', { name: article.title.rendered })).toBeVisible();
  await expect(
    page.getByText(
      'Lembre-se que você aceitou todos os cookies antes de aceitar um corpo físico, hein?',
    ),
  ).toBeVisible();
  const accept = page.getByRole('button', { name: 'Aceitar análise' });
  await expect(accept).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recusar análise' })).toBeVisible();
  expect(tagLoads()).toBe(0);
  expect(await commands(page)).toEqual([]);

  await accept.click();
  await expect
    .poll(() => pageViews(page))
    .toEqual([
      [
        'event',
        'page_view',
        {
          page_location: `${publicOrigin}/posts/${article.slug}`,
          page_referrer: 'https://origem.example/',
          page_title: 'Sanaka',
          send_to: fixtureId,
        },
      ],
    ]);
  expect((await commands(page)).find(([event]) => event === 'config')).toEqual([
    'config',
    fixtureId,
    expect.objectContaining({
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    }),
  ]);
  expect(JSON.stringify(await commands(page))).not.toMatch(/synthetic|editorial|\/private/);
  expect(tagLoads()).toBe(1);

  const mainNav = page.locator('.main-nav');
  await mainNav.getByRole('link', { name: 'Posts' }).click();
  await expectReady(page);
  await expect.poll(async () => (await pageViews(page)).length).toBe(2);
  await page.getByRole('link', { name: 'Newsletter', exact: true }).click();
  await expect(page).toHaveURL(/\/posts#newsletter$/u);
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByText('Cookie preferences', { exact: true })).toBeVisible();
  expect(await pageViews(page)).toHaveLength(2);

  const books = site.holdNext('books');
  await page.getByRole('link', { name: 'Sanaka-loka', exact: true }).click();
  await books.requested;
  await expectSabalaReady(page);
  await books.release();
  await expectReady(page);
  await expect.poll(async () => (await pageViews(page)).length).toBe(3);
  expect((await pageViews(page)).at(-1)?.[2]).toMatchObject({
    page_location: `${publicOrigin}/sanaka-loka`,
  });
  expect(tagLoads()).toBe(1);

  await page.getByText('Cookie preferences', { exact: true }).click();
  await page.getByRole('button', { name: 'Decline analytics' }).click();
  expect(await page.evaluate((id) => Reflect.get(window, `ga-disable-${id}`), fixtureId)).toBe(
    true,
  );
  expect(await page.evaluate(() => document.cookie)).toBe('unrelated=test');
  await mainNav.getByRole('link', { name: 'Matrix' }).click();
  await expect(page).toHaveURL(`${publicOrigin}/matrix`);
  await expectReady(page);
  expect(await pageViews(page)).toHaveLength(3);
  await page.reload();
  await expectReady(page);
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), storageKey))
    .toBe('denied');
  expect(await pageViews(page)).toHaveLength(0);
  expect(tagLoads()).toBe(1);
});

test('leaves collection off after an initial refusal', async ({ page, request, baseURL }) => {
  const tagLoads = await isolatedAnalytics(page, request, baseURL!);
  await page.goto(`${publicOrigin}/`);
  await page.getByRole('button', { name: 'Recusar análise' }).click();
  await page.reload();
  const preferences = page.locator('details.analytics-preferences');
  await expect(preferences).toBeVisible();
  await expect(preferences).not.toHaveAttribute('open');
  expect(tagLoads()).toBe(0);
  expect(await commands(page)).toEqual([]);
});

test('leaves the tag unloaded on an unavailable article, even with saved consent', async ({
  page,
  site,
  request,
  baseURL,
}) => {
  const tagLoads = await isolatedAnalytics(page, request, baseURL!);
  await page.addInitScript(
    ({ origin, key }) => {
      if (location.origin === origin) localStorage.setItem(key, 'granted');
    },
    { origin: publicOrigin, key: storageKey },
  );
  site.emptyNext('article');
  await page.goto(`${publicOrigin}/posts/publicacao-indisponivel?token=synthetic`);
  await expect(page.getByRole('status')).toContainText('Esta publicação não foi encontrada.');
  await expect(page.getByText('Preferências de cookies', { exact: true })).toBeVisible();
  expect(tagLoads()).toBe(0);
  expect(await pageViews(page)).toEqual([]);
  await page.getByRole('link', { name: 'Voltar à biblioteca' }).click();
  await expectReady(page);
  await expect.poll(async () => (await pageViews(page)).length).toBe(1);
  expect(JSON.stringify(await commands(page))).not.toMatch(/publicacao-indisponivel|synthetic/);
});
