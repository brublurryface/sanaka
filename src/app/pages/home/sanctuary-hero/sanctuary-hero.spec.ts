import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Translation, TranslocoLoader, provideTransloco } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageLoadingState } from '../../../core/navigation/page-loading-state';
import { SanctuaryHero } from './sanctuary-hero';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation(_lang: string): Observable<Translation> {
    return of({
      home: {
        hero: {
          eyebrow: 'Sanctuary eyebrow',
          title: {
            line1: 'A line',
            line2: 'united by',
            line3: 'darkness and light.',
          },
          intro: 'Hero intro text.',
          action: {
            enter: 'Find Saṃvit',
            read: 'Enter the sanctuary',
          },
          scroll: {
            ariaLabel: 'Scroll aria label',
            label: 'Scroll label',
          },
        },
      },
    });
  }
}

describe('SanctuaryHero', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SanctuaryHero],
      providers: [
        provideRouter([]),
        provideTransloco({
          config: {
            availableLangs: ['pt-BR', 'en'],
            defaultLang: 'pt-BR',
            fallbackLang: 'pt-BR',
            reRenderOnLangChange: true,
            prodMode: true,
          },
          loader: MockTranslocoLoader,
        }),
      ],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(['success', 'error', 'leave'] as const)(
    'releases the global loading on scene %s, including a late decode',
    async (result) => {
      vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false);
      const fixture = TestBed.createComponent(SanctuaryHero);
      fixture.detectChanges();
      const host: HTMLElement = fixture.nativeElement;
      const image = host.querySelector<HTMLImageElement>('.hero-atmosphere__scene')!;
      const loading = TestBed.inject(PageLoadingState);
      await new Promise(requestAnimationFrame);
      await fixture.whenStable();
      expect(loading.current()?.variant).toBe('nandini');

      let finishDecode!: () => void;
      const decoded = new Promise<void>((resolve, reject) => {
        finishDecode = result === 'error' ? () => reject(new Error('decode')) : resolve;
      });
      Object.defineProperty(image, 'naturalWidth', { value: 1672 });
      image.decode = () => decoded;
      image.dispatchEvent(new Event('load'));
      expect(loading.current()?.variant).toBe('nandini');
      if (result === 'leave') {
        fixture.destroy();
        expect(loading.current()).toBeNull();
      }
      finishDecode();
      await decoded.catch(() => undefined);
      await fixture.whenStable();
      if (result !== 'leave') {
        expect(host.querySelector('section')?.dataset['scene']).toBe(
          result === 'error' ? 'failed' : 'ready',
        );
      }
      expect(loading.current()).toBeNull();
    },
  );

  it('shows the real loading while a downloaded scene is still decoding', async () => {
    let downloaded = false;
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockImplementation(() => downloaded);
    const fixture = TestBed.createComponent(SanctuaryHero);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    const image = host.querySelector<HTMLImageElement>('.hero-atmosphere__scene')!;
    Object.defineProperty(image, 'naturalWidth', { value: 1672 });

    let finishDecode!: () => void;
    image.decode = () =>
      new Promise<void>((resolve) => {
        finishDecode = resolve;
      });

    downloaded = true;
    image.dispatchEvent(new Event('load'));
    await new Promise(requestAnimationFrame);
    await fixture.whenStable();

    const loading = TestBed.inject(PageLoadingState);
    expect(loading.current()?.variant).toBe('nandini');
    finishDecode();
    await fixture.whenStable();
    expect(loading.current()).toBeNull();
    expect(host.querySelector('section')?.dataset['scene']).toBe('ready');
    fixture.destroy();
  });

  it('should be created', () => {
    expect(TestBed.createComponent(SanctuaryHero).componentInstance).toBeTruthy();
  });

  it('should render the sanctuary title', () => {
    const fixture = TestBed.createComponent(SanctuaryHero);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#sanctuary-title')).toBeTruthy();
  });

  it('should highlight darkness and light while keeping the complete title', () => {
    const fixture = TestBed.createComponent(SanctuaryHero);
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('#sanctuary-title') as HTMLElement;
    const highlights = Array.from(title.querySelectorAll('.title-accent')).map((element) =>
      element.textContent?.trim(),
    );

    expect(highlights).toEqual(['darkness and light.']);
    expect(title.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'A line united by darkness and light.',
    );
  });

  it('should present sanctuary entry before finding Samvit, with the correct destinations', () => {
    const fixture = TestBed.createComponent(SanctuaryHero);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll('.hero-actions a'));

    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/posts', '/samvit']);
    expect(links[0].textContent).toContain('Enter the sanctuary');
    expect(links[1].textContent).toContain('Find Saṃvit');
  });

  it('should contain the scroll link and Samvit image alt text', () => {
    const fixture = TestBed.createComponent(SanctuaryHero);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('a[href="/#sanctuary-paths"]')).toBeTruthy();
    expect(element.querySelector('.samvit-character')?.getAttribute('alt')).toBe('Saṃvit');
    expect(element.querySelector('.hero-atmosphere img')?.getAttribute('alt')).toBe('');
  });
});
