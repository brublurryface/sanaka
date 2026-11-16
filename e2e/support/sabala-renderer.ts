import type { Page } from '@playwright/test';

import { expect } from './site';

const rendererPath = '/loadings/sabala/hysteria/index.html';
const rendererSelector = `app-root > app-loading-indicator iframe[src="${rendererPath}"]`;

/** Waits for the recovered renderer to show its artwork and paint a functional frame. */
export async function expectSabalaReady(page: Page): Promise<void> {
  await expect(page.locator(rendererSelector)).toBeVisible();
  const frame = page.frameLocator(rendererSelector);
  const artwork = frame.locator('img.sabala:visible');
  await expect(artwork).toBeVisible();
  await expect
    .poll(() =>
      artwork.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  await expect(frame.locator('.word')).toHaveText('LOADING...');
  await expect(frame.locator('.note')).toHaveCount(9);
  await expect(frame.locator('.lines .line')).toHaveCount(2);

  const spectrum = frame.locator('canvas#audio-spectrum');
  await expect(spectrum).toBeVisible();
  await expect
    .poll(() =>
      spectrum.evaluate((canvas: HTMLCanvasElement) => {
        const context = canvas.getContext('2d');
        return (
          context
            ?.getImageData(0, 0, canvas.width, canvas.height)
            .data.some((value, index) => index % 4 === 3 && value > 0) ?? false
        );
      }),
    )
    .toBe(true);
}

/** Removing the node must also dispose of the iframe's browsing context and animation loop. */
export async function expectSabalaRemoved(page: Page): Promise<void> {
  await expect(page.locator(rendererSelector)).toHaveCount(0);
  await expect
    .poll(() => page.frames().some((frame) => new URL(frame.url()).pathname === rendererPath))
    .toBe(false);
}
