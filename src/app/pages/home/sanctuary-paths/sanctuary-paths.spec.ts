import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoLoader, provideTransloco } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { SanctuaryPaths } from './sanctuary-paths';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Record<string, any>> {
    return of({
      home: {
        paths: {
          eyebrow: 'Paths eyebrow',
          title: {
            line1: 'Choose how',
            line2: 'to traverse.',
          },
          intro: 'Paths intro text.',
          card: {
            readings: {
              label: 'Archive',
              title: 'Readings',
              description: 'Readings description.',
            },
            maya: {
              label: 'Presence',
              description: 'Maya description.',
            },
          },
        },
      },
    });
  }
}

describe('SanctuaryPaths', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SanctuaryPaths],
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
    expect(TestBed.createComponent(SanctuaryPaths).componentInstance).toBeTruthy();
  });

  it('should render the sanctuary paths section', () => {
    const fixture = TestBed.createComponent(SanctuaryPaths);
    fixture.detectChanges();
    const section = fixture.nativeElement.querySelector('section#sanctuary-paths');

    expect(section).toBeTruthy();
    expect(section.getAttribute('aria-labelledby')).toBe('paths-title');
  });

  it('should contain the posts and Maya links', () => {
    const fixture = TestBed.createComponent(SanctuaryPaths);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll('a'));

    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/posts', '/maya']);
  });
});
