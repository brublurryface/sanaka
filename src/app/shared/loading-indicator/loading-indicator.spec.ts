import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingVariant } from './loading-artwork';
import { LoadingIndicator } from './loading-indicator';

describe('LoadingIndicator', () => {
  let fixture: ComponentFixture<LoadingIndicator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoadingIndicator] }).compileComponents();
    fixture = TestBed.createComponent(LoadingIndicator);
    fixture.componentRef.setInput('label', 'Reunindo fragmentos de Sanaka');
  });

  function render(variant: LoadingVariant): HTMLElement {
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it.each([
    ['vasuki', 'apng', 734, 188],
    ['maninaga', 'webp', 734, 188],
    ['sabala', 'webp', 460, 460],
    ['samvit', 'webp', 1500, 760],
  ] as const)(
    'should select only %s with a static, SSR-safe reduced-motion fallback',
    (variant, extension, width, height) => {
      const host = render(variant);
      const image = host.querySelector('img');
      const source = host.querySelector('source');

      expect(host.querySelectorAll('img')).toHaveLength(1);
      expect(source?.getAttribute('srcset')).toBe(`/loadings/${variant}/animated.${extension}`);
      expect(source?.getAttribute('media')).toBe('(prefers-reduced-motion: no-preference)');
      expect(image?.getAttribute('src')).toBe(`/loadings/${variant}/poster.png`);
      expect(image?.width).toBe(width);
      expect(image?.height).toBe(height);
      expect(image?.alt).toBe('');
      expect(host.querySelector('.loading-stage')?.getAttribute('aria-hidden')).toBe('true');
      expect(host.getAttribute('role')).toBe('status');
      expect(host.getAttribute('aria-live')).toBe('polite');
      expect(host.getAttribute('aria-atomic')).toBe('true');
      expect(host.querySelector('[role="status"]')).toBeNull();
      expect(host.querySelector('.loading-label')?.textContent).toBe(
        'Reunindo fragmentos de Sanaka',
      );
    },
  );

  it.each(['vasuki', 'maninaga'] as const)(
    'should keep the %s word below the artwork layer',
    (variant) => {
      const host = render(variant);
      const stage = host.querySelector('.loading-stage');

      expect(stage?.getAttribute('data-kind')).toBe('snake');
      expect(stage?.firstElementChild?.textContent).toBe('LOADING...');
      expect(stage?.lastElementChild?.tagName).toBe('PICTURE');
      expect(host.querySelector('.music-word')).toBeNull();
    },
  );

  it('should decorate Śabala with one whole word, two waves and nine differently colored notes', () => {
    const host = render('sabala');
    const notes = [...host.querySelectorAll<HTMLElement>('.music-note')];

    expect(host.querySelectorAll('.music-word-track')).toHaveLength(1);
    expect(host.querySelectorAll('.music-word')).toHaveLength(1);
    expect(
      [...host.querySelectorAll('.music-letter')].map((letter) => letter.textContent).join(''),
    ).toBe('LOADING...');
    expect(host.querySelectorAll('.music-wave')).toHaveLength(2);
    expect(notes).toHaveLength(9);
    expect(new Set(notes.map((note) => note.style.color)).size).toBe(9);
    expect(new Set(notes.map((note) => `${note.style.left},${note.style.top}`)).size).toBe(9);
    expect(host.querySelector('audio')).toBeNull();
  });

  it('should leave Saṃvit and her footprints entirely inside the approved image', () => {
    const host = render('samvit');

    expect(host.querySelector('.loading-stage')?.children).toHaveLength(1);
    expect(host.textContent).not.toContain('LOADING');
    expect(host.querySelector('svg')).toBeNull();
  });

  it('should start decorations when the image loads, without delaying the data request', () => {
    const host = render('vasuki');
    const stage = host.querySelector('.loading-stage');
    expect(stage?.classList.contains('loading-stage--ready')).toBe(false);

    host.querySelector('img')?.dispatchEvent(new Event('load'));
    fixture.detectChanges();
    expect(stage?.classList.contains('loading-stage--ready')).toBe(true);

    render('maninaga');
    expect(stage?.classList.contains('loading-stage--ready')).toBe(false);
  });

  it('should keep an accessible message after image failure and recover for another variant', () => {
    const host = render('vasuki');
    host.querySelector('img')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(host.querySelector('picture')).toBeNull();
    expect(host.textContent?.trim()).toBe('Reunindo fragmentos de Sanaka');
    expect(host.getAttribute('role')).toBe('status');

    render('samvit');
    expect(host.querySelector('img')?.getAttribute('src')).toBe('/loadings/samvit/poster.png');
  });

  it('should support a compact pagination indicator and update its translated message', () => {
    const host = render('sabala');
    fixture.componentRef.setInput('compact', true);
    fixture.componentRef.setInput('label', 'Loading books…');
    fixture.detectChanges();

    expect(host.classList.contains('loading-indicator--compact')).toBe(true);
    expect(host.querySelector('.loading-label')?.textContent).toBe('Loading books…');
  });
});
