import { article, cycles } from './fixtures/wordpress';
import { expect, test } from './support/site';
import {
  expectNativeScroll,
  expectNewsletterDestination,
  expectReady,
  fullPageLoading,
} from './support/assertions';

test('reaches and focuses Newsletter from the footer after the loading finishes', async ({
  page,
  site,
}) => {
  await page.goto('/');
  await expectReady(page);
  const pending = site.holdNext('archive');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Newsletter' }).click();
  await pending.requested;
  await expect(fullPageLoading(page)).toBeVisible();
  await expect(page.locator('#newsletter')).not.toBeFocused();
  await pending.release();
  await expectNewsletterDestination(page);
  // Repeating the same route and fragment must still restore focus.
  await page.getByRole('contentinfo').getByRole('link', { name: 'Newsletter' }).click();
  await expectNewsletterDestination(page);
});

test('keeps both archive pages when the footer opens Newsletter in the same visit', async ({
  page,
  site,
}) => {
  const records = Array.from({ length: 21 }, (_, index) => ({
    ...article,
    id: article.id + index,
    slug: 'fragment-' + index,
    title: { rendered: 'Arquivo ' + index },
  }));
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'X-WP-Total, X-WP-TotalPages',
    'X-WP-Total': '21',
    'X-WP-TotalPages': '2',
  };
  const first = site.holdNext('archive');
  await page.goto('/posts');
  await first.requested;
  await first.release({ json: records.slice(0, 20), headers });
  const next = site.holdNext('archive');
  await page.getByRole('button', { name: 'Carregar mais', exact: true }).click();
  await next.requested;
  await next.release({ json: records.slice(20), headers });
  const cards = page.locator('app-post-card');
  await expect(cards).toHaveCount(21);
  await page.getByRole('contentinfo').getByRole('link', { name: 'Newsletter' }).click();
  await expectNewsletterDestination(page);
  await expect(cards).toHaveCount(21);
  expect(site.count('archive')).toBe(2);
});

test('honors a direct Newsletter fragment after a delayed response', async ({ page, site }) => {
  const pending = site.holdNext('archive');
  await page.goto('/posts#newsletter');
  await pending.requested;
  await expect(fullPageLoading(page)).toBeVisible();
  await pending.release();
  await expectNewsletterDestination(page);
});

test('discards a pending Newsletter fragment when the visitor navigates back', async ({
  page,
  site,
}) => {
  await page.goto('/');
  await expectReady(page);
  const pending = site.holdNext('archive');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Newsletter' }).click();
  await pending.requested;
  await page.goBack();
  await expect(page).toHaveURL('/');
  await pending.release();
  await expectReady(page);
  await expect(page.locator('#newsletter')).toHaveCount(0);
  await expect(page.locator('app-sanctuary-hero h1')).toBeInViewport();
});

for (const reducedMotion of [false, true]) {
  test(`Home scroll respects ${reducedMotion ? 'reduced motion' : 'native smooth scrolling'}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
    await page.goto('/');
    await expectReady(page);
    await expectNativeScroll(
      page,
      page.getByRole('link', { name: 'Rolar para explorar o santuário' }),
      'sanctuary-paths',
      reducedMotion,
    );
  });

  test(`puzzle fragment respects ${reducedMotion ? 'reduced motion' : 'native smooth scrolling'}`, async ({
    page,
    isMobile,
  }) => {
    await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
    await page.goto('/sobre');
    await expectReady(page);
    await page.getByRole('button', { name: cycles[1].title.rendered, exact: true }).click();
    const board = page.locator(isMobile ? 'app-about-puzzle-mobile' : '.about-puzzle__controls');
    const piece = board
      .locator(isMobile ? '.about-puzzle-mobile__piece' : '.about-puzzle__piece')
      .filter({ has: page.getByRole('button', { name: cycles[1].title.rendered, exact: true }) });
    await expectNativeScroll(
      page,
      piece.getByRole('link', { name: 'Fragmento' }),
      'about-story',
      reducedMotion,
    );
    await expect(
      page.locator('#about-story').getByRole('heading', { name: cycles[1].title.rendered }),
    ).toBeVisible();
  });
}
