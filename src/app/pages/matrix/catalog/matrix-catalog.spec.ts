import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { MatrixCatalog } from './matrix-catalog';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      matrix: {
        catalog: {
          header: {
            eyebrow: 'Interactive laboratory',
            title: { line1: 'Matrix', line2: 'on-line' },
            intro: 'Choose an experiment.',
            imageAlt: 'Māyā in the Matrix laboratory.',
          },
          list: { eyebrow: 'Open circuits', title: 'Experiments', intro: 'Choose one.' },
          available: {
            status: 'Available',
            title: 'Components in conversation',
            description: 'Parent and child exchange data.',
            action: 'Enter circuit',
          },
          rest: {
            status: 'Available',
            title: 'REST API portal',
            description: 'A request manifests an image from NASA.',
            action: 'Open portal',
          },
          upcoming: {
            eyebrow: 'Next experiments',
            title: 'The Matrix keeps opening',
            status: 'Coming soon',
            signals: 'Signals',
            observables: 'Observables',
            lifecycle: 'Lifecycle',
          },
        },
      },
    });
  }
}

describe('MatrixCatalog', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatrixCatalog],
      providers: [
        provideRouter([]),
        provideTransloco({
          config: {
            availableLangs: ['pt-BR', 'en'],
            defaultLang: 'pt-BR',
            fallbackLang: 'pt-BR',
            prodMode: true,
          },
          loader: MockTranslocoLoader,
        }),
      ],
    }).compileComponents();
  });

  it('should render the Matrix on-line title', () => {
    const fixture = TestBed.createComponent(MatrixCatalog);
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('#matrix-catalog-title') as HTMLElement;
    const hero = fixture.nativeElement.querySelector('.catalog-hero') as HTMLElement;
    const image = hero.querySelector('.sanaka-atmosphere-hero__image') as HTMLImageElement;

    expect(title.textContent?.replace(/\s+/g, ' ').trim()).toBe('Matrix on-line');
    expect(hero.classList.contains('sanaka-atmosphere-hero--cinematic')).toBe(true);
    expect(image.getAttribute('src')).toBe('/images/matrix/matrix-atmosphere-desktop.webp');
  });

  it('should link each available experiment to its own route', () => {
    const fixture = TestBed.createComponent(MatrixCatalog);
    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('.featured-experiment'),
    ) as HTMLAnchorElement[];

    expect(links).toHaveLength(2);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/matrix/components',
      '/matrix/rest-api',
    ]);
    expect(links[0].textContent).toContain('Components in conversation');
    expect(links[1].textContent).toContain('REST API portal');
  });

  it('should identify future experiments without turning them into links', () => {
    const fixture = TestBed.createComponent(MatrixCatalog);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.upcoming-list li')).toHaveLength(3);
    expect(fixture.nativeElement.querySelectorAll('.upcoming-list a')).toHaveLength(0);
  });
});
