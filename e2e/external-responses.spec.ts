import { article } from './fixtures/wordpress';
import { expectReady, fullPageLoading } from './support/assertions';
import { expect, test, type RequestKind } from './support/site';

const collections: readonly {
  path: string;
  kind: RequestKind;
  visibleContent: string;
}[] = [
  { path: '/posts', kind: 'archive', visibleContent: article.title.rendered },
  { path: `/posts/${article.slug}`, kind: 'article', visibleContent: article.title.rendered },
  { path: '/sanaka-loka', kind: 'books', visibleContent: 'Volume de teste' },
  { path: '/sobre', kind: 'cycles', visibleContent: 'I — Fragmento de teste' },
];

for (const collection of collections) {
  test(`recovers ${collection.path} after malformed HTTP 200 JSON`, async ({ page, site }) => {
    const malformed = site.holdNext(collection.kind);
    await page.goto(collection.path);
    await malformed.requested;
    await expect(fullPageLoading(page)).toBeVisible();
    await malformed.release({ json: { unexpected: 'object instead of collection' } });
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expectReady(page);
    expect(site.count(collection.kind)).toBe(1);
    if (collection.kind === 'article') {
      await expect(page.getByText('Esta publicação não foi encontrada.')).toHaveCount(0);
    }
    const retry = site.holdNext(collection.kind);
    await alert.getByRole('button').click();
    await retry.requested;
    await retry.release();
    await expect(alert).toHaveCount(0);
    await expectReady(page);
    if (collection.kind === 'books') {
      await expect(
        page.getByRole('link', { name: new RegExp(collection.visibleContent) }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole('heading', { name: collection.visibleContent, exact: true }),
      ).toBeVisible();
    }
    expect(site.count(collection.kind)).toBe(2);
  });
}

test('does not query publications until a malformed editorial boundary is revalidated', async ({
  page,
  site,
}) => {
  const policy = site.holdNext('policy');
  await page.goto('/posts');
  await policy.requested;
  await policy.release({ json: { unexpected: 'policy' } });
  const alert = page.locator('.posts-feedback[role="alert"]');
  await expect(alert).toBeVisible();
  await expectReady(page);
  expect(site.count('archive')).toBe(0);
  await alert.getByRole('button').click();
  await expect(page.getByRole('heading', { name: article.title.rendered })).toBeVisible();
  const categoryFeedback = page.locator('.posts-filters__feedback[role="alert"]');
  await expect(categoryFeedback).toBeVisible();
  await categoryFeedback.getByRole('button').click();
  await expect(categoryFeedback).toHaveCount(0);
  await expect(alert).toHaveCount(0);
  expect(site.count('archive')).toBe(1);
  expect(site.count('policy')).toBe(2);
});

test('retains the reader when optional category JSON is malformed', async ({ page, site }) => {
  const categories = site.holdNext('categories');
  await page.goto(`/posts/${article.slug}`);
  await categories.requested;
  await expectReady(page);
  await categories.release({ json: { unexpected: 'categories' } });
  await expect(page.getByRole('heading', { name: article.title.rendered })).toBeVisible();
  await expect(page.locator('.post-reader__content')).toContainText(
    'Conteúdo editorial de teste, preservado depois da retentativa.',
  );
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(site.count('article')).toBe(1);
});

test('retries a malformed NASA search instead of presenting a false empty result', async ({
  page,
  request,
}) => {
  const preview = 'https://images-assets.nasa.gov/image/browser-test/browser-test~thumb.jpg';
  const existingArtwork = await request.get('/images/posts/temple/hamsa.svg');
  expect(existingArtwork.status()).toBe(200);
  const artwork = await existingArtwork.body();
  await page.route(preview, async (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: artwork }),
  );
  let searches = 0;
  await page.route('https://images-api.nasa.gov/search?**', async (route) => {
    expect(route.request().method()).toBe('GET');
    searches++;
    await route.fulfill({
      json:
        searches === 1
          ? { collection: { items: {} } }
          : {
              collection: {
                items: [
                  {
                    data: [
                      {
                        nasa_id: 'browser-test',
                        title: 'Imagem NASA de teste',
                        media_type: 'image',
                      },
                    ],
                    links: [{ rel: 'preview', render: 'image', href: preview }],
                  },
                ],
                metadata: { total_hits: 1 },
              },
            },
    });
  });
  await page.goto('/matrix/rest-api');
  await expectReady(page);
  await page.locator('#image-query').fill('browser test query');
  await page.locator('.portal-controls__submit').click();
  const portal = page.locator('app-arcane-portal');
  await expect(portal.locator('.portal--error')).toBeVisible();
  await expect(portal.locator('.portal--empty')).toHaveCount(0);
  expect(searches).toBe(1);
  await portal.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(portal.locator('.portal--success')).toBeVisible();
  await expect(portal.locator('.portal__image--ready')).toBeVisible();
  await expect(portal.getByRole('heading', { name: 'Imagem NASA de teste' })).toBeVisible();
  expect(searches).toBe(2);
});

test('keeps newsletter input and consent until the server confirms a request', async ({
  page,
  site,
  baseURL,
}) => {
  const availability = site.holdNext('newsletter');
  await page.goto('/posts#newsletter');
  await availability.requested;
  await availability.release({ json: { available: 'false' } });
  const section = page.locator('app-newsletter-signup');
  await expect(section.locator('form')).toHaveCount(0);

  const retry = site.holdNext('newsletter');
  await section.getByRole('button').click();
  await retry.requested;
  await retry.release({ json: { available: true } });
  const email = section.locator('input[type=email]');
  const consent = section.getByRole('checkbox');
  await email.fill('reader@example.test');
  await consent.check();
  let submits = 0;
  await page.route(new URL('/api/newsletter', baseURL).href, async (route) => {
    expect(route.request().method()).toBe('POST');
    submits++;
    await route.fulfill({ status: 202, json: { accepted: submits === 1 ? 'false' : true } });
  });
  await section.getByRole('button', { name: /Assinar/ }).click();
  await expect(section.locator('[aria-live]')).toContainText(
    'Ainda não foi possível confirmar o pedido.',
  );
  await expect(email).toHaveValue('reader@example.test');
  await expect(consent).toBeChecked();
  expect(submits).toBe(1);
  await section.getByRole('button', { name: /Assinar/ }).click();
  await expect(section.getByRole('status')).toContainText('Pedido recebido.');
  await expect(section.locator('form')).toHaveCount(0);
  expect(submits).toBe(2);
});
