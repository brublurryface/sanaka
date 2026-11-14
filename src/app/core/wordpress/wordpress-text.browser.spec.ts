import { TestBed } from '@angular/core/testing';
import { commands } from 'vitest/browser';

import { WordPressTextService } from './wordpress-text.service';

declare module 'vitest/browser' {
  interface BrowserCommands {
    startWordPressTextProbe(): Promise<void>;
    readWordPressTextProbe(): Promise<readonly string[]>;
    stopWordPressTextProbe(): Promise<void>;
  }
}

const marker = 'data-wordpress-text-executed';
const payloads = [
  '<img src="data:," onerror="document.documentElement.setAttribute(\'data-wordpress-text-executed\',\'image\')"><p>Texto preservado.</p>',
  "<svg onload=\"document.documentElement.setAttribute('data-wordpress-text-executed','svg')\"></svg><p>Texto preservado.</p>",
  '<math><mtext><table><mglyph><style><!--</style><img src="data:," onerror="document.documentElement.setAttribute(\'data-wordpress-text-executed\',\'malformed\')"></math><p>Texto preservado.</p>',
];

/** Aguarda um evento de imagem real e dois frames, sem depender dos timers emulados do JSDOM. */
async function settleBrowserEvents(): Promise<void> {
  const image = new Image();
  const settled = new Promise<void>((resolve) => {
    image.onload = image.onerror = () => resolve();
  });
  image.src = 'data:,';
  await settled;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

describe('WordPress text conversion in a real browser', () => {
  let service: WordPressTextService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WordPressTextService);
    document.documentElement.removeAttribute(marker);
    await commands.startWordPressTextProbe();
  });

  afterEach(async () => {
    await commands.stopWordPressTextProbe();
    document.documentElement.removeAttribute(marker);
  });

  it.each(payloads)('does not execute events from CMS markup (%s)', async (html) => {
    expect(service.toText(html)).toContain('Texto preservado.');
    await settleBrowserEvents();

    expect(document.documentElement.hasAttribute(marker)).toBe(false);
  });

  it('does not load images, source sets, or frames while extracting text', async () => {
    const probe = new URL('/__wordpress_text_probe__/', location.origin).href;
    expect(
      service.toText(
        `<img src="${probe}image.png"><img srcset="${probe}source.png 1x"><iframe src="${probe}frame.html"></iframe><p>Texto preservado.</p>`,
      ),
    ).toBe('Texto preservado.');
    await settleBrowserEvents();

    expect(await commands.readWordPressTextProbe()).toEqual([]);
  });

  it('verifies the request probe against an active image', async () => {
    const image = new Image();
    const settled = new Promise<void>((resolve) => {
      image.onload = image.onerror = () => resolve();
    });
    image.src = new URL('/__wordpress_text_probe__/control.png', location.origin).href;
    await settled;

    expect(await commands.readWordPressTextProbe()).toEqual(['image']);
  });
});
