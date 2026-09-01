import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoLoader, provideTransloco } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { SanctuaryHero } from './sanctuary-hero';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Record<string, any>> {
    return of({
      home: {
        hero: {
          eyebrow: 'Sanctuary eyebrow',
          title: {
            line1: 'A line',
            line2: 'another line',
            line3: 'final.',
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

  it('should contain the destination links', () => {
    const fixture = TestBed.createComponent(SanctuaryHero);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll('a'));

    expect(links.map((link) => link.getAttribute('href'))).toContain('/maya');
    expect(links.map((link) => link.getAttribute('href'))).toContain('/posts');
  });

  it('should contain the scroll link and Maya image alt text', () => {
    const fixture = TestBed.createComponent(SanctuaryHero);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('a[href="#sanctuary-paths"]')).toBeTruthy();
    expect(element.querySelector('img')?.getAttribute('alt')).toBe('Māyā');
  });
});
