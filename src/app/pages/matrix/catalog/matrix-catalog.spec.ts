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
            title: { line1: 'Matrix', line2: 'Online' },
            intro: 'Choose an experiment.',
          },
          list: { eyebrow: 'Open circuits', title: 'Experiments', intro: 'Choose one.' },
          available: {
            status: 'Available',
            title: 'Components in conversation',
            description: 'Parent and child exchange data.',
            action: 'Enter circuit',
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

  it('should link the available experiment to its own route', () => {
    const fixture = TestBed.createComponent(MatrixCatalog);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.featured-experiment') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('/matrix/components');
    expect(link.textContent).toContain('Components in conversation');
  });

  it('should identify future experiments without turning them into links', () => {
    const fixture = TestBed.createComponent(MatrixCatalog);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.upcoming-list li')).toHaveLength(3);
    expect(fixture.nativeElement.querySelectorAll('.upcoming-list a')).toHaveLength(0);
  });
});
