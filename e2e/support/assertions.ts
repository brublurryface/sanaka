import type { Locator, Page } from '@playwright/test';

import { expect } from './site';

export function fullPageLoading(page: Page) {
  return page.locator('app-root > app-loading-indicator');
}

export async function expectShell(page: Page, visible: boolean): Promise<void> {
  for (const selector of ['app-root > header', 'app-root > main', 'app-root > footer']) {
    const element = page.locator(selector);
    if (visible) {
      await expect(element).toBeVisible();
      await expect(element).not.toHaveAttribute('inert');
      await expect(element).not.toHaveAttribute('aria-hidden', 'true');
    } else {
      await expect(element).toBeHidden();
      await expect(element).toHaveAttribute('inert');
      await expect(element).toHaveAttribute('aria-hidden', 'true');
    }
  }
}

export async function expectReady(page: Page): Promise<void> {
  await expect(fullPageLoading(page)).toHaveCount(0);
  await expectShell(page, true);
}

/** Observe the browser's own scrolling, without replacing scrollIntoView or setting a duration. */
export async function expectNativeScroll(
  page: Page,
  link: Locator,
  targetId: string,
  reducedMotion: boolean,
): Promise<void> {
  await link.scrollIntoViewIfNeeded();
  const from = await page.evaluate(() => {
    window.sanakaBrowserProbe.scrollPositions = [];
    return window.scrollY;
  });
  await link.click();
  await expect(page).toHaveURL(new RegExp(`#${targetId}$`));
  try {
    await expect
      .poll(() =>
        page.locator(`#${targetId}`).evaluate((element) => {
          const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
          return Math.abs(element.getBoundingClientRect().top - margin);
        }),
      )
      .toBeLessThan(3);
  } catch (cause) {
    const diagnostic = await page.evaluate(() => ({
      y: window.scrollY,
      history: window.history.state,
      probe: window.sanakaBrowserProbe,
    }));
    throw new Error(`Native anchor did not reach ${targetId}: ${JSON.stringify(diagnostic)}`, {
      cause,
    });
  }
  const result = await page.evaluate(() => ({
    to: window.scrollY,
    positions: window.sanakaBrowserProbe.scrollPositions,
    behavior: getComputedStyle(document.documentElement).scrollBehavior,
  }));
  expect(Math.abs(result.to - from), 'The anchor must cause a meaningful scroll.').toBeGreaterThan(
    40,
  );
  const intermediate = result.positions.filter(
    (position) =>
      position > Math.min(from, result.to) + 2 && position < Math.max(from, result.to) - 2,
  );
  expect(result.behavior).toBe(reducedMotion ? 'auto' : 'smooth');
  if (reducedMotion) expect(intermediate).toEqual([]);
  else
    expect(
      intermediate.length,
      'Native smooth scrolling must pass through intermediate positions.',
    ).toBeGreaterThan(0);
}

export async function expectNewsletterDestination(page: Page): Promise<void> {
  const heading = page.getByRole('heading', { name: 'Sanaka também chega por e-mail.' });
  await expectReady(page);
  await expect(page).toHaveURL(/\/posts#newsletter$/);
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
  await expect
    .poll(async () => {
      const headingBox = await heading.boundingBox();
      const headerBox = await page.getByRole('banner').boundingBox();
      return !!headingBox && !!headerBox && headingBox.y >= headerBox.y + headerBox.height;
    })
    .toBe(true);
}
