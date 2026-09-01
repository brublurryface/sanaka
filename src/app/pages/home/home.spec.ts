import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoLoader, provideTransloco } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app.routes';
import { Home } from './home';

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

describe('Home', () => {
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter(routes),
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

    fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the sanctuary hero', () => {
    expect(fixture.nativeElement.querySelector('app-sanctuary-hero')).toBeTruthy();
  });

  it('should render the sanctuary paths', () => {
    expect(fixture.nativeElement.querySelector('app-sanctuary-paths')).toBeTruthy();
  });
});
