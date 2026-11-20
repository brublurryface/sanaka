import type { Locator } from '@playwright/test';

import { cycles } from './fixtures/wordpress';
import { expectReady } from './support/assertions';
import { expect, test } from './support/site';

// Read the painted result, including SVG filters and the shade behind the selected text.
async function samplePiece(button: Locator) {
  const screenshot = await button.screenshot({ scale: 'css' });
  return button.page().evaluate(async (png) => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + png;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 2;
    const context = canvas.getContext('2d')!;
    // Average a narrow interior strip at each height to avoid glyph and edge pixels.
    for (const [row, fraction] of [0.15, 0.83].entries()) {
      context.drawImage(
        image,
        image.width * 0.32,
        image.height * fraction,
        image.width * 0.4,
        3,
        0,
        row,
        1,
        1,
      );
    }
    const [red, green, blue, , lowerRed] = context.getImageData(0, 0, 1, 2).data;
    return { red, green, blue, lowerRed };
  }, screenshot.toString('base64'));
}

for (const [index, cycle] of cycles.entries()) {
  test(`puzzle piece ${index + 1} has a resting mask and a readable selected state`, async ({
    page,
    isMobile,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Both sheets receive the same vivid swatch. Any difference must come from the renderer.
    await page.route('**/images/about/about-cycles-sketch*.webp', (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#f06030"/></svg>',
      }),
    );
    await page.goto('/sobre');
    await expectReady(page);
    const selector = (name: string) => page.getByRole('button', { name, exact: true });
    const select = (piece: Locator) => (isMobile ? piece.tap() : piece.click());
    // The first fragment is already selected when the page opens.
    if (index === 0) await select(selector(cycles[1].title.rendered));
    const button = selector(cycle.title.rendered);
    await button.evaluate((el) =>
      el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }),
    );
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    const resting = await samplePiece(button);
    expect(resting.red).toBeGreaterThan(90);
    expect(resting.red).toBeLessThan(160);
    expect(resting.red - resting.blue).toBeLessThan(80);

    await select(button);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#about-story h2')).toHaveText(cycle.title.rendered);
    const selected = await samplePiece(button);
    expect(selected.red).toBeGreaterThan(223);
    expect(selected.red - selected.green).toBeGreaterThan(125);
    expect(selected.lowerRed).toBeLessThan(selected.red - 65);
  });
}
