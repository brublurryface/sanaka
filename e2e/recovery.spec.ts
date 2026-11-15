import { article } from './fixtures/wordpress';
import { expect, test } from './support/site';
import { expectReady, expectShell, fullPageLoading } from './support/assertions';

test('recovers the article after an explicit retry of a temporary failure', async ({
  page,
  site,
}) => {
  site.failNext('article');
  await page.goto(`/posts/${article.slug}`);
  const alert = page.getByRole('alert');
  await expect(alert).toHaveText(/Não foi possível abrir esta publicação/);
  await expectReady(page);
  expect(site.count('article'), 'A failed read must not cause an automatic retry.').toBe(1);
  const retry = site.holdNext('article');
  await alert.getByRole('button', { name: 'Tentar novamente' }).click();
  await retry.requested;
  await expect(fullPageLoading(page)).toHaveAttribute('data-variant', 'maninaga');
  await expectShell(page, false);
  await retry.release();
  await expectReady(page);
  await expect(alert).toHaveCount(0);
  await expect(page.getByRole('heading', { name: article.title.rendered })).toBeVisible();
  await expect(
    page.getByText('Conteúdo editorial de teste, preservado depois da retentativa.'),
  ).toBeVisible();
  expect(site.count('article')).toBe(2);
});

test('recovers the archive without duplicating cards after a failed read', async ({
  page,
  site,
}) => {
  site.failNext('archive');
  await page.goto('/posts');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Não foi possível carregar as publicações.');
  await expectReady(page);
  expect(site.count('archive')).toBe(1);
  const retry = site.holdNext('archive');
  await alert.getByRole('button', { name: 'Tentar novamente' }).click();
  await retry.requested;
  await expect(page.locator('app-loading-indicator[data-variant="vasuki"]')).toBeVisible();
  await retry.release();
  await expect(page.getByRole('heading', { name: article.title.rendered })).toHaveCount(1);
  await expect(alert).toHaveCount(0);
  await expectReady(page);
  expect(site.count('archive')).toBe(2);
});

test('shows a missing article and allows returning to the archive', async ({ page, site }) => {
  site.emptyNext('article');
  await page.goto(`/posts/${article.slug}`);
  await expect(page.getByRole('status')).toContainText('Esta publicação não foi encontrada.');
  await expectReady(page);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('link', { name: 'Voltar à biblioteca' }).click();
  await expect(page).toHaveURL('/posts');
  await expectReady(page);
  await expect(page.getByRole('heading', { name: article.title.rendered })).toBeVisible();
});
