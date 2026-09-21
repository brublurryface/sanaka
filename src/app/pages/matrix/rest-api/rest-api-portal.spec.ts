import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { Observable, of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { NASA_IMAGE_PRESETS } from './nasa-image-presets';
import { NasaImagesService } from './data-access/nasa-images.service';
import { RestRequestDetails, ImageSearchResult } from './rest-api.models';
import { RestApiPortal } from './rest-api-portal';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return of({
      matrix: {
        rest: {
          header: {
            back: 'Back to the catalog',
            eyebrow: 'Experiment 02',
            title: { line1: 'A portal', line2: 'to the universe' },
            intro: 'Watch a REST request cross the network.',
            action: 'Open experiment',
          },
          exhibit: {
            eyebrow: 'REST laboratory',
            title: 'Invoke an image',
            intro: 'Choose a subject and follow the request.',
          },
          controls: {
            label: 'Cosmic subject',
            placeholder: 'Try moon',
            clear: lang === 'pt-BR' ? 'Limpar busca' : 'Clear search',
            submit: 'Open portal',
            searchAgain: 'Open another portal',
            presetsLabel: 'Suggested invocations',
            presets: {
              nebula: 'Orion Nebula',
              mars: 'Mars',
              earth: 'Blue Earth',
              blackHole: 'Black hole · illustration',
            },
          },
          portal: {
            idle: { title: 'Portal at rest', text: 'No request yet.', action: 'Invoke image' },
            loading: { title: 'Crossing the network', text: 'Searching for {{ query }}.' },
            imageLoading: { title: 'Revealing image', text: 'The browser is loading the file.' },
            empty: { title: 'Nothing crossed', text: 'No image for {{ query }}.' },
            error: { title: 'Connection broken', text: 'Request failed.' },
            imageError: { title: 'Image unavailable', text: 'Metadata arrived.' },
            retry: 'Try again',
            newSearch: 'New search',
            success: {
              label: 'Mapped result',
              date: 'Date',
              credit: 'Credit',
              center: 'NASA center',
              openSource: 'View image at source',
            },
            announcement: {
              loading: 'Request started.',
              success: '{{ title }} arrived.',
              empty: 'No image found.',
              error: 'Request failed.',
            },
          },
          inspector: {
            eyebrow: 'Request inspector',
            title: 'What crossed the portal',
            intro: 'The real HTTP request.',
            method: 'Method',
            status: 'Status',
            endpoint: 'Endpoint',
            parameters: 'Parameters',
            requestUrl: 'Complete URL',
            mappedResponse: 'Mapped response',
            total: '{{ total }} results',
          },
          source: { prefix: 'Data and images:', name: 'NASA Image and Video Library' },
          explanation: {
            action: { title: 'What do you do?', text: 'Choose and submit.' },
            angular: { title: 'What does Angular notice?', text: 'An event starts a stream.' },
            code: { title: 'What moves in code?', text: 'A DTO becomes a view model.' },
          },
          code: {
            eyebrow: 'Code in motion',
            title: 'Follow the request',
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
              mapping: { title: 'DTO becomes a view model', description: 'Useful fields remain.' },
            },
          },
        },
      },
    });
  }
}

class MockNasaImagesService {
  readonly searchImages = vi.fn((_query: string): Observable<ImageSearchResult> =>
    of(createResult('Default image')),
  );

  describeRequest(query: string): RestRequestDetails {
    const nasaId = NASA_IMAGE_PRESETS.find((preset) => preset.query === query)?.nasaId;
    const name = nasaId ? 'nasa_id' : 'q';
    const value = nasaId ?? query.trim();

    return {
      method: 'GET',
      endpoint: 'https://nasa.example/search',
      parameters: [
        { name, value },
        { name: 'media_type', value: 'image' },
        { name: 'page_size', value: '12' },
      ],
      url: `https://nasa.example/search?${name}=${encodeURIComponent(value)}`,
    };
  }
}

function createResult(title: string, query = 'Orion nebula'): ImageSearchResult {
  return {
    image: {
      id: String(title.length),
      title,
      credit: 'NASA / ESA',
      date: '2025-01-01',
      center: 'GSFC',
      imageUrl: 'https://images.example/image.jpg',
      imageAlt: `${title} description`,
      sourceUrl: 'https://images.example/image.jpg',
    },
    query,
    status: 200,
    total: 7,
  };
}

