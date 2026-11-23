import type { Page, Route } from '@playwright/test';

import { expectReady, expectShell, fullPageLoading } from './support/assertions';
import { deferred, expect, test } from './support/site';

const scenePath = '/images/home/sanctuary-hero.png';
const hero = '.sanctuary-hero';

async function holdFile(page: Page, match: string | RegExp) {
  const pending = deferred<{
    continue: () => Promise<void>;
    abort: (errorCode?: Parameters<Route['abort']>[0]) => Promise<void>;
  }>();

  await page.route(
    match,
    async (route) => {
      // Keep the handler alive until the test explicitly settles the request.
      // Otherwise Playwright falls through to the context-wide route handler.
      const released = deferred<void>();
      pending.resolve({
        continue: async () => {
          try {
            await route.continue();
          } finally {
            released.resolve();
          }
        },
        abort: async (errorCode) => {
          try {
            await route.abort(errorCode);
          } finally {
            released.resolve();
          }
        },
      });
      await released.promise;
    },
    { times: 1 },
  );
  return pending;
}

function observeNandini(page: Page) {
  const paths: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/loadings/nandini/')) paths.push(path);
  });
  return paths;
}

for (const motion of ['no-preference', 'reduce'] as const) {
  test(`shows only the selected Nandinī for a pending scene with ${motion} motion`, async ({
    page,
    browserName,
  }) => {
    await page.emulateMedia({ reducedMotion: motion });
    const paths = observeNandini(page);
    const held = await holdFile(page, '**' + scenePath);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const scene = await held.promise;
    const loading = fullPageLoading(page);
    await expect(loading).toHaveAttribute('data-variant', 'nandini');
    await expect(loading).toHaveAttribute('role', 'status');
    await expect(loading).toHaveText('Carregando o santuário. Nandinī está sonhando.');
    await expectShell(page, false);
    await expect(page.locator('.samvit-stage')).toBeHidden();

    const filename = motion === 'reduce' ? 'poster.png' : 'animated.webp';
    const selected = '/loadings/nandini/' + filename;
    const art = loading.locator('img');
    await expect
      .poll(() =>
        art.evaluate((image: HTMLImageElement) => [
          new URL(image.currentSrc || location.href).pathname,
          image.naturalWidth,
          image.naturalHeight,
        ]),
      )
      .toEqual([selected, 1600, 900]);
    await expect(art).toBeInViewport({ ratio: 0.99 });
    const bounds = (await art.boundingBox())!;
    expect(bounds.width / bounds.height).toBeCloseTo(16 / 9, 2);
    expect([...new Set(paths)]).toEqual([selected]);

    if (motion === 'no-preference') {
      if (browserName === 'webkit') {
        // Playwright's WebKit screenshot backend stalls on the animated WebP.
        // The browser has selected and decoded it above; inspect the served
        // RIFF frames here while Chromium verifies visual frame progression.
        const response = await page.request.get(selected);
        expect(response.ok()).toBe(true);
        const webp = await response.body();
        expect(webp.toString('ascii', 0, 4)).toBe('RIFF');
        expect(webp.toString('ascii', 8, 12)).toBe('WEBP');
        let frames = 0;
        let duration = 0;
        let offset = 12;
        while (offset + 8 <= webp.length) {
          const chunk = webp.toString('ascii', offset, offset + 4);
          const size = webp.readUInt32LE(offset + 4);
          if (chunk === 'ANMF') {
            frames += 1;
            duration += webp.readUIntLE(offset + 20, 3);
          }
          offset += 8 + size + (size & 1);
        }
        expect(frames).toBe(68);
        expect(duration).toBe(6400);
      } else {
        // With the scene held, actual screenshots prove frame progression.
        const viewport = page.viewportSize()!;
        const clip = {
          x: Math.max(0, Math.floor(bounds.x)),
          y: Math.max(0, Math.floor(bounds.y)),
          width: Math.min(
            viewport.width - Math.max(0, Math.floor(bounds.x)),
            Math.floor(bounds.width),
          ),
          height: Math.min(
            viewport.height - Math.max(0, Math.floor(bounds.y)),
            Math.floor(bounds.height),
          ),
        };
        const frame = () => page.screenshot({ clip, scale: 'css', animations: 'allow' });
        const first = await frame();
        await expect.poll(async () => first.equals(await frame())).toBe(false);
      }
    }

    // A geometria é comparada diretamente, sem depender de document.fonts.ready,
    // que pode permanecer pendente no WebKit mesmo após a renderização do texto.
    const section = page.locator(hero);
    const layout = () =>
      section.evaluate((el) => [
        el.getBoundingClientRect().height,
        el.querySelector('.samvit-stage')!.getBoundingClientRect().height,
        document.querySelector('app-sanctuary-paths')!.getBoundingClientRect().top,
      ]);
    const before = await layout();
    await scene.continue();
    await expect(section).toHaveAttribute('data-scene', 'ready');
    await expectReady(page);
    await expect(page.locator('.samvit-stage')).toBeVisible();
    const after = await layout();
    after.forEach((value, index) => expect(Math.abs(value - before[index])).toBeLessThanOrEqual(1));
    expect(await page.evaluate(() => window.sanakaBrowserProbe.exposedShell)).toEqual([]);
  });
}

