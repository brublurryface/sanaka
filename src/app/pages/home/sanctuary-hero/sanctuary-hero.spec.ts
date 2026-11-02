import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Translation, TranslocoLoader, provideTransloco } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
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
            darkness: 'darkness',
            line3: 'and light',
          },
          intro: 'Hero intro text.',
          action: {
            enter: 'Enter',
            read: 'Read',
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

    expect(highlights).toEqual(['darkness', 'and light']);
    expect(title.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'A line united by darkness and light',
    );
  });

  it('should contain the destination links', () => {
    const fixture = TestBed.createComponent(SanctuaryHero);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll('a'));

    expect(links.map((link) => link.getAttribute('href'))).toContain('/samvit');
    expect(links.map((link) => link.getAttribute('href'))).toContain('/posts');
  });

  it('should contain the scroll link and Samvit image alt text', () => {
    const fixture = TestBed.createComponent(SanctuaryHero);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('a[href="#sanctuary-paths"]')).toBeTruthy();
    expect(element.querySelector('img')?.getAttribute('alt')).toBe('Saṃvit');
  });
});
