import type { APIResponse } from '@playwright/test';

import { article } from './fixtures/wordpress';
import { expectReady } from './support/assertions';
import { expectSabalaReady, expectSabalaRemoved } from './support/sabala-renderer';
import { expect, test } from './support/site';

function expectHeaders(response: APIResponse): void {
  const headers = response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['x-frame-options']).toBe('SAMEORIGIN');
  expect(headers['content-security-policy']).toBe("frame-ancestors 'self'");
  expect(headers['content-security-policy-report-only']).toContain("script-src 'self'");
  expect(headers['content-security-policy-report-only']).toContain('report-to csp');
  expect(headers['reporting-endpoints']).toBe('csp="/api/security/csp-reports"');
}

test('keeps headers and resource MIME types on the built Angular and Express server', async ({
  request,
}) => {
  for (const path of [
    '/',
    '/posts',
    `/posts/${article.slug}`,
    '/sobre',
    '/sanaka-loka',
    '/matrix',
    '/contato',
    '/loadings/sabala/hysteria/index.html',
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expectHeaders(response);
    expect(response.headers()['content-type']).toContain('text/html');
  }
  for (const [path, mime] of [
    ['/loadings/sabala/hysteria/hysteria.js', 'javascript'],
    ['/loadings/sabala/hysteria/hysteria.css', 'text/css'],
    ['/loadings/sabala/animated.webp', 'image/webp'],
    ['/loadings/sabala/poster.png', 'image/png'],
    ['/favicon.ico', 'image/'],
    ['/i18n/pt-BR.json', 'application/json'],
    ['/sitemap.xml', 'xml'],
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expectHeaders(response);
    expect(response.headers()['content-type']).toContain(mime);
  }

  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expectHeaders(robots);
  expect(robots.headers()['content-type']).toContain('text/plain');
  expect(robots.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(await robots.text()).not.toContain('Sitemap:');

  const health = await request.get('/api/health');
  expectHeaders(health);
  expect(await health.json()).toEqual({ status: 'ok' });
  expect(health.headers()['cache-control']).toBe('no-store');

  const missing = await request.get('/browser-security-missing');
  expect(missing.status()).toBe(404);
  expectHeaders(missing);
  expect(missing.headers()['cache-control']).toBe('no-store');

  const redirect = await request.get('/maya', { maxRedirects: 0 });
  expect(redirect.status()).toBe(301);
  expect(redirect.headers()['location']).toBe('/samvit');
  expectHeaders(redirect);

  // Malformed JSON is rejected by the contact parser before SMTP can be reached.
  const contact = await request.post('/api/contact', {
    headers: { 'Content-Type': 'application/json' },
    data: '{"invalid":',
  });
  expect(contact.status()).toBe(400);
  expectHeaders(contact);
  expect(await contact.json()).toEqual({ delivered: false });
});

test('observes an inline script violation while keeping Angular interactive', async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      if (event.blockedURI === 'inline' && event.effectiveDirective.startsWith('script-src')) {
        document.documentElement.dataset['observedScriptPolicy'] = event.disposition;
      }
    });
  });
  await page.goto('/');
  await expectReady(page);
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = "document.documentElement.dataset.inlineProbe = 'executed';";
    document.head.append(script);
  });
  await expect(page.locator('html')).toHaveAttribute('data-inline-probe', 'executed');
  await expect(page.locator('html')).toHaveAttribute('data-observed-script-policy', 'report');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expectReady(page);
});

for (const reducedMotion of [false, true]) {
  test(`allows original Śabala with reduced motion ${reducedMotion}`, async ({ page, site }) => {
    await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
    const books = site.holdNext('books');
    const frameResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/loadings/sabala/hysteria/index.html',
    );
    await page.goto('/sanaka-loka');
    await books.requested;
    expect((await frameResponse).headers()['x-frame-options']).toBe('SAMEORIGIN');
    await expectSabalaReady(page, { reducedMotion });
    const frame = page.frameLocator('app-root > app-loading-indicator iframe');
    await expect(frame.locator(reducedMotion ? 'img.still' : 'img.animated')).toBeVisible();
    await expect(frame.locator(reducedMotion ? 'img.animated' : 'img.still')).toBeHidden();
    if (reducedMotion) {
      await expect(frame.locator('.word')).toHaveCSS('animation-name', 'none');
    }
    await books.release();
    await expectReady(page);
    await expectSabalaRemoved(page);
  });
}

test('blocks cross-origin framing of Śabala', async ({ page, request, baseURL, context }) => {
  const parent = new URL('/cross-origin-frame-test', baseURL);
  parent.port = String(Number(parent.port) + 1);
  // The fulfilled parent has no server address space; permit its controlled loopback request.
  await context.grantPermissions(['local-network-access'], { origin: parent.origin });
  const renderer = new URL('/loadings/sabala/hysteria/index.html', baseURL).href;
  const response = await request.get(renderer);
  expect(response.status()).toBe(200);
  expectHeaders(response);
  await page.route(parent.href, async (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><title>Controlled parent</title><link rel="icon" href="data:,"><iframe src="${renderer}"></iframe>`,
    }),
  );
  // Chromium can reject a frame before Playwright emits a response event.
  const blocked = page.waitForEvent('requestfailed', {
    predicate: (entry) => entry.url() === renderer,
    timeout: 8_000,
  });
  await page.goto(parent.href);
  expect((await blocked).failure()?.errorText).toBe('net::ERR_BLOCKED_BY_RESPONSE');
  await expect(page.frameLocator('iframe').locator('.stage')).toHaveCount(0);
});

test('limits cross-origin referrers to the origin', async ({ page, baseURL }) => {
  await page.goto('/?synthetic-referrer=private-test-value');
  await expectReady(page);
  const referrers: Record<string, string | undefined> = {};
  const local = new URL('/referrer-local-probe', baseURL).href;
  const remote = 'https://cms.sanaka.com.br/referrer-remote-probe';
  for (const url of [local, remote]) {
    await page.route(url, async (route) => {
      referrers[url] = route.request().headers()['referer'];
      await route.fulfill({ status: 200, body: '' });
    });
  }
  await page.evaluate(
    async ({ local, remote }) => {
      await fetch(local);
      await fetch(remote, { mode: 'no-cors' });
    },
    { local, remote },
  );
  expect(referrers[local]).toBe(page.url());
  expect(referrers[remote]).toBe(new URL('/', baseURL).href);
});