test('keeps Saṃvit behind the scene before hydration and skips Nandinī for ready artwork', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const paths = observeNandini(page);

  // Delay bootstrap at the document boundary, not through the module-preload
  // request (which may already be handled by the browser in Chromium/WebKit).
  // The production server and application code remain untouched.
  let bootstrapScript = '';
  await page.route(
    '**/',
    async (route) => {
      const response = await route.fetch();
      const html = await response.text();
      const match = html.match(/<script src="(main-[\w-]+\.js)" type="module"><\/script>/u);
      if (!match) throw new Error('Production HTML does not contain the Angular entry script');
      bootstrapScript = match[1];
      await route.fulfill({ response, body: html.replace(match[0], '') });
    },
    { times: 1 },
  );

  const held = await holdFile(page, '**' + scenePath);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(bootstrapScript).toMatch(/^main-[\w-]+\.js$/u);
  const scene = await held.promise;
  await expect(page.locator(hero)).toHaveAttribute('data-scene', 'initial');
  await expect
    .poll(() =>
      page.locator('.samvit-character').evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBe(900);
  await expect(page.locator('.samvit-stage')).toBeHidden();
  await scene.continue();
  await page
    .locator('.hero-atmosphere__scene')
    .evaluate((image: HTMLImageElement) => image.decode());

  // Start the unmodified production Angular entry only after the scene decoded.
  await page.evaluate((src) => {
    const script = document.createElement('script');
    script.src = src;
    script.type = 'module';
    document.body.append(script);
  }, bootstrapScript);
  await expect(page.locator(hero)).toHaveAttribute('data-scene', 'ready');
  await expectReady(page);
  await expect(page.locator('.samvit-stage')).toBeVisible();
  expect(paths).toEqual([]);
});

test('skips the loading when returning to a decoded scene in the same document', async ({
  page,
}) => {
  await page.goto('/contato');
  await expectReady(page);
  await page.evaluate(async (url) => {
    const image = new Image();
    image.hidden = true;
    image.src = url;
    document.body.append(image);
    await image.decode();
  }, scenePath);
  const paths = observeNandini(page);
  await page.locator('header nav a[href="/"]').click();
  await expect(page.locator(hero)).toHaveAttribute('data-scene', 'ready');
  await expectReady(page);
  expect(paths).toEqual([]);
});

test('releases the page after a broken backdrop and leaves its navigation usable', async ({
  page,
}) => {
  const held = await holdFile(page, '**' + scenePath);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(fullPageLoading(page)).toHaveAttribute('data-variant', 'nandini');
  await (await held.promise).abort('failed');
  await expect(page.locator(hero)).toHaveAttribute('data-scene', 'failed');
  await expectReady(page);
  await expect(page.locator('.samvit-stage')).toBeHidden();
  await page.locator('.hero-actions a[href="/posts"]').click();
  await expect(page).toHaveURL(/\/posts$/u);
  await expectReady(page);
});

test('releases Nandinī on back navigation and ignores the late scene response', async ({
  page,
}) => {
  await page.goto('/contato');
  await expectReady(page);
  const held = await holdFile(page, '**' + scenePath);
  await page
    .getByRole('navigation')
    .first()
    .getByRole('link', { name: 'Home', exact: true })
    .click();
  const scene = await held.promise;
  await expect(fullPageLoading(page)).toHaveAttribute('data-variant', 'nandini');
  await page.goBack();
  await expect(page).toHaveURL(/\/contato$/u);
  await expectReady(page);
  await scene.continue();
  await expect(page.locator('app-sanctuary-hero')).toHaveCount(0);
  await expectReady(page);
});

test.describe('prerender', () => {
  test.use({ javaScriptEnabled: false });
  test('serves the sanctuary content and links with JavaScript disabled', async ({ page }) => {
    const paths = observeNandini(page);
    await page.goto('/');
    await expect(page.locator('#sanctuary-title')).toBeVisible();
    await expect(page.locator('.samvit-stage')).toBeVisible();
    await expect(page.locator('.hero-actions a[href="/posts"]')).toBeVisible();
    await expectReady(page);
    expect(paths).toEqual([]);
  });
});
