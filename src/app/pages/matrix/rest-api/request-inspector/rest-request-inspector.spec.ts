import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';

import { RestRequestInspector } from './rest-request-inspector';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      matrix: {
        rest: {
          inspector: {
            eyebrow: 'Request inspector',
            title: 'What crossed the portal',
            intro: 'A real request.',
            method: 'Method',
            status: 'Status',
            endpoint: 'Endpoint',
            parameters: 'Parameters',
            requestUrl: 'Complete URL',
            mappedResponse: 'Mapped response',
            total: '{{ total }} results',
          },
        },
      },
    });
  }
}

describe('RestRequestInspector', () => {
  let fixture: ComponentFixture<RestRequestInspector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestRequestInspector],
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

    fixture = TestBed.createComponent(RestRequestInspector);
    fixture.componentRef.setInput('request', {
      method: 'GET',
      endpoint: 'https://nasa.example/search',
      parameters: [
        { name: 'q', value: 'moon' },
        { name: 'media_type', value: 'image' },
        { name: 'page_size', value: '12' },
      ],
      url: 'https://nasa.example/search?q=moon&media_type=image&page_size=12',
    });
    fixture.componentRef.setInput('status', 200);
    fixture.componentRef.setInput('total', 7);
    fixture.componentRef.setInput('mappedResponse', '{ "title": "Moon" }');
    fixture.detectChanges();
  });

  it('should present the request and mapped response received from its parent', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('GET');
    expect(text).toContain('200');
    expect(text).toContain('moon');
    expect(text).toContain('Moon');
    expect(text).toContain('7 results');
  });
});
