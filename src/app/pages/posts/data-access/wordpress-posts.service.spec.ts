import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PostDetail } from '../post';
import { PostsPage, WORDPRESS_API_URL, WordPressPostsService } from './wordpress-posts.service';

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
        tagId: 9,
      })
      .subscribe((postsPage) => {
        result = postsPage;
      });

    const postsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);

    expect(postsRequest.request.params.get('page')).toBe('2');
    expect(postsRequest.request.params.get('per_page')).toBe('20');
    expect(postsRequest.request.params.get('search')).toBe('medo');
    expect(postsRequest.request.params.get('categories')).toBe('45');
    expect(postsRequest.request.params.get('categories_exclude')).toBe('43');
    expect(postsRequest.request.params.get('tags')).toBe('9');
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
    expect(postsRequest.request.params.get('categories_exclude')).toBe('43');

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

  it('should resolve readable category and tag slugs before loading posts', () => {
    service.getPosts({ categorySlug: 'de-preto', tagSlug: 'despertar' }).subscribe();

    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/categories`)
      .flush([{ id: 46, name: 'De Preto', slug: 'de-preto', parent: 41 }]);
    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/tags`)
      .flush([{ id: 12, name: 'Despertar', slug: 'despertar' }]);

    const postsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);

    expect(postsRequest.request.params.get('categories')).toBe('46');
    expect(postsRequest.request.params.get('categories_exclude')).toBe('43');
    expect(postsRequest.request.params.get('tags')).toBe('12');

    postsRequest.flush([], {
      headers: {
        'X-WP-Total': '0',
        'X-WP-TotalPages': '0',
      },
    });
    httpTesting.expectNone((request) => request.url === `${apiUrl}/media`);
  });

  it('should load a complete post with category lineage, tags, media and adjacent posts', () => {
    let result: PostDetail | null | undefined;

    service.getPostBySlug('voce').subscribe((post) => {
      result = post;
    });

    const postRequest = httpTesting.expectOne(
      (request) => request.url === `${apiUrl}/posts` && request.params.get('slug') === 'voce',
    );

    expect(postRequest.request.params.get('categories_exclude')).toBe('43');

    postRequest.flush([
      {
        id: 77,
        slug: 'voce',
        date: '2026-09-22T12:00:00',
        title: { rendered: 'VOCÊ' },
        excerpt: { rendered: '<p>Quem é você?</p>' },
        content: { rendered: '<p>Quem é <strong>você</strong>?</p><script>bad()</script>' },
        featured_media: 90,
        categories: [45],
        tags: [8, 9],
      },
    ]);

    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/categories`)
      .flush([
        { id: 41, name: 'Bruna', slug: 'bruna', parent: 0 },
        { id: 45, name: 'Pensamentos', slug: 'pensamentos', parent: 41 },
        { id: 43, name: 'Romance', slug: 'romance', parent: 41 },
        { id: 62, name: 'Sobre', slug: 'sobre', parent: 0 },
      ]);
    const tagsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/tags`);
    expect(tagsRequest.request.params.get('per_page')).toBe('100');
    expect(tagsRequest.request.params.has('include')).toBe(false);
    tagsRequest.flush([
      { id: 8, name: 'Identidade', slug: 'identidade' },
      { id: 9, name: 'Existência', slug: 'existencia' },
      { id: 10, name: 'Consciência', slug: 'consciencia' },
    ]);
    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/media`)
      .flush([
        { id: 90, source_url: 'https://example.com/voce.jpg', alt_text: 'Maya no santuário' },
      ]);

    expect(result?.slug).toBe('voce');
    expect(result?.title).toBe('VOCÊ');
    expect(result?.previous).toBeUndefined();
    expect(result?.next).toBeUndefined();

    const adjacentRequests = httpTesting.match(
      (request) =>
        request.url === `${apiUrl}/posts` &&
        (request.params.has('before') || request.params.has('after')),
    );

    expect(adjacentRequests).toHaveLength(2);
    expect(
      adjacentRequests.every(
        (request) => request.request.params.get('categories_exclude') === '43',
      ),
    ).toBe(true);

    adjacentRequests
      .find((request) => request.request.params.has('before'))
      ?.flush([{ slug: 'anterior', title: { rendered: 'Anterior' } }]);
    adjacentRequests
      .find((request) => request.request.params.has('after'))
      ?.flush([{ slug: 'proxima', title: { rendered: 'Próxima' } }]);

    expect(result).toMatchObject({
      slug: 'voce',
      title: 'VOCÊ',
      contentHtml: '<p>Quem &#233; <strong>voc&#234;</strong>?</p>',
      coverImageUrl: 'https://example.com/voce.jpg',
      categories: [
        { id: 41, name: 'Bruna', slug: 'bruna' },
        { id: 45, name: 'Pensamentos', slug: 'pensamentos' },
      ],
      tags: [
        { id: 8, name: 'Identidade', slug: 'identidade' },
        { id: 9, name: 'Existência', slug: 'existencia' },
      ],
      relatedCategories: [],
      exploreCategories: [{ id: 62, name: 'Sobre', slug: 'sobre' }],
      exploreTags: [{ id: 10, name: 'Consciência', slug: 'consciencia' }],
      previous: { slug: 'anterior', title: 'Anterior' },
      next: { slug: 'proxima', title: 'Próxima' },
    });
  });

  it('should use the Sanaka fallback image when a complete post has no featured media', () => {
    let coverImageUrl: string | undefined;

    service.getPostBySlug('sem-imagem').subscribe((post) => {
      coverImageUrl = post?.coverImageUrl;
    });

    httpTesting
      .expectOne(
        (request) =>
          request.url === `${apiUrl}/posts` && request.params.get('slug') === 'sem-imagem',
      )
      .flush([
        {
          id: 88,
          slug: 'sem-imagem',
          date: '2026-09-23T12:00:00',
          title: { rendered: 'Sem imagem' },
          excerpt: { rendered: '<p>Resumo.</p>' },
          content: { rendered: '<p>Conteúdo.</p>' },
          featured_media: 0,
          categories: [],
          tags: [],
        },
      ]);

    httpTesting.expectOne((request) => request.url === `${apiUrl}/categories`).flush([]);
    httpTesting.expectOne((request) => request.url === `${apiUrl}/tags`).flush([]);
    httpTesting.expectNone((request) => request.url === `${apiUrl}/media`);
    httpTesting
      .match(
        (request) =>
          request.url === `${apiUrl}/posts` &&
          (request.params.has('before') || request.params.has('after')),
      )
      .forEach((request) => request.flush([]));

    expect(coverImageUrl).toBe('/images/posts/posts-atmosphere-desktop.webp');
  });
});
