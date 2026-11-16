import { article } from './fixtures/wordpress';
import { expectReady } from './support/assertions';
import { expect, test } from './support/site';

for (const path of [
  '/',
  '/posts',
  '/posts/paged/1',
  `/posts/${article.slug}`,
  '/matrix',
  '/matrix/rest-api',
  '/samvit',
  '/sobre',
  '/contato',
  '/sanaka-loka',
  '/browser-test-not-found',
]) {
  test(`exposes one global main landmark on ${path}`, async ({ page }) => {
    await page.goto(path);
    // A routed component must be mounted before inspecting its landmarks.
    await expect(page.locator('app-root > main > router-outlet + *')).toBeVisible();
    await expectReady(page);
  });
}

test('keeps Portuguese article content separate from the chosen interface language', async ({
  page,
  site,
}) => {
  await page.goto(`/posts/${article.slug}`);
  const title = page.getByRole('heading', { name: article.title.rendered, exact: true });
  const content = page.locator('.post-reader__content');
  const back = page.locator('.post-detail__back');
  const metadata = page.locator('.post-reader__meta');
  await expect(title).toBeVisible();
  await expectReady(page);

  for (const language of [
    { button: 'EN', tag: 'en', back: 'Back to the library', reading: 'min read' },
    { button: 'PT', tag: 'pt-BR', back: 'Voltar à biblioteca', reading: 'min de leitura' },
  ]) {
    await page.getByRole('button', { name: language.button, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', language.tag);
    await expect(title).toHaveAttribute('lang', 'pt-BR');
    await expect(content).toHaveAttribute('lang', 'pt-BR');
    await expect(title).toHaveText(article.title.rendered);
    await expect(content).toHaveText(
      'Conteúdo editorial de teste, preservado depois da retentativa.',
    );
    await expect(back).toContainText(language.back);
    await expect(metadata).toContainText(language.reading);
    for (const control of [back, metadata]) {
      expect(
        await control.evaluate((element) => element.closest('[lang]')?.getAttribute('lang')),
      ).toBe(language.tag);
    }
  }
  expect(
    site.count('article'),
    'Switching the interface language must not refetch the article.',
  ).toBe(1);
});

test('keeps Portuguese previews while translating archive controls and dates', async ({
  page,
  site,
}) => {
  await page.goto('/posts');
  const card = page.locator('app-post-card').filter({ hasText: article.title.rendered });
  await expect(card).toBeVisible();
  await expectReady(page);
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(card.locator('.post-card__title')).toHaveAttribute('lang', 'pt-BR');
  await expect(card.locator('.post-card__title')).toHaveText(article.title.rendered);
  await expect(card.locator('.post-card__excerpt')).toHaveAttribute('lang', 'pt-BR');
  await expect(card.locator('.post-card__excerpt')).toHaveText('Resumo editorial de teste.');
  await expect(card.locator('time')).toContainText('Jan');
  const category = card.getByRole('link', { name: 'Browse publications in Reflexões' });
  await expect(category).toBeVisible();
  expect(
    await category.evaluate((element) => element.closest('[lang]')?.getAttribute('lang')),
  ).toBe('en');
  expect(
    site.count('archive'),
    'Switching the interface language must not refetch the archive.',
  ).toBe(1);
});
