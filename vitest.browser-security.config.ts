import { defineBrowserCommand } from '@vitest/browser-playwright';
import type { Page, Route } from 'playwright';
import { defineConfig } from 'vitest/config';

const probePattern = '**/__wordpress_text_probe__/**';
const captures = new WeakMap<
  Page,
  { readonly requests: string[]; readonly handler: (route: Route) => Promise<void> }
>();

/** Os pedidos de prova ficam no navegador de teste e nunca alcançam o CMS. */
export default defineConfig({
  test: {
    browser: {
      commands: {
        startWordPressTextProbe: defineBrowserCommand(async ({ page }) => {
          const requests: string[] = [];
          const handler = async (route: Route) => {
            requests.push(route.request().resourceType());
            await route.fulfill({ status: 404, body: '', contentType: 'text/plain' });
          };
          captures.set(page, { requests, handler });
          await page.route(probePattern, handler);
        }),
        readWordPressTextProbe: defineBrowserCommand(async ({ page }) => {
          const capture = captures.get(page);
          if (!capture) throw new Error('The HTML conversion probe was not started.');
          return [...capture.requests];
        }),
        stopWordPressTextProbe: defineBrowserCommand(async ({ page }) => {
          const capture = captures.get(page);
          if (!capture) return;
          await page.unroute(probePattern, capture.handler);
          captures.delete(page);
        }),
      },
    },
  },
});
