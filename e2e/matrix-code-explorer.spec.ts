import { expectReady } from './support/assertions';
import { expect, test } from './support/site';

for (const exhibit of [
  {
    route: 'components',
    heading: 'code-explorer-title',
    level: 3,
    field: '#parent-message',
    result: 2,
  },
  { route: 'rest-api', heading: 'rest-code-title', level: 2, field: '#image-query', result: 3 },
]) {
  test(`preserves accessible code navigation, size and experiment steps in ${exhibit.route}`, async ({
    page,
  }) => {
    if (exhibit.route === 'rest-api') {
      await page.route('https://images-api.nasa.gov/search?**', (route) =>
        route.fulfill({ json: { collection: { items: [], metadata: { total_hits: 0 } } } }),
      );
    }
    await page.goto('/matrix/' + exhibit.route);
    await expectReady(page);
    const frame = page.locator(`section[aria-labelledby="${exhibit.heading}"]`);
    const title = frame.getByRole('heading', { level: exhibit.level });
    await expect(frame).toHaveAccessibleName(await title.innerText());
    const pages = frame.getByRole('group').getByRole('button');
    const snippets = frame.locator('pre');
    const navigation = frame.locator('footer').getByRole('button');
    const live = frame.locator('[aria-live="polite"]');
    const viewport = frame.locator('.code-window__viewport');
    const height = () => viewport.evaluate((element) => element.getBoundingClientRect().height);

    await expect(pages).toHaveCount(4);
    await expect(snippets).toHaveCount(4);
    await expect(pages.first()).toHaveAttribute('aria-current', 'true');
    const initialHeight = await height();
    expect(initialHeight).toBeGreaterThan(0);
    await navigation.first().focus();
    await page.keyboard.press('Enter');
    await expect(navigation.first()).toBeFocused();
    await expect(pages.last()).toHaveAttribute('aria-current', 'true');
    await expect(snippets.last()).toHaveAttribute('tabindex', '0');
    await expect(snippets.first()).toHaveAttribute('aria-hidden', 'true');
    await expect(live).toContainText(await frame.locator('footer > span').innerText());
    expect(Math.abs((await height()) - initialHeight)).toBeLessThanOrEqual(1);

    await navigation.last().click();
    await expect(pages.first()).toHaveAttribute('aria-current', 'true');
    await pages.nth(1).click();
    await expect(pages.nth(1)).toHaveAttribute('aria-current', 'true');
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(frame.getByRole('button', { name: 'View next snippet' })).toBeVisible();
    await expect(
      frame.getByRole('button', { name: 'View snippet 2', exact: true }),
    ).toHaveAttribute('aria-current', 'true');

    const field = page.locator(exhibit.field);
    await field.fill('Sanaka');
    await field.press('Enter');
    await expect(pages.nth(exhibit.result)).toHaveAttribute('aria-current', 'true');
    await expect(frame.locator('pre[aria-hidden="false"][tabindex="0"]')).toHaveCount(1);
  });
}
