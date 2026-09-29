import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { WORDPRESS_API_URL } from '../../../core/wordpress/wordpress-api';
import { SanakaverseBook } from '../sanakaverse-book';
import { SanakaverseBooksService } from './sanakaverse-books.service';

describe('SanakaverseBooksService', () => {
  let httpTesting: HttpTestingController;
  let service: SanakaverseBooksService;

  const apiUrl = 'https://example.com/wp-json/wp/v2';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WORDPRESS_API_URL, useValue: apiUrl },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(SanakaverseBooksService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should resolve the Sanakaverse category and map its dedicated book covers', () => {
    let result: readonly SanakaverseBook[] | undefined;

    service.getBooks().subscribe((books) => {
      result = books;
    });

    const categoryRequest = httpTesting.expectOne(
      (request) => request.url === `${apiUrl}/categories`,
    );

    expect(categoryRequest.request.params.get('slug')).toBe('sanakaverse');
    expect(categoryRequest.request.params.get('_fields')).toBe('id');

    categoryRequest.flush([{ id: 72 }]);

    const postsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);

    expect(postsRequest.request.params.get('categories')).toBe('72');
    expect(postsRequest.request.params.get('categories_exclude')).toBe('43');
    expect(postsRequest.request.params.get('per_page')).toBe('100');
    expect(postsRequest.request.params.get('orderby')).toBe('date');
    expect(postsRequest.request.params.get('order')).toBe('asc');
    expect(postsRequest.request.params.get('_fields')).toContain('sanakaverse_cover');

    postsRequest.flush([
      {
        id: 1,
        slug: 'maya',
        title: { rendered: 'Māyā &amp; o limiar' },
        sanakaverse_cover: {
          source_url: 'https://example.com/maya.webp',
          alt_text: 'Maya diante de um portal',
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
        slug: 'kalika',
        title: { rendered: 'Kālikā' },
      },
    ]);

    expect(result).toEqual([
      {
        id: 1,
        slug: 'maya',
        title: 'Māyā & o limiar',
        coverImageUrl: 'https://example.com/maya.webp',
        coverImageAlt: 'Maya diante de um portal',
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
        slug: 'kalika',
        title: 'Kālikā',
        coverImageUrl: undefined,
        coverImageAlt: undefined,
      },
    ]);
  });

  it('should keep the collection empty when its category does not exist yet', () => {
    let result: readonly SanakaverseBook[] | undefined;

    service.getBooks().subscribe((books) => {
      result = books;
    });

    httpTesting.expectOne((request) => request.url === `${apiUrl}/categories`).flush([]);

    expect(result).toEqual([]);
    httpTesting.expectNone((request) => request.url === `${apiUrl}/posts`);
  });
});
