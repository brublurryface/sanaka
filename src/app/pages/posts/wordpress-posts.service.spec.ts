import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Post } from './post';
import { WORDPRESS_API_URL, WordPressPostsService } from './wordpress-posts.service';

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

  it('should load and map posts, categories and unique featured media', () => {
    let result: readonly Post[] | undefined;

    service.getPosts().subscribe((posts) => {
      result = posts;
    });

    const postsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);

    expect(postsRequest.request.params.get('per_page')).toBe('100');
    expect(postsRequest.request.params.get('_fields')).toContain('featured_media');

    postsRequest.flush([
      {
        id: 6667,
        slug: 'eu-nao-entendi',
        date: '2023-06-20T19:54:33',
        title: { rendered: 'Eu &amp; o medo' },
        excerpt: { rendered: '<p>Primeiro trecho.</p><p>Segundo trecho&#8230;</p>' },
        featured_media: 6453,
        categories: [41, 45],
      },
      {
        id: 6662,
        slug: 'outro-post',
        date: '2022-09-16T21:53:53',
        title: { rendered: 'Outro post' },
        excerpt: { rendered: '<p>Outro resumo.</p>' },
        featured_media: 6453,
        categories: [45],
      },
    ]);

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

    expect(result).toEqual([
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
      {
        id: 6662,
        slug: 'outro-post',
        title: 'Outro post',
        excerpt: 'Outro resumo.',
        publishedAt: '2022-09-16',
        category: 'Pensamentos & Ensaios',
        coverImageUrl: 'https://example.com/cover.jpg',
        coverImageAlt: 'Capa do post',
      },
    ]);
  });

  it('should skip the media request when posts have no featured images', () => {
    let result: readonly Post[] | undefined;

    service.getPosts().subscribe((posts) => {
      result = posts;
    });

    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/posts`)
      .flush([
        {
          id: 1,
          slug: 'sem-imagem',
          date: '2026-09-02T12:00:00',
          title: { rendered: 'Sem imagem' },
          excerpt: { rendered: '<p>Resumo.</p>' },
          featured_media: 0,
          categories: [],
        },
      ]);

    httpTesting.expectOne((request) => request.url === `${apiUrl}/categories`).flush([]);
    httpTesting.expectNone((request) => request.url === `${apiUrl}/media`);

    expect(result).toEqual([
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
    ]);
  });
});
