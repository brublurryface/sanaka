import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';

import { RestCodeExplorer } from './rest-code-explorer';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      matrix: {
        rest: {
          code: {
            eyebrow: 'Code in motion',
            title: 'Follow the request through the code',
            status: 'Snippet {{ current }} of {{ total }}',
            previous: 'Previous',
            next: 'Next',
            pagination: 'Code snippets',
            goTo: 'View snippet {{ page }}',
            slides: {
              action: { title: 'Visitor starts', description: 'The event enters a Subject.' },
              request: { title: 'Service requests', description: 'HttpClient performs GET.' },
              stream: {
                title: 'Observable coordinates',
                description: 'switchMap cancels stale work.',
              },
              mapping: {
                title: 'DTO becomes a view model',
                description: 'Only useful fields remain.',
              },
            },
          },
        },
      },
    });
  }
}

describe('RestCodeExplorer', () => {
  let fixture: ComponentFixture<RestCodeExplorer>;
  let component: RestCodeExplorer;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestCodeExplorer],
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

    fixture = TestBed.createComponent(RestCodeExplorer);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('currentStep', 0);
    fixture.detectChanges();
  });

  it('should navigate through every request snippet', () => {
    expect(component.activeIndex()).toBe(0);

    component.next();
    component.next();
    component.next();

    expect(component.activeIndex()).toBe(3);

    component.next();

    expect(component.activeIndex()).toBe(0);
  });

  it('should follow the current portal step without moving the layout', () => {
    fixture.componentRef.setInput('currentStep', 3);
    fixture.detectChanges();

    const snippets = fixture.nativeElement.querySelectorAll('.code-window__snippet');
    const activeSnippets = fixture.nativeElement.querySelectorAll(
      '.code-window__snippet.code-layer--active',
    );

    expect(component.activeIndex()).toBe(3);
    expect(snippets).toHaveLength(4);
    expect(activeSnippets).toHaveLength(1);
    expect(activeSnippets[0].textContent).toContain('imageUrl');
  });

  it('should show NASA request parameters and its service name', () => {
    fixture.componentRef.setInput('currentStep', 1);
    fixture.detectChanges();

    const snippet = fixture.nativeElement.querySelector('.code-window__snippet.code-layer--active');
    expect(fixture.nativeElement.querySelector('.code-window__bar strong').textContent).toContain(
      'nasa-images.service.ts',
    );
    expect(snippet.textContent).toContain('media_type');
    expect(snippet.textContent).toContain('page_size');
    expect(snippet.textContent).not.toContain('is_public_domain');
  });
});
