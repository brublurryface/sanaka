import { article } from './fixtures/wordpress';
import { expect, test, type RequestKind } from './support/site';
import { expectReady, expectShell, fullPageLoading } from './support/assertions';
import { expectSabalaReady, expectSabalaRemoved } from './support/sabala-renderer';

const routes: readonly { path: string; kind: RequestKind; variant: string; content: string }[] = [
  { path: '/posts', kind: 'archive', variant: 'vasuki', content: article.title.rendered },
  {
    path: `/posts/${article.slug}`,
    kind: 'article',
    variant: 'maninaga',
    content: article.title.rendered,
  },
  { path: '/sobre', kind: 'cycles', variant: 'samvit', content: 'I — Fragmento de teste' },
  { path: '/sanaka-loka', kind: 'books', variant: 'sabala', content: 'Volume de teste' },
];

for (const route of routes) {
  test(`keeps the entire shell hidden until ${route.path} is ready`, async ({ page, site }) => {
    const pending = site.holdNext(route.kind);
    await page.goto(route.path);
    await pending.requested;
    const loading = fullPageLoading(page);
    await expect(loading).toBeVisible();
    await expect(loading).toHaveAttribute('data-variant', route.variant);
    await expectShell(page, false);
    if (route.variant === 'sabala') {
      await expectSabalaReady(page);
    } else {
      await expect
        .poll(() =>
          loading
            .locator('img')
            .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
        )
        .toBe(true);
    }
    await expect
      .poll(() => page.evaluate(() => window.sanakaBrowserProbe.loadingFrames))
      .toBeGreaterThan(1);
    expect(await page.evaluate(() => window.sanakaBrowserProbe.exposedShell)).toEqual([]);
    await pending.release();
    await expectReady(page);
    if (route.kind === 'books') {
      await expect(page.getByRole('link', { name: new RegExp(route.content) })).toBeVisible();
      await expectSabalaRemoved(page);
    } else {
      await expect(page.getByRole('heading', { name: route.content, exact: true })).toBeVisible();
    }
    expect(await page.evaluate(() => window.sanakaBrowserProbe.exposedShell)).toEqual([]);
  });
}

test('fits the revised Maṇināga animation and reduced-motion poster at their own proportions', async ({
  page,
  site,
}) => {
  const pending = site.holdNext('article');
  await page.goto(`/posts/${article.slug}`);
  await pending.requested;
  const artwork = fullPageLoading(page).locator('img');

  for (const [reducedMotion, filename, width, height] of [
    ['no-preference', 'animated.apng', 734, 188],
    ['reduce', 'poster.png', 730, 243],
  ] as const) {
    await page.emulateMedia({ reducedMotion });
    await expect
      .poll(() =>
        artwork.evaluate((image: HTMLImageElement) => ({
          loaded: image.complete,
          path: image.currentSrc ? new URL(image.currentSrc).pathname : '',
          width: image.naturalWidth,
          height: image.naturalHeight,
        })),
      )
      .toEqual({ loaded: true, path: `/loadings/maninaga/${filename}`, width, height });
    await expect(artwork).toBeInViewport({ ratio: 0.99 });
    const bounds = (await artwork.boundingBox())!;
    expect(bounds.width / bounds.height).toBeCloseTo(width / height, 2);
  }

  await pending.release();
  await expectReady(page);
});

test('waits for the category tree even when the posts response has already arrived', async ({
  page,
  site,
}) => {
  const categories = site.holdNext('categories');
  await page.goto('/posts');
  await categories.requested;
  await expect.poll(() => site.count('archive')).toBe(1);
  await expect(fullPageLoading(page)).toBeVisible();
  await expectShell(page, false);
  await categories.release();
  await expectReady(page);
  await expect(page.getByLabel('Categoria', { exact: true })).toBeEnabled();
  await expect(page.getByRole('heading', { name: article.title.rendered })).toBeVisible();
});

for (const route of routes.filter((item) => item.kind !== 'article')) {
  test(`removes ${route.variant} and ignores the late response after navigating back`, async ({
    page,
    site,
  }) => {
    await page.goto('/');
    await expectReady(page);
    const pending = site.holdNext(route.kind);
    await page.locator(`app-sanctuary-paths a[href="${route.path}"]`).click();
    await pending.requested;
    await expect(fullPageLoading(page)).toBeVisible();
    if (route.variant === 'sabala') await expectSabalaReady(page);
    await page.goBack();
    await expect(page).toHaveURL('/');
    await expectReady(page);
    await pending.release();
    await expect(page.locator('app-sanctuary-hero h1')).toBeVisible();
    await expect(fullPageLoading(page)).toHaveCount(0);
    await expect(page.getByText(route.content, { exact: true })).toHaveCount(0);
    if (route.variant === 'sabala') await expectSabalaRemoved(page);
  });
}
