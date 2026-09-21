import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TimeoutError } from 'rxjs';
import { vi } from 'vitest';

import { NASA_IMAGES_API_URL, NasaImagesService } from './nasa-images.service';
import { ImageSearchResult } from '../rest-api.models';

const previewUrl = 'https://images-assets.nasa.gov/image/test-nebula/test-nebula~thumb.jpg';

function createImageItem(data = {}) {
  return {
    data: [
      { nasa_id: 'test-nebula', title: ' Nebula in the portal ', media_type: 'image', ...data },
    ],
    links: [{ href: previewUrl, rel: 'preview', render: 'image' }],
  };
}

describe('NasaImagesService', () => {
  const apiUrl = 'https://nasa.example';
  let httpTesting: HttpTestingController;
  let service: NasaImagesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NASA_IMAGES_API_URL, useValue: apiUrl },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(NasaImagesService);
  });

  afterEach(() => {
    vi.useRealTimers();
    httpTesting.verify();
  });

  it('should request NASA images and preserve the preview URL from the response', () => {
    let result: ImageSearchResult | undefined;
    service.searchImages('  nebula  ').subscribe((value) => (result = value));

    const request = httpTesting.expectOne((candidate) => candidate.url === `${apiUrl}/search`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('q')).toBe('nebula');
    expect(request.request.params.get('media_type')).toBe('image');
    expect(request.request.params.get('page_size')).toBe('12');
    expect(request.request.params.has('api_key')).toBe(false);
    expect(request.request.params.has('query[term][is_public_domain]')).toBe(false);

    request.flush({
      collection: {
        items: [
          { data: [{ nasa_id: 'missing-image', title: 'No preview', media_type: 'image' }] },
          createImageItem({
            photographer: ' NASA / Photographer ',
            secondary_creator: 'Other creator',
            date_created: '2025-01-01T12:00:00Z',
            center: ' GSFC ',
          }),
        ],
        metadata: { total_hits: 42 },
      },
    });

    expect(result).toEqual({
      image: {
        id: 'test-nebula',
        title: 'Nebula in the portal',
        credit: 'NASA / Photographer',
        date: '2025-01-01',
        center: 'GSFC',
        imageUrl: previewUrl,
        imageAlt: 'Nebula in the portal',
        sourceUrl: previewUrl,
      },
      query: 'nebula',
      status: 200,
      total: 42,
    });
  });

  it('should keep a secondary creator credit when no photographer is provided', () => {
    let result: ImageSearchResult | undefined;
    service.searchImages('nebula').subscribe((value) => (result = value));
    httpTesting
      .expectOne((candidate) => candidate.url === `${apiUrl}/search`)
      .flush({
        collection: {
          items: [createImageItem({ secondary_creator: ' NASA, ESA and the Hubble team ' })],
        },
      });

    expect(result?.image?.credit).toBe('NASA, ESA and the Hubble team');
  });

  it.each([
    ['Global Color Views of Mars', 'PIA00407'],
    ['Black Holes: Monsters in Space', 'PIA16695'],
  ])('should target the selected record for %s with nasa_id=%s', (query, nasaId) => {
    let result: ImageSearchResult | undefined;
    const details = service.describeRequest(query);
    service.searchImages(query).subscribe((value) => (result = value));

    const request = httpTesting.expectOne(details.url);
    expect(request.request.params.get('nasa_id')).toBe(nasaId);
    expect(request.request.params.has('q')).toBe(false);
    expect(request.request.params.get('media_type')).toBe('image');
    expect(details.parameters[0]).toEqual({ name: 'nasa_id', value: nasaId });

    request.flush({
      collection: {
        items: [createImageItem({ nasa_id: nasaId, title: query })],
        metadata: { total_hits: 1 },
      },
    });

    expect(result?.image?.id).toBe(nasaId);
    expect(result?.image?.imageUrl).toBe(previewUrl);
    expect(result?.total).toBe(1);
    expect(result?.query).toBe(query);
  });

  it('should normalize whitespace and case before recognizing a selected example', () => {
    const query = '  GLOBAL   COLOR VIEWS OF MARS  ';
    const details = service.describeRequest(query);
    service.searchImages(query).subscribe();

    const request = httpTesting.expectOne(details.url);
    expect(request.request.params.get('nasa_id')).toBe('PIA00407');
    expect(request.request.params.has('q')).toBe(false);
    request.flush({ collection: { items: [] } });
  });

  it('should skip a different record before finding the requested curated NASA ID', () => {
    let result: ImageSearchResult | undefined;
    service.searchImages('Global Color Views of Mars').subscribe((value) => (result = value));
    httpTesting.expectOne(service.describeRequest('Global Color Views of Mars').url).flush({
      collection: {
        items: [
          createImageItem({ nasa_id: 'PIA10569', title: 'Unrelated technical image' }),
          createImageItem({ nasa_id: 'PIA00407', title: 'Global Color Views of Mars' }),
        ],
      },
    });

    expect(result?.image?.id).toBe('PIA00407');
  });

  it('should return empty rather than substitute an unrelated image for a curated example', () => {
    let result: ImageSearchResult | undefined;
    service.searchImages('Black Holes: Monsters in Space').subscribe((value) => (result = value));
    httpTesting.expectOne(service.describeRequest('Black Holes: Monsters in Space').url).flush({
      collection: {
        items: [createImageItem({ nasa_id: 'different-record' })],
        metadata: { total_hits: 1 },
      },
    });

    expect(result?.image).toBeNull();
    expect(result?.status).toBe(200);
    expect(result?.total).toBe(1);
  });

  it('should keep a manual search free of the previous curated NASA ID', () => {
    service.searchImages('Global Color Views of Mars').subscribe();
    httpTesting
      .expectOne(service.describeRequest('Global Color Views of Mars').url)
      .flush({ collection: { items: [] } });

    const details = service.describeRequest('mars');
    service.searchImages('mars').subscribe();
    const request = httpTesting.expectOne(details.url);

    expect(request.request.params.get('q')).toBe('mars');
    expect(request.request.params.has('nasa_id')).toBe(false);
    request.flush({ collection: { items: [] } });
  });

  it('should tolerate missing optional metadata without guessing an asset URL', () => {
    let result: ImageSearchResult | undefined;
    service.searchImages('nebula').subscribe((value) => (result = value));
    httpTesting
      .expectOne((candidate) => candidate.url === `${apiUrl}/search`)
      .flush({
        collection: { items: [createImageItem()] },
      });

    expect(result?.image?.credit).toBe('NASA');
    expect(result?.image?.date).toBeNull();
    expect(result?.image?.center).toBeNull();
    expect(result?.image?.imageUrl).toBe(previewUrl);
    expect(result?.total).toBe(0);
  });

  it('should skip videos, incomplete records, malformed links and insecure previews', () => {
    let result: ImageSearchResult | undefined;
    service.searchImages('nebula').subscribe((value) => (result = value));
    httpTesting
      .expectOne((candidate) => candidate.url === `${apiUrl}/search`)
      .flush({
        collection: {
          items: [
            createImageItem({ media_type: 'video' }),
            createImageItem({ nasa_id: '' }),
            createImageItem({ title: '   ' }),
            { ...createImageItem(), links: [{ rel: 'preview', render: 'image', href: 'invalid' }] },
            {
              ...createImageItem(),
              links: [{ rel: 'preview', render: 'image', href: 'http://example.com/image.jpg' }],
            },
            {
              ...createImageItem(),
              links: [{ rel: 'preview', render: 'video', href: previewUrl }],
            },
            createImageItem(),
          ],
        },
      });

    expect(result?.image?.imageUrl).toBe(previewUrl);
  });

  it('should return an empty result when NASA finds no images', () => {
    let result: ImageSearchResult | undefined;
    service.searchImages('unknown subject').subscribe((value) => (result = value));
    httpTesting
      .expectOne((candidate) => candidate.url === `${apiUrl}/search`)
      .flush({
        collection: { items: [], metadata: { total_hits: 0 } },
      });

    expect(result).toEqual({ image: null, query: 'unknown subject', status: 200, total: 0 });
  });

  it('should handle a successful response with no body', () => {
    let result: ImageSearchResult | undefined;
    service.searchImages('nebula').subscribe((value) => (result = value));
    httpTesting
      .expectOne((candidate) => candidate.url === `${apiUrl}/search`)
      .flush(null, {
        status: 204,
        statusText: 'No Content',
      });

    expect(result).toEqual({ image: null, query: 'nebula', status: 204, total: 0 });
  });

  it('should describe exactly the same URL and parameters that HttpClient sends', () => {
    const details = service.describeRequest('  moon   &   stars  ');
    service.searchImages('  moon   &   stars  ').subscribe();

    const request = httpTesting.expectOne(details.url);
    expect(details.endpoint).toBe(`${apiUrl}/search`);
    expect(details.parameters).toEqual([
      { name: 'q', value: 'moon & stars' },
      { name: 'media_type', value: 'image' },
      { name: 'page_size', value: '12' },
    ]);
    expect(new URL(details.url).searchParams.get('q')).toBe('moon & stars');
    expect(request.request.urlWithParams).toBe(details.url);
    request.flush({ collection: { items: [] } });
  });

  it('should limit the query to 60 characters in both the request and inspector', () => {
    const query = 'n'.repeat(80);
    const details = service.describeRequest(query);
    service.searchImages(query).subscribe();

    const request = httpTesting.expectOne(details.url);
    expect(request.request.params.get('q')).toHaveLength(60);
    request.flush({ collection: { items: [] } });
  });

  it('should propagate an HTTP error so the component can present and retry it', () => {
    let receivedError: unknown;
    service.searchImages('nebula').subscribe({ error: (error) => (receivedError = error) });
    httpTesting
      .expectOne((candidate) => candidate.url === `${apiUrl}/search`)
      .flush(
        {},
        {
          status: 503,
          statusText: 'Service Unavailable',
        },
      );

    expect(receivedError).toBeInstanceOf(HttpErrorResponse);
    expect((receivedError as HttpErrorResponse).status).toBe(503);
  });

  it('should stop a request after 15 seconds instead of waiting indefinitely', () => {
    vi.useFakeTimers();
    let receivedError: unknown;
    service.searchImages('nebula').subscribe({ error: (error) => (receivedError = error) });
    const request = httpTesting.expectOne((candidate) => candidate.url === `${apiUrl}/search`);

    vi.advanceTimersByTime(15_000);

    expect(receivedError).toBeInstanceOf(TimeoutError);
    expect(request.cancelled).toBe(true);
  });
});
