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
    expect(postsRequest.request.params.get('categories_exclude')).toBe('43,97');
    expect(postsRequest.request.params.get('tags')).toBe('9');
    expect(postsRequest.request.params.get('_embed')).toBe('wp:featuredmedia');
    expect(postsRequest.request.params.get('_fields')).toContain('featured_media');
    expect(postsRequest.request.params.get('_fields')).toContain('_embedded');

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
          _embedded: {
            'wp:featuredmedia': [
              {
                id: 6453,
                source_url: 'https://example.com/cover.jpg',
                alt_text: 'Capa do post',
                media_details: {
                  sizes: {
                    medium_large: { source_url: 'https://example.com/cover-768.jpg' },
                  },
                },
              },
            ],
          },
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

    categoriesRequest.flush([
      { id: 41, name: 'Bruna', slug: 'bruna', parent: 0 },
      { id: 45, name: 'Pensamentos &amp; Ensaios', slug: 'pensamentos', parent: 41 },
      { id: 97, name: 'Sanakaverse', slug: 'sanakaverse', parent: 0 },
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
          coverImageUrl: 'https://example.com/cover-768.jpg',
          coverImageAlt: 'Capa do post',
        },
      ],
      page: 2,
      perPage: 20,
      total: 99,
      totalPages: 5,
    });
  });

  it('should use 20 posts per page and handle posts without embedded media', () => {
    let result: PostsPage | undefined;

    service.getPosts().subscribe((postsPage) => {
      result = postsPage;
    });

    const postsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);

    expect(postsRequest.request.params.get('page')).toBe('1');
    expect(postsRequest.request.params.get('per_page')).toBe('20');
    expect(postsRequest.request.params.has('search')).toBe(false);
    expect(postsRequest.request.params.has('categories')).toBe(false);
    expect(postsRequest.request.params.get('categories_exclude')).toBe('43,97');
    expect(postsRequest.request.params.get('_embed')).toBe('wp:featuredmedia');

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

    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/categories`)
      .flush([{ id: 97, name: 'Sanakaverse', slug: 'sanakaverse', parent: 0 }]);
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

  it('should not render Sanakaverse volumes if WordPress recreates the category with another ID', () => {
    let result: PostsPage | undefined;

    service.getPosts().subscribe((postsPage) => {
      result = postsPage;
    });

    const postsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);

    expect(postsRequest.request.params.get('categories_exclude')).toBe('43,97');

    postsRequest.flush(
      [
        {
          id: 1,
          slug: 'publicacao-sanaka',
          date: '2026-10-09T12:00:00',
          title: { rendered: 'Publicação Sanaka' },
          excerpt: { rendered: '<p>Permanece no arquivo.</p>' },
          featured_media: 0,
          categories: [45],
        },
        {
          id: 2,
          slug: 'volume-sanakaverse',
          date: '2026-10-09T13:00:00',
          title: { rendered: 'Volume do Sanakaverse' },
          excerpt: { rendered: '<p>Deve ficar somente na biblioteca.</p>' },
          featured_media: 0,
          categories: [108],
        },
      ],
      {
        headers: {
          'X-WP-Total': '2',
          'X-WP-TotalPages': '1',
        },
      },
    );

    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/categories`)
      .flush([
        { id: 45, name: 'Pensamentos', slug: 'pensamentos', parent: 0 },
        { id: 108, name: 'Sanakaverse', slug: 'sanakaverse', parent: 0 },
      ]);

    expect(result?.posts.map((post) => post.slug)).toEqual(['publicacao-sanaka']);
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

    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/categories`)
      .flush([{ id: 97, name: 'Sanakaverse', slug: 'sanakaverse', parent: 0 }]);
    httpTesting.expectNone((request) => request.url === `${apiUrl}/media`);
  });

  it('should resolve readable category and tag slugs before loading posts', () => {
    service.getPosts({ categorySlug: 'de-preto', tagSlug: 'despertar' }).subscribe();

    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/categories`)
      .flush([
        { id: 46, name: 'De Preto', slug: 'de-preto', parent: 41 },
        { id: 97, name: 'Sanakaverse', slug: 'sanakaverse', parent: 0 },
      ]);
    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/tags`)
      .flush([{ id: 12, name: 'Despertar', slug: 'despertar' }]);

    const postsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);

    expect(postsRequest.request.params.get('categories')).toBe('46');
    expect(postsRequest.request.params.get('categories_exclude')).toBe('43,97');
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
    expect(postRequest.request.params.get('_embed')).toBe('wp:featuredmedia');
    expect(postRequest.request.params.get('_fields')).toContain('_embedded');
    expect(postRequest.request.params.get('_fields')).toContain('sanaka_character_slug');
    expect(postRequest.request.params.get('_fields')).toContain('sanaka_obolo_front');

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
        sanaka_character_slug: 'nandini',
        sanaka_character_name: 'Nandinī',
        sanaka_obolo_front: 'https://example.com/nandini-obolo-front.webp',
        sanaka_obolo_back: 'https://example.com/nandini-obolo-back.webp',
        _embedded: {
          'wp:featuredmedia': [
            {
              id: 90,
              source_url: 'https://example.com/voce.jpg',
              alt_text: 'Maya no santuário',
            },
          ],
        },
      },
    ]);

    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/categories`)
      .flush([
        { id: 41, name: 'Bruna', slug: 'bruna', parent: 0 },
        { id: 45, name: 'Pensamentos', slug: 'pensamentos', parent: 41 },
        { id: 43, name: 'Romance', slug: 'romance', parent: 41 },
        { id: 62, name: 'Sobre', slug: 'sobre', parent: 0 },
        { id: 97, name: 'Sanakaverse', slug: 'sanakaverse', parent: 0 },
      ]);
    const tagsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/tags`);
    expect(tagsRequest.request.params.get('per_page')).toBe('100');
    expect(tagsRequest.request.params.has('include')).toBe(false);
    tagsRequest.flush([
      { id: 8, name: 'Identidade', slug: 'identidade' },
      { id: 9, name: 'Existência', slug: 'existencia' },
      { id: 10, name: 'Consciência', slug: 'consciencia' },
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
        (request) => request.request.params.get('categories_exclude') === '43,97',
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
      obolo: {
        characterSlug: 'nandini',
        characterName: 'Nandinī',
        frontImageUrl: 'https://example.com/nandini-obolo-front.webp',
        backImageUrl: 'https://example.com/nandini-obolo-back.webp',
      },
      previous: { slug: 'anterior', title: 'Anterior' },
      next: { slug: 'proxima', title: 'Próxima' },
    });
  });

  it('should keep Sanakaverse volumes readable by slug and navigate only inside the collection', () => {
    service.getPostBySlug('mors').subscribe();

    const postRequest = httpTesting.expectOne(
      (request) => request.url === `${apiUrl}/posts` && request.params.get('slug') === 'mors',
    );

    expect(postRequest.request.params.get('categories_exclude')).toBe('43');

    postRequest.flush([
      {
        id: 91,
        slug: 'mors',
        date: '2026-09-30T12:00:00',
        title: { rendered: 'MORS' },
        excerpt: { rendered: '<p>Um volume do Sanakaverse.</p>' },
        content: { rendered: '<p>Conteúdo do volume.</p>' },
        featured_media: 0,
        categories: [97],
        tags: [],
      },
    ]);

    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/categories`)
      .flush([{ id: 97, name: 'Sanakaverse', slug: 'sanakaverse', parent: 0 }]);
    httpTesting.expectOne((request) => request.url === `${apiUrl}/tags`).flush([]);

    const adjacentRequests = httpTesting.match(
      (request) =>
        request.url === `${apiUrl}/posts` &&
        (request.params.has('before') || request.params.has('after')),
    );

    expect(adjacentRequests).toHaveLength(2);
    expect(
      adjacentRequests.every(
        (request) =>
          request.request.params.get('categories') === '97' &&
          request.request.params.get('categories_exclude') === '43',
      ),
    ).toBe(true);

    adjacentRequests.forEach((request) => request.flush([]));
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
