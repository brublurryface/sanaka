import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
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
    httpTesting.verify();
  });

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

  it('should keep the collection empty when its category does not exist yet', () => {
    editorialPolicy.resolve.mockReturnValue(of({ excludedCategoryIds: [43] }));
    let result: SanakaverseBooksPage | undefined;

    service.getBooks().subscribe((books) => {
      result = books;
    });

    expect(result).toEqual({ books: [], page: 1, perPage: 12, total: 0, totalPages: 0 });
    httpTesting.expectNone((request) => request.url === `${apiUrl}/posts`);
  });
});
