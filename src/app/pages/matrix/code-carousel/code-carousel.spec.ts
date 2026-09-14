import { SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { MatrixCodeCarousel } from './code-carousel';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      matrix: {
        exhibit: {
          code: {
            eyebrow: 'Code in motion',
            title: 'See inside the circuit',
            status: 'Snippet {{ current }} of {{ total }}',
            previous: 'Previous',
            next: 'Next',
            pagination: 'Code snippets',
            goTo: 'View snippet {{ page }}',
            slides: {
              parent: { title: 'Parent sends', description: 'Signals hold the value.' },
              binding: { title: 'Template connects', description: 'Bindings connect both sides.' },
              child: { title: 'Child receives', description: '@Input receives the value.' },
              return: { title: 'Parent handles', description: '@Output returns the event.' },
            },
          },
        },
      },
    });
  }
}

describe('MatrixCodeCarousel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatrixCodeCarousel],
      providers: [
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

  it('should navigate through all code snippets', () => {
    const fixture = TestBed.createComponent(MatrixCodeCarousel);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    component.next();
    expect(component.activeIndex()).toBe(1);

    component.next();
    expect(component.activeIndex()).toBe(2);

    component.next();
    expect(component.activeIndex()).toBe(3);

    component.next();
    expect(component.activeIndex()).toBe(0);
  });

  it('should follow the current experiment step', () => {
    const fixture = TestBed.createComponent(MatrixCodeCarousel);
    const component = fixture.componentInstance;

    component.currentStep = 3;
    component.ngOnChanges({
      currentStep: new SimpleChange(1, 3, false),
    });

    expect(component.activeIndex()).toBe(3);
    expect(component.activeSlide.fileName).toBe('matrix.ts');
  });

  it('should render syntax-highlighted code', () => {
    const fixture = TestBed.createComponent(MatrixCodeCarousel);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.token-keyword')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('draftMessage');
  });

  it('should keep every slide mounted while exposing only the active one', () => {
    const fixture = TestBed.createComponent(MatrixCodeCarousel);

    fixture.detectChanges();

    const snippets = fixture.nativeElement.querySelectorAll('.code-window__snippet');

    expect(snippets).toHaveLength(4);
    expect(
      fixture.nativeElement.querySelectorAll('.code-window__snippet.carousel-layer--active'),
    ).toHaveLength(1);
    expect(snippets[0].getAttribute('aria-hidden')).toBe('false');
    expect(snippets[1].getAttribute('aria-hidden')).toBe('true');

    fixture.componentInstance.next();
    fixture.detectChanges();

    expect(snippets[0].getAttribute('aria-hidden')).toBe('true');
    expect(snippets[1].getAttribute('aria-hidden')).toBe('false');
    expect(
      fixture.nativeElement.querySelector('.code-explorer__announcement').textContent,
    ).toContain('Template connects');
  });
});
