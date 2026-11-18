import assert from 'node:assert/strict';
import { once } from 'node:events';
import { chromium, devices } from 'playwright';
import { createWordPressFixture } from '../wordpress-fixture.mjs';
import { startApplication } from './runtime.mjs';

const fixture = createWordPressFixture();
fixture.server.listen(45931, '127.0.0.1');
await once(fixture.server, 'listening');
let application;
let browser;
let passed = 0;
try {
  application = await startApplication('dist/ssr-spike/server/server.mjs', 45933);
  browser = await chromium.launch({ executablePath: process.env['SANAKA_SSR_CHROMIUM_PATH'] });
  for (const [name, device] of [
    ['desktop', { viewport: { width: 1440, height: 900 } }],
    ['mobile', devices['Pixel 7']],
  ]) {
    for (const scenario of [
      'article',
      'not-found',
      'temporary-error',
      'slow-optional',
      'editorial-update',
    ]) {
      fixture.state.policyFailure = false;
      fixture.state.enrichmentFailure = false;
      fixture.state.enrichmentDelayMs = scenario === 'slow-optional' ? 2500 : 0;
      fixture.state.articleVersion = scenario === 'editorial-update' ? 2 : 1;
      fixture.state.unavailableRecovered = false;
      const slug =
        scenario === 'not-found'
          ? 'does-not-exist'
          : scenario === 'temporary-error'
            ? 'cms-unavailable'
            : 'audit-article';
      const context = await browser.newContext({
        ...device,
        locale: 'pt-BR',
        serviceWorkers: 'block',
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const browserReads = [];
      let releaseMain;
      const mainReady = new Promise((resolve) => {
        releaseMain = resolve;
      });
      await context.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === application.origin) {
          if (/\/main-[^/]+\.js$/.test(url.pathname)) await mainReady;
          return route.continue();
        }
        if (url.origin === 'https://cms.sanaka.com.br' && url.pathname.startsWith('/wp-json/')) {
          assert.equal(request.method(), 'GET', 'Browser test must not send an offer or form');
          browserReads.push(`${url.pathname}${url.search}`);
          const local = await fetch(`http://127.0.0.1:45931${url.pathname}${url.search}`, {
            signal: AbortSignal.timeout(15_000),
          });
          return route.fulfill({
            status: local.status,
            headers: Object.fromEntries(local.headers),
            body: await local.text(),
          });
        }
        return route.abort(); // Fonts and other external hosts never reach the network.
      });
      try {
        const response = await page.goto(`${application.origin}/posts/${slug}`, {
          waitUntil: 'commit',
        });
        assert.equal(
          response.status(),
          scenario === 'not-found' ? 404 : scenario === 'temporary-error' ? 503 : 200,
        );
        const initialArticle = await page.$('.post-reader__article');
        if (scenario !== 'not-found' && scenario !== 'temporary-error') {
          await page.waitForSelector('.post-reader__article', { state: 'attached' });
        }
        const original = initialArticle ?? (await page.$('.post-reader__article'));
        releaseMain();
        await page.waitForLoadState('networkidle');
        if (scenario === 'not-found') {
          assert.equal(
            await page.locator('meta[name="robots"]').getAttribute('content'),
            'noindex, nofollow',
          );
          assert.equal(await page.locator('.post-reader__article').count(), 0);
        } else if (scenario === 'temporary-error') {
          await page.getByRole('alert').getByRole('button', { name: 'Tentar novamente' }).waitFor();
          // Change only the fixture result for the same URL; retry stays a client action.
          fixture.state.unavailableRecovered = true;
          await page.getByRole('alert').getByRole('button', { name: 'Tentar novamente' }).click();
          await page.waitForSelector('.post-reader__article');
          assert.equal(
            await page.locator('meta[name="robots"]').getAttribute('content'),
            'index, follow',
          );
        } else {
          assert(
            await original.evaluate((node) => node.isConnected),
            'Hydration must reuse the article DOM',
          );
          const required = browserReads.filter(
            (url) => url.includes('slug=') && !url.includes('/sanaka/v1/'),
          );
          assert.deepEqual(required, [], 'Transferred article and policy GETs must not repeat');
          assert.equal(
            browserReads.filter((url) => url.includes('/sanaka/v1/obolos/')).length,
            1,
            'Counter remains a separate browser read',
          );
          assert.equal(
            await page.title(),
            scenario === 'editorial-update'
              ? 'Artigo de auditoria 1 v2 | Sanaka'
              : 'Artigo de auditoria 1 | Sanaka',
          );
        }
        assert.deepEqual(errors, [], 'No hydration mismatch or uncaught browser error');
        console.log(`PASS ${name}: ${scenario}`);
        passed++;
      } finally {
        releaseMain();
        await context.close();
      }
    }
  }
  console.log(`SSR browser checks: ${passed} passed.`);
} finally {
  await browser?.close();
  await application?.stop();
  fixture.server.closeAllConnections();
  await new Promise((resolve) => fixture.server.close(resolve));
}