describe('RestApiPortal', () => {
  let api: MockNasaImagesService;

  beforeEach(async () => {
    api = new MockNasaImagesService();

    await TestBed.configureTestingModule({
      imports: [RestApiPortal],
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
        { provide: NasaImagesService, useValue: api },
      ],
    }).compileComponents();
  });

  it('should begin with an idle portal and a visible GET request preview', () => {
    const fixture = TestBed.createComponent(RestApiPortal);
    fixture.detectChanges();

    expect(fixture.componentInstance.phase()).toBe('idle');
    expect(fixture.nativeElement.querySelector('.portal-state').textContent).toContain(
      'Portal at rest',
    );
    expect(fixture.nativeElement.querySelector('.request-inspector').textContent).toContain('GET');
    expect(fixture.componentInstance.query()).toBe('Orion nebula');
    expect(api.searchImages).not.toHaveBeenCalled();
  });

  it('should render a named non-submit clear button while the query contains text', () => {
    const fixture = TestBed.createComponent(RestApiPortal);
    fixture.detectChanges();
    const clear: HTMLButtonElement = fixture.nativeElement.querySelector('.portal-controls__clear');

    expect(clear).not.toBeNull();
    expect(clear.type).toBe('button');
    expect(clear.getAttribute('aria-label')).toBe('Limpar busca');
    expect(clear.getAttribute('aria-controls')).toBe('image-query');
    expect(api.searchImages).not.toHaveBeenCalled();
  });

  it('should clear the query and return focus without requesting another image', () => {
    const fixture = TestBed.createComponent(RestApiPortal);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#image-query');
    const clear: HTMLButtonElement = fixture.nativeElement.querySelector('.portal-controls__clear');

    clear.focus();
    clear.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.query()).toBe('');
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(fixture.componentInstance.canSearch()).toBe(false);
    expect(fixture.nativeElement.querySelector('.portal-controls__clear')).toBeNull();
    expect(fixture.nativeElement.querySelector('.portal-controls__submit').disabled).toBe(true);
    expect(fixture.componentInstance.phase()).toBe('idle');
    expect(api.searchImages).not.toHaveBeenCalled();
  });

  it('should restore the clear button when the visitor types after emptying the field', () => {
    const fixture = TestBed.createComponent(RestApiPortal);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#image-query');
    fixture.componentInstance.clearQuery(input);
    fixture.detectChanges();

    input.value = 'mars';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.query()).toBe('mars');
    expect(fixture.nativeElement.querySelector('.portal-controls__clear')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.portal-controls__submit').disabled).toBe(false);
    expect(api.searchImages).not.toHaveBeenCalled();

    fixture.nativeElement
      .querySelector('.portal-controls')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(api.searchImages).toHaveBeenCalledExactlyOnceWith('mars');
  });

  it('should preserve the displayed result and request inspector when clearing the draft query', () => {
    const fixture = TestBed.createComponent(RestApiPortal);
    const component = fixture.componentInstance;
    component.search();
    component.handleImageLoaded();
    fixture.detectChanges();
    const result = component.result();
    const request = component.requestDetails();

    fixture.nativeElement.querySelector('.portal-controls__clear').click();
    fixture.detectChanges();

    expect(component.result()).toBe(result);
    expect(component.requestDetails()).toEqual(request);
    expect(component.submittedQuery()).toBe('Orion nebula');
    expect(component.phase()).toBe('success');
    expect(component.imageLoaded()).toBe(true);
    expect(api.searchImages).toHaveBeenCalledOnce();
  });

  it('should keep the current request running when only its draft input is cleared', () => {
    const pending = new Subject<ImageSearchResult>();
    api.searchImages.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(RestApiPortal);
    const component = fixture.componentInstance;
    component.search();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.portal-controls__clear').click();
    fixture.detectChanges();
    expect(component.phase()).toBe('loading');

    pending.next(createResult('Requested image'));
    pending.complete();
    fixture.detectChanges();

    expect(component.query()).toBe('');
    expect(component.phase()).toBe('success');
    expect(component.result()?.image?.title).toBe('Requested image');
    expect(api.searchImages).toHaveBeenCalledOnce();
  });

  it('should translate the clear button without triggering a request', async () => {
    const fixture = TestBed.createComponent(RestApiPortal);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const clear: HTMLButtonElement = fixture.nativeElement.querySelector('.portal-controls__clear');
    expect(clear.getAttribute('aria-label')).toBe('Limpar busca');

    TestBed.inject(TranslocoService).setActiveLang('en');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(clear.getAttribute('aria-label')).toBe('Clear search');
    expect(api.searchImages).not.toHaveBeenCalled();
  });

  it('should show loading and then manifest the mapped image', () => {
    const response = new Subject<ImageSearchResult>();
    api.searchImages.mockReturnValue(response);

    const fixture = TestBed.createComponent(RestApiPortal);
    const component = fixture.componentInstance;

    component.search();
    fixture.detectChanges();

    expect(component.phase()).toBe('loading');
    expect(fixture.nativeElement.querySelector('.portal').getAttribute('aria-busy')).toBe('true');

    response.next(createResult('Moon over the portal'));
    response.complete();
    fixture.detectChanges();

    expect(component.phase()).toBe('success');
    expect(fixture.nativeElement.querySelector('.portal__image').getAttribute('src')).toContain(
      'image.jpg',
    );
    expect(fixture.nativeElement.querySelector('.image-caption').textContent).toContain(
      'Moon over the portal',
    );
  });

  it('should expose the empty state when the response has no displayable image', () => {
    api.searchImages.mockReturnValue(of({ image: null, query: 'nothing', status: 200, total: 0 }));

    const fixture = TestBed.createComponent(RestApiPortal);
    fixture.componentInstance.query.set('nothing');
    fixture.componentInstance.search();
    fixture.detectChanges();

    expect(fixture.componentInstance.phase()).toBe('empty');
    expect(fixture.nativeElement.querySelector('.portal-state').textContent).toContain(
      'Nothing crossed',
    );
  });

  it('should distinguish an image load failure from a successful HTTP response', () => {
    const fixture = TestBed.createComponent(RestApiPortal);
    const component = fixture.componentInstance;

    component.search();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.portal__image').dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(component.phase()).toBe('success');
    expect(component.responseStatus()).toBe(200);
    expect(component.imageFailed()).toBe(true);
    expect(fixture.nativeElement.querySelector('.portal-state').textContent).toContain(
      'Image unavailable',
    );
    expect(fixture.nativeElement.querySelector('.image-caption').textContent).toContain(
      'Default image',
    );
  });

  it('should distinguish metadata arrival from the browser image load event', () => {
    const fixture = TestBed.createComponent(RestApiPortal);
    const component = fixture.componentInstance;
    component.search();
    fixture.detectChanges();

    expect(component.responseStatus()).toBe(200);
    expect(component.imageLoaded()).toBe(false);
    expect(fixture.nativeElement.querySelector('.portal-state').textContent).toContain(
      'Revealing image',
    );
    fixture.nativeElement.querySelector('.portal__image').dispatchEvent(new Event('load'));
    fixture.detectChanges();

    expect(component.imageLoaded()).toBe(true);
    expect(fixture.nativeElement.querySelector('.portal-state')).toBeNull();
  });

  it('should reset image loading state when a new query starts', () => {
    const pending = new Subject<ImageSearchResult>();
    const fixture = TestBed.createComponent(RestApiPortal);
    const component = fixture.componentInstance;
    component.search();
    component.handleImageLoaded();
    api.searchImages.mockReturnValueOnce(pending);

    component.selectPreset('saturn');

    expect(component.phase()).toBe('loading');
    expect(component.imageLoaded()).toBe(false);
    expect(component.imageFailed()).toBe(false);
  });

  it('should cancel pending work when the experiment returns to idle', () => {
    const pending = new Subject<ImageSearchResult>();
    api.searchImages.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(RestApiPortal);
    const component = fixture.componentInstance;
    component.search();

    component.startOver();
    pending.next(createResult('Stale image'));

    expect(component.phase()).toBe('idle');
    expect(component.result()).toBeNull();
    expect(component.imageLoaded()).toBe(false);
  });

  it('should show an error and retry the last query', () => {
    const retryResponse = new Subject<ImageSearchResult>();

    api.searchImages
      .mockReturnValueOnce(
        new Observable((subscriber) => {
          subscriber.error(new HttpErrorResponse({ status: 503 }));
        }),
      )
      .mockReturnValueOnce(retryResponse);

    const fixture = TestBed.createComponent(RestApiPortal);
    const component = fixture.componentInstance;

    component.search();
    fixture.detectChanges();

    expect(component.phase()).toBe('error');
    expect(component.errorStatus()).toBe(503);

    component.retry();

    expect(api.searchImages).toHaveBeenCalledTimes(2);
    expect(component.phase()).toBe('loading');
  });

  it('should not display a fake HTTP status when a request fails before a response', () => {
    api.searchImages.mockReturnValueOnce(
      new Observable((subscriber) => subscriber.error(new Error('Request timed out'))),
    );
    const fixture = TestBed.createComponent(RestApiPortal);
    const component = fixture.componentInstance;

    component.search();
    fixture.detectChanges();

    expect(component.phase()).toBe('error');
    expect(component.responseStatus()).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.request-inspector__summary').textContent,
    ).toContain('—');

    component.retry();
    expect(component.phase()).toBe('success');
  });

  it('should ignore a stale response after a newer search starts', () => {
    const firstResponse = new Subject<ImageSearchResult>();
    const secondResponse = new Subject<ImageSearchResult>();

    api.searchImages.mockReturnValueOnce(firstResponse).mockReturnValueOnce(secondResponse);

    const fixture = TestBed.createComponent(RestApiPortal);
    const component = fixture.componentInstance;

    component.query.set('first');
    component.search();
    component.query.set('second');
    component.search();

    secondResponse.next(createResult('Second image', 'second'));
    firstResponse.next(createResult('Stale image', 'first'));

    expect(component.result()?.image?.title).toBe('Second image');
  });

  it('should let a preset start a real search without changing the endpoint', () => {
    const fixture = TestBed.createComponent(RestApiPortal);

    fixture.componentInstance.selectPreset('Orion nebula');

    expect(fixture.componentInstance.query()).toBe('Orion nebula');
    expect(api.searchImages).toHaveBeenCalledWith('Orion nebula');
  });

  it('should use specific cosmic queries for all four suggestions', () => {
    const fixture = TestBed.createComponent(RestApiPortal);
    const component = fixture.componentInstance;

    expect(component.presets.map((preset) => preset.query)).toEqual([
      'Orion nebula',
      'Global Color Views of Mars',
      'earth blue marble',
      'Black Holes: Monsters in Space',
    ]);

    for (const preset of component.presets) {
      component.selectPreset(preset.query);

      expect(component.requestDetails().parameters).toContainEqual({
        name: preset.nasaId ? 'nasa_id' : 'q',
        value: preset.nasaId ?? preset.query,
      });
      expect(api.searchImages).toHaveBeenLastCalledWith(preset.query);
    }
  });

  it('should let the Mars and black hole buttons start their curated requests', () => {
    const fixture = TestBed.createComponent(RestApiPortal);
    fixture.detectChanges();
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll(
      '.portal-controls__presets button',
    );

    expect(buttons).toHaveLength(4);
    expect(buttons[1].textContent).toContain('Mars');
    expect(buttons[3].textContent).toContain('illustration');

    buttons[1].click();
    fixture.detectChanges();
    expect(api.searchImages).toHaveBeenLastCalledWith('Global Color Views of Mars');
    expect(fixture.componentInstance.requestDetails().parameters[0]).toEqual({
      name: 'nasa_id',
      value: 'PIA00407',
    });

    buttons[3].click();
    fixture.detectChanges();
    expect(api.searchImages).toHaveBeenLastCalledWith('Black Holes: Monsters in Space');
    expect(fixture.componentInstance.requestDetails().parameters[0]).toEqual({
      name: 'nasa_id',
      value: 'PIA16695',
    });
    expect(buttons[3].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('should localize the caption without modifying the JSON or repeating the request', () => {
    const result = createResult('Andromeda Galaxy');
    api.searchImages.mockReturnValueOnce(
      of({ ...result, image: { ...result.image!, date: '2003-12-10' } }),
    );
    const fixture = TestBed.createComponent(RestApiPortal);
    fixture.componentInstance.search();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.image-caption time').textContent).toBe(
      '10/12/2003',
    );

    TestBed.inject(TranslocoService).setActiveLang('en');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.image-caption time').textContent).toBe(
      '12/10/2003',
    );
    expect(JSON.parse(fixture.componentInstance.mappedResponse()).date).toBe('2003-12-10');
    expect(api.searchImages).toHaveBeenCalledOnce();
  });
});
