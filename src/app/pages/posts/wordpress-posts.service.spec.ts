import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Post } from './post';
import {
  PostsPage,
  WORDPRESS_API_URL,
  WordPressPostsService,
} from './wordpress-posts.service';

describe('WordPressPostsService', () => {
  let httpTesting: HttpTestingController;
  let service: WordPressPostsService;

  const apiUrl = 'https://example.com/wp-json/wp/v2';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: WORDPRESS_API_URL,
          useValue: apiUrl,
        },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(WordPressPostsService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should load one page and expose WordPress pagination metadata', () => {
    let result: PostsPage | undefined;

    service
      .getPosts({
        page: 2,
        perPage: 20,
        search: 'medo',
        categoryId: 45,
      })
      .subscribe((postsPage) => {
        result = postsPage;
      });

    const postsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);

    expect(postsRequest.request.params.get('page')).toBe('2');
    expect(postsRequest.request.params.get('per_page')).toBe('20');
    expect(postsRequest.request.params.get('search')).toBe('medo');
    expect(postsRequest.request.params.get('categories')).toBe('45');
    expect(postsRequest.request.params.get('_fields')).toContain('featured_media');

    postsRequest.flush(
      [
        {
          id: 6667,
          slug: 'eu-nao-entendi',
          date: '2023-06-20T19:54:33',
          title: { rendered: 'Eu &amp; o medo' },
          excerpt: {
            rendered:
              '<p>Primeiro trecho.</p><p>Segundo trecho&#8230;</p><a class="more-link">Continue lendo Eu &amp; o medo →</a>',
          },
          featured_media: 6453,
          categories: [41, 45],
        },
      ],
      {
        headers: {
          'X-WP-Total': '99',
          'X-WP-TotalPages': '5',
        },
      },
    );

    const categoriesRequest = httpTesting.expectOne(
      (request) => request.url === `${apiUrl}/categories`,
    );
    const mediaRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/media`);

    expect(mediaRequest.request.params.get('include')).toBe('6453');
    expect(mediaRequest.request.params.get('per_page')).toBe('1');

    categoriesRequest.flush([
      { id: 41, name: 'Bruna' },
      { id: 45, name: 'Pensamentos &amp; Ensaios' },
    ]);
    mediaRequest.flush([
      {
        id: 6453,
        source_url: 'https://example.com/cover.jpg',
        alt_text: 'Capa do post',
      },
    ]);

    expect(result).toEqual({
      posts: [
        {
          id: 6667,
          slug: 'eu-nao-entendi',
          title: 'Eu & o medo',
          excerpt: 'Primeiro trecho. Segundo trecho…',
          publishedAt: '2023-06-20',
          category: 'Bruna · Pensamentos & Ensaios',
          coverImageUrl: 'https://example.com/cover.jpg',
          coverImageAlt: 'Capa do post',
        },
      ],
      page: 2,
      perPage: 20,
      total: 99,
      totalPages: 5,
    });
  });

  it('should use 20 posts per page and skip media when no post has a featured image', () => {
    let result: PostsPage | undefined;

    service.getPosts().subscribe((postsPage) => {
      result = postsPage;
    });

    const postsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);

    expect(postsRequest.request.params.get('page')).toBe('1');
    expect(postsRequest.request.params.get('per_page')).toBe('20');
    expect(postsRequest.request.params.has('search')).toBe(false);
    expect(postsRequest.request.params.has('categories')).toBe(false);

    postsRequest.flush(
      [
        {
          id: 1,
          slug: 'sem-imagem',
          date: '2026-09-02T12:00:00',
          title: { rendered: 'Sem imagem' },
          excerpt: { rendered: '<p>Resumo.</p>' },
          featured_media: 0,
          categories: [],
        },
      ],
      {
        headers: {
          'X-WP-Total': '1',
          'X-WP-TotalPages': '1',
        },
      },
    );

    httpTesting.expectOne((request) => request.url === `${apiUrl}/categories`).flush([]);
    httpTesting.expectNone((request) => request.url === `${apiUrl}/media`);

    expect(result).toEqual({
      posts: [
        {
          id: 1,
          slug: 'sem-imagem',
          title: 'Sem imagem',
          excerpt: 'Resumo.',
          publishedAt: '2026-09-02',
          category: '',
          coverImageUrl: undefined,
          coverImageAlt: undefined,
        },
      ],
      page: 1,
      perPage: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('should limit perPage to the WordPress maximum of 100', () => {
    service.getPosts({ perPage: 500 }).subscribe();

    const postsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);

    expect(postsRequest.request.params.get('per_page')).toBe('100');

    postsRequest.flush([], {
      headers: {
        'X-WP-Total': '0',
        'X-WP-TotalPages': '0',
      },
    });

    httpTesting.expectOne((request) => request.url === `${apiUrl}/categories`).flush([]);
    httpTesting.expectNone((request) => request.url === `${apiUrl}/media`);
  });
});
