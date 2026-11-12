import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ResolvedWordPressContentPolicy } from '../../../core/wordpress/wordpress-content-policy';
import { WordPressContentPolicyService } from '../../../core/wordpress/wordpress-content-policy.service';

import { WORDPRESS_API_URL } from '../../../core/wordpress/wordpress-api';
import { SanakaverseBooksPage, SanakaverseBooksService } from './sanakaverse-books.service';

describe('SanakaverseBooksService', () => {
  let httpTesting: HttpTestingController;
  let service: SanakaverseBooksService;

  const apiUrl = 'https://example.com/wp-json/wp/v2';
  const editorialPolicy = { resolve: vi.fn<() => Observable<ResolvedWordPressContentPolicy>>() };

  beforeEach(() => {
    editorialPolicy.resolve.mockReturnValue(
      of({ excludedCategoryIds: [43], sanakaverseCategoryId: 72 }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WordPressContentPolicyService, useValue: editorialPolicy },
        { provide: WORDPRESS_API_URL, useValue: apiUrl },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(SanakaverseBooksService);
  });

  afterEach(() => {
    vi.useRealTimers();
    httpTesting.verify();
  });

  function rawPage(page: number, total: number) {
    const start = (page - 1) * 12;
    return Array.from({ length: Math.min(12, Math.max(0, total - start)) }, (_, index) => ({
      id: start + index + 1,
      slug: `volume-${start + index + 1}`,
      title: { rendered: `Volume ${start + index + 1}` },
    }));
  }

  it('should use the resolved Sanakaverse category and map its dedicated book covers', () => {
    let result: SanakaverseBooksPage | undefined;

    service.getBooks().subscribe((books) => {
      result = books;
    });

    const postsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);

    expect(postsRequest.request.params.get('categories[terms]')).toBe('72');
    expect(postsRequest.request.params.get('categories_exclude[terms]')).toBe('43');
    expect(postsRequest.request.params.get('per_page')).toBe('12');
    expect(postsRequest.request.params.get('page')).toBe('1');
    expect(postsRequest.request.params.get('orderby')).toBe('date');
    expect(postsRequest.request.params.get('order')).toBe('asc');
    expect(postsRequest.request.params.get('_fields')).toContain('sanakaverse_cover');

    postsRequest.flush(
      [
        {
          id: 1,
          slug: 'samvit',
          title: { rendered: 'Saṃvit &amp; o limiar' },
          sanakaverse_cover: {
            source_url: 'https://example.com/samvit.webp',
            alt_text: 'Samvit diante de um portal',
          },
        },
        {
          id: 2,
          slug: 'vasuki',
          title: { rendered: 'Vāsuki' },
          meta: {
            sanakaverse_cover: {
              url: 'https://example.com/vasuki.webp',
              alt: 'Vasuki em sua capa',
            },
          },
        },
        {
          id: 3,
          slug: 'mors',
          title: { rendered: 'Mors' },
          sanakaverse_cover: ['https://example.com/mors.webp'],
        },
        {
          id: 4,
          slug: 'kalika',
          title: { rendered: 'Kālikā' },
        },
      ],
      { headers: { 'X-WP-Total': '4', 'X-WP-TotalPages': '1' } },
    );

    expect(result?.books).toEqual([
      {
        id: 1,
        slug: 'samvit',
        title: 'Saṃvit & o limiar',
        coverImageUrl: 'https://example.com/samvit.webp',
        coverImageAlt: 'Samvit diante de um portal',
      },
      {
        id: 2,
        slug: 'vasuki',
        title: 'Vāsuki',
        coverImageUrl: 'https://example.com/vasuki.webp',
        coverImageAlt: 'Vasuki em sua capa',
      },
      {
        id: 3,
        slug: 'mors',
        title: 'Mors',
        coverImageUrl: 'https://example.com/mors.webp',
        coverImageAlt: undefined,
      },
      {
        id: 4,
        slug: 'kalika',
        title: 'Kālikā',
        coverImageUrl: undefined,
        coverImageAlt: undefined,
      },
    ]);
    expect(result).toMatchObject({ page: 1, perPage: 12, total: 4, totalPages: 1 });
  });

  it('should report a missing category so the page can offer retry instead of going blank', () => {
    editorialPolicy.resolve.mockReturnValue(of({ excludedCategoryIds: [43] }));
    const next = vi.fn();
    const error = vi.fn();
    service.getBooks().subscribe({ next, error });

    expect(next).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Categoria editorial de Sanaka-loka ausente.' }),
    );
    httpTesting.expectNone((request) => request.url === `${apiUrl}/posts`);
  });

  it('should expose a 101-volume collection without fetching the remaining pages eagerly', () => {
    let first: SanakaverseBooksPage | undefined;
    service.getBooks().subscribe((value) => (first = value));
    const request = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('per_page')).toBe('12');
    request.flush(rawPage(1, 101), { headers: { 'X-WP-Total': '101', 'X-WP-TotalPages': '9' } });
    expect(first?.books).toHaveLength(12);
    expect(first).toMatchObject({ total: 101, totalPages: 9 });
    httpTesting.expectNone((request) => request.url === `${apiUrl}/posts`);

    let last: SanakaverseBooksPage | undefined;
    service.getBooks(9).subscribe((value) => (last = value));
    const lastRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);
    expect(lastRequest.request.params.get('page')).toBe('9');
    expect(lastRequest.request.params.get('orderby')).toBe('date');
    expect(lastRequest.request.params.get('order')).toBe('asc');
    lastRequest.flush(rawPage(9, 101), {
      headers: { 'X-WP-Total': '101', 'X-WP-TotalPages': '9' },
    });
    expect(last?.books.map((book) => book.id)).toEqual([97, 98, 99, 100, 101]);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'should normalize unsafe page %s to the first page',
    (page) => {
      service.getBooks(page).subscribe();
      const request = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);
      expect(request.request.params.get('page')).toBe('1');
      request.flush([], { headers: { 'X-WP-Total': '0', 'X-WP-TotalPages': '0' } });
    },
  );

  it.each([
    { name: 'missing total', headers: { 'X-WP-TotalPages': '1' } },
    { name: 'missing total pages', headers: { 'X-WP-Total': '1' } },
    { name: 'negative total', headers: { 'X-WP-Total': '-1', 'X-WP-TotalPages': '0' } },
    { name: 'unsafe total', headers: { 'X-WP-Total': '9007199254740992', 'X-WP-TotalPages': '1' } },
    { name: 'inconsistent page count', headers: { 'X-WP-Total': '13', 'X-WP-TotalPages': '1' } },
    { name: 'missing rows', headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' } },
  ] as { name: string; headers: Record<string, string> }[])(
    'should reject $name rather than invent a complete catalog',
    ({ headers }) => {
      const error = vi.fn();
      const next = vi.fn();
      service.getBooks().subscribe({ next, error });
      httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`).flush([], { headers });
      expect(error).toHaveBeenCalledOnce();
      expect(next).not.toHaveBeenCalled();
    },
  );

  it('should not query volumes if the required editorial policy fails', () => {
    const failure = new Error('No WoD boundary');
    editorialPolicy.resolve.mockReturnValue(throwError(() => failure));
    const error = vi.fn();
    service.getBooks().subscribe({ error });
    expect(error).toHaveBeenCalledWith(failure);
    httpTesting.expectNone((request) => request.url === `${apiUrl}/posts`);
  });

  it('should cancel the HTTP request when the library stops observing the page', () => {
    const subscription = service.getBooks().subscribe();
    const request = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);
    subscription.unsubscribe();
    expect(request.cancelled).toBe(true);
  });

  it('should bound a stalled page instead of leaving loading active indefinitely', () => {
    vi.useFakeTimers();
    const error = vi.fn();
    service.getBooks().subscribe({ error });
    const request = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);
    vi.advanceTimersByTime(10_001);
    expect(request.cancelled).toBe(true);
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ name: 'TimeoutError' }));
  });
});
