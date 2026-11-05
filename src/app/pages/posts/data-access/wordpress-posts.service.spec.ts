import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, switchMap } from 'rxjs';
import { vi } from 'vitest';

import { ResolvedWordPressContentPolicy } from '../../../core/wordpress/wordpress-content-policy';
import { WordPressContentPolicyService } from '../../../core/wordpress/wordpress-content-policy.service';
import { PostCategory, PostDetail } from '../post';
import { PostsPage, WORDPRESS_API_URL, WordPressPostsService } from './wordpress-posts.service';

describe('WordPressPostsService', () => {
  let httpTesting: HttpTestingController;
  let service: WordPressPostsService;

  const apiUrl = 'https://example.com/wp-json/wp/v2';
  const defaultPolicy: ResolvedWordPressContentPolicy = {
    excludedCategoryIds: [43],
    aboutCycleCategoryId: 62,
    sanakaverseCategoryId: 97,
  };
  const editorialPolicy = { resolve: vi.fn<() => Observable<ResolvedWordPressContentPolicy>>() };

  beforeEach(() => {
    editorialPolicy.resolve.mockReturnValue(of(defaultPolicy));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WordPressContentPolicyService, useValue: editorialPolicy },
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
    vi.useRealTimers();
    httpTesting.verify();
  });

  it('revalidates the shared category tree after five minutes instead of retaining it forever', () => {
    vi.useFakeTimers();
    service.getArchiveCategories().subscribe();
    httpTesting.expectOne((request) => request.url === `${apiUrl}/categories`).flush([]);
    vi.advanceTimersByTime(299_999);
    service.getArchiveCategories().subscribe();
    httpTesting.expectNone((request) => request.url === `${apiUrl}/categories`);
    vi.advanceTimersByTime(1);
    service.getArchiveCategories().subscribe();
    httpTesting.expectOne((request) => request.url === `${apiUrl}/categories`).flush([]);
  });

  function finishEmptyTagSuggestions() {
    httpTesting
      .expectOne((request) => request.params.get('_fields') === 'tags,categories')
      .flush([]);
  }

  const tagHeaders = { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' };

  it('should expose decoded archive category hierarchy and omit excluded branches', () => {
    editorialPolicy.resolve.mockReturnValue(of({ ...defaultPolicy, sanakaverseCategoryId: 108 }));
    let result: readonly PostCategory[] | undefined;
    service.getArchiveCategories().subscribe((categories) => {
      result = categories;
    });
    const request = httpTesting.expectOne((request) => request.url === `${apiUrl}/categories`);
    request.flush([
      { id: 41, name: 'Bruna', slug: 'bruna', parent: 0 },
      { id: 45, name: 'Pensamentos &amp; Ensaios', slug: 'pensamentos', parent: 41 },
      { id: 43, name: 'Romance', slug: 'romance', parent: 0 },
      { id: 109, name: 'Privado', slug: 'privado', parent: 43 },
      { id: 111, name: 'Volume', slug: 'volume', parent: 110 },
      { id: 110, name: 'Coleção', slug: 'colecao', parent: 108 },
      { id: 108, name: 'Sanakaverse', slug: 'sanakaverse', parent: 0 },
    ]);
    expect(result).toEqual([
      { id: 41, name: 'Bruna', slug: 'bruna', parentId: 0 },
      { id: 45, name: 'Pensamentos & Ensaios', slug: 'pensamentos', parentId: 41 },
    ]);
    service.getArchiveCategories().subscribe((categories) => expect(categories).toEqual(result));
    httpTesting.expectNone((request) => request.url === `${apiUrl}/categories`);
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
    expect(postsRequest.request.params.get('categories_exclude[terms]')).toBe('43,97');
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
          categories: [
            { id: 41, name: 'Bruna', slug: 'bruna' },
            { id: 45, name: 'Pensamentos & Ensaios', slug: 'pensamentos' },
          ],
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
    expect(postsRequest.request.params.get('categories_exclude[terms]')).toBe('43,97');
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
          categories: [],
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

  it('should exclude migrated volumes before WordPress counts and paginates the archive', () => {
    editorialPolicy.resolve.mockReturnValue(of({ ...defaultPolicy, sanakaverseCategoryId: 108 }));
    let result: PostsPage | undefined;
    const origin = Array.from({ length: 20 }, (_, index) => ({
      id: index + 1,
      slug: `publicacao-${index + 1}`,
      date: '2026-10-09T12:00:00',
      title: { rendered: `Publicacao ${index + 1}` },
      excerpt: { rendered: '<p>Resumo.</p>' },
      featured_media: 0,
      categories: index < 15 ? [45] : [108],
    }));
    service.getPosts().subscribe((page) => {
      result = page;
    });
    const postsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);
    const excluded = (postsRequest.request.params.get('categories_exclude[terms]') ?? '')
      .split(',')
      .map(Number);
    // Simula o WordPress aplicando o filtro recebido antes de contar e paginar.
    const filteredAtOrigin = origin.filter(
      (post) => !post.categories.some((id) => excluded.includes(id)),
    );
    postsRequest.flush(filteredAtOrigin, {
      headers: { 'X-WP-Total': String(filteredAtOrigin.length), 'X-WP-TotalPages': '1' },
    });
    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/categories`)
      .flush([
        { id: 43, name: 'Romance', slug: 'romance', parent: 0 },
        { id: 45, name: 'Pensamentos', slug: 'pensamentos', parent: 0 },
        { id: 108, name: 'Sanakaverse', slug: 'sanakaverse', parent: 0 },
      ]);
    expect(result?.posts).toHaveLength(15);
    expect(result?.total).toBe(15);
    expect(result?.totalPages).toBe(1);
    expect(excluded).toContain(108);
    expect(excluded).not.toContain(97);
  });

  it.each(['categorySlug', 'tagSlug'] as const)(
    'should return an empty archive without a post query when %s no longer exists',
    (filter) => {
      let result: PostsPage | undefined;
      service.getPosts({ [filter]: 'apagada' }).subscribe((page) => {
        result = page;
      });
      httpTesting
        .match(
          (request) => request.url === `${apiUrl}/categories` || request.url === `${apiUrl}/tags`,
        )
        .forEach((request) => request.flush([]));
      const posts = httpTesting.match((request) => request.url === `${apiUrl}/posts`);
      posts.forEach((request) =>
        request.flush([], { headers: { 'X-WP-Total': '0', 'X-WP-TotalPages': '0' } }),
      );
      httpTesting
        .match((request) => request.url === `${apiUrl}/categories`)
        .forEach((request) => request.flush([]));
      expect(result?.posts).toEqual([]);
      expect(result?.total).toBe(0);
      expect(result?.totalPages).toBe(0);
      expect(posts).toHaveLength(0);
    },
  );

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
    expect(postsRequest.request.params.get('categories_exclude[terms]')).toBe('43,97');
    expect(postsRequest.request.params.get('tags')).toBe('12');

    postsRequest.flush([], {
      headers: {
        'X-WP-Total': '0',
        'X-WP-TotalPages': '0',
      },
    });
    httpTesting.expectNone((request) => request.url === `${apiUrl}/media`);
  });

  it('should expose a domain error for a WordPress page outside the archive range', () => {
    let error: unknown;
    service.getPosts({ page: 999999 }).subscribe({
      error: (value) => {
        error = value;
      },
    });
    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/posts`)
      .flush(
        { code: 'rest_post_invalid_page_number', data: { status: 400 } },
        { status: 400, statusText: 'Bad Request' },
      );
    httpTesting
      .match((request) => request.url === `${apiUrl}/categories`)
      .filter((request) => !request.cancelled)
      .forEach((request) => request.flush([]));
    expect(error).toMatchObject({ name: 'PostsPageOutOfRangeError' });
  });

  it.each([
    [400, 'rest_invalid_param'],
    [403, 'rest_post_invalid_page_number'],
    [503, 'rest_post_invalid_page_number'],
  ] as const)(
    'should preserve an essential HTTP %s with code %s instead of declaring a page out of range',
    (status, code) => {
      let error: unknown;
      service.getPosts({ page: 2 }).subscribe({
        error: (value) => {
          error = value;
        },
      });
      httpTesting
        .expectOne((request) => request.url === `${apiUrl}/posts`)
        .flush({ code }, { status, statusText: 'Failure' });
      httpTesting
        .match((request) => request.url === `${apiUrl}/categories`)
        .filter((request) => !request.cancelled)
        .forEach((request) => request.flush([]));
      expect(error).toMatchObject({ name: 'HttpErrorResponse', status });
    },
  );

  it('should load a complete post with category lineage, tags, media and adjacent posts', () => {
    let result: PostDetail | null | undefined;

    service.getPostBySlug('voce').subscribe((post) => {
      result = post;
    });

    const postRequest = httpTesting.expectOne(
      (request) => request.url === `${apiUrl}/posts` && request.params.get('slug') === 'voce',
    );

    expect(postRequest.request.params.get('categories_exclude[terms]')).toBe('43');
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
              alt_text: 'Samvit no santuário',
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
    expect(tagsRequest.request.params.get('post')).toBe('77');
    expect(tagsRequest.request.params.has('include')).toBe(false);
    tagsRequest.flush(
      [
        { id: 8, name: 'Identidade', slug: 'identidade' },
        { id: 9, name: 'Existência', slug: 'existencia' },
      ],
      { headers: { 'X-WP-Total': '2', 'X-WP-TotalPages': '1' } },
    );
    httpTesting
      .expectOne((request) => request.params.get('_fields') === 'tags,categories')
      .flush([{ categories: [45], tags: [10] }]);
    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/tags` && request.params.has('include'))
      .flush([{ id: 10, name: 'Consciência', slug: 'consciencia' }]);
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
        (request) => request.request.params.get('categories_exclude[terms]') === '43,97',
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

    expect(postRequest.request.params.get('categories_exclude[terms]')).toBe('43');

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
    finishEmptyTagSuggestions();
    httpTesting.expectNone((request) => request.url === `${apiUrl}/tags`);

    const adjacentRequests = httpTesting.match(
      (request) =>
        request.url === `${apiUrl}/posts` &&
        (request.params.has('before') || request.params.has('after')),
    );

    expect(adjacentRequests).toHaveLength(2);
    expect(
      adjacentRequests.every(
        (request) =>
          request.request.params.get('categories[terms]') === '97' &&
          request.request.params.get('categories_exclude[terms]') === '43',
      ),
    ).toBe(true);

    adjacentRequests.forEach((request) => request.flush([]));
  });

  describe('post detail resilience', () => {
    const post = {
      id: 77,
      slug: 'voce',
      date: '2026-09-22T12:00:00',
      title: { rendered: 'VOCÊ' },
      excerpt: { rendered: '<p>Resumo.</p>' },
      content: { rendered: '<p>Corpo preservado.</p>' },
      featured_media: 0,
      categories: [45],
      tags: [8],
    };
    const categories = [
      { id: 41, name: 'Bruna', slug: 'bruna', parent: 0 },
      { id: 45, name: 'Pensamentos', slug: 'pensamentos', parent: 41 },
      { id: 97, name: 'Sanakaverse', slug: 'sanakaverse', parent: 0 },
    ];
    const tags = [{ id: 8, name: 'Identidade', slug: 'identidade' }];

    afterEach(() => vi.useRealTimers());

    function watchDetail(slug = 'voce') {
      const values: (PostDetail | null)[] = [];
      const errors: unknown[] = [];
      const complete = vi.fn();
      const subscription = service.getPostBySlug(slug).subscribe({
        next: (value) => values.push(value),
        error: (error) => errors.push(error),
        complete,
      });
      const request = httpTesting.expectOne(
        (request) => request.url === `${apiUrl}/posts` && request.params.get('slug') === slug,
      );
      return { values, errors, complete, subscription, request };
    }

    function flushTaxonomies() {
      httpTesting.expectOne((request) => request.url === `${apiUrl}/categories`).flush(categories);
      httpTesting
        .expectOne((request) => request.url === `${apiUrl}/tags`)
        .flush(tags, { headers: tagHeaders });
      finishEmptyTagSuggestions();
    }

    function adjacentRequests() {
      return {
        previous: httpTesting.expectOne((request) => request.params.has('before')),
        next: httpTesting.expectOne((request) => request.params.has('after')),
      };
    }

    function finishPendingTaxonomies() {
      const requests = httpTesting.match(
        (request) => request.url === `${apiUrl}/categories` || request.url === `${apiUrl}/tags`,
      );
      requests.filter((request) => !request.cancelled).forEach((request) => request.flush([]));
      return requests;
    }

    it('should expose the article before categories or tags respond', () => {
      const result = watchDetail();
      result.request.flush([post]);
      const early = result.values.at(-1);
      flushTaxonomies();
      const navigation = adjacentRequests();
      navigation.previous.flush([]);
      navigation.next.flush([]);

      expect(early?.contentHtml).toBe('<p>Corpo preservado.</p>');
      expect(early?.slug).toBe('voce');
      expect(result.errors).toEqual([]);
    });

    it.each(['previous', 'next', 'both'] as const)(
      'should preserve the article and any healthy navigation when %s fails',
      (failed) => {
        const result = watchDetail();
        result.request.flush([post]);
        flushTaxonomies();
        const navigation = adjacentRequests();
        const failedSides = failed === 'both' ? (['previous', 'next'] as const) : [failed];
        for (const side of failedSides) {
          if (!navigation[side].cancelled) {
            navigation[side].flush(null, { status: 503, statusText: 'Unavailable' });
          }
        }
        for (const side of ['previous', 'next'] as const) {
          if (!failedSides.includes(side) && !navigation[side].cancelled) {
            navigation[side].flush([{ slug: side, title: { rendered: side } }]);
          }
        }

        expect(result.errors).toEqual([]);
        expect(result.values.at(-1)?.contentHtml).toBe('<p>Corpo preservado.</p>');
        for (const side of ['previous', 'next'] as const) {
          expect(result.values.at(-1)?.[side]?.slug).toBe(
            failedSides.includes(side) ? undefined : side,
          );
        }
        expect(result.complete).toHaveBeenCalledOnce();
      },
    );

    it('should expose each navigation link as soon as it responds', () => {
      const result = watchDetail();
      result.request.flush([post]);
      flushTaxonomies();
      const navigation = adjacentRequests();
      navigation.next.flush([{ slug: 'seguinte', title: { rendered: 'Seguinte' } }]);
      const earlyNext = result.values.at(-1)?.next;
      navigation.previous.flush([]);

      expect(earlyNext?.slug).toBe('seguinte');
      expect(result.errors).toEqual([]);
    });

    it('should retain navigation and categories when tags fail', () => {
      const result = watchDetail();
      result.request.flush([post]);
      httpTesting.expectOne((request) => request.url === `${apiUrl}/categories`).flush(categories);
      finishEmptyTagSuggestions();
      httpTesting
        .expectOne((request) => request.url === `${apiUrl}/tags`)
        .flush(null, { status: 503, statusText: 'Unavailable' });
      const navigation = httpTesting.match(
        (request) => request.params.has('before') || request.params.has('after'),
      );
      navigation
        .filter((request) => !request.cancelled)
        .forEach((request) => request.flush([{ slug: 'vizinho', title: { rendered: 'Vizinho' } }]));

      expect(result.errors).toEqual([]);
      expect(result.values.at(-1)?.contentHtml).toBe('<p>Corpo preservado.</p>');
      expect(result.values.at(-1)?.categories.map((category) => category.slug)).toEqual([
        'bruna',
        'pensamentos',
      ]);
      expect(result.values.at(-1)?.tags).toEqual([]);
      expect(result.values.at(-1)?.next?.slug).toBe('vizinho');
    });

    it('should retain the volume and tags without guessing navigation if categories fail', () => {
      const result = watchDetail();
      result.request.flush([{ ...post, categories: [97] }]);
      httpTesting
        .expectOne((request) => request.url === `${apiUrl}/categories`)
        .flush(null, { status: 503, statusText: 'Unavailable' });
      const tagRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/tags`);
      if (!tagRequest.cancelled) tagRequest.flush(tags, { headers: tagHeaders });

      expect(result.errors).toEqual([]);
      expect(result.values.at(-1)?.contentHtml).toBe('<p>Corpo preservado.</p>');
      expect(result.values.at(-1)?.tags[0]?.slug).toBe('identidade');
      expect(result.values.at(-1)?.previous).toBeUndefined();
      expect(result.values.at(-1)?.next).toBeUndefined();
      httpTesting.expectNone(
        (request) => request.params.has('before') || request.params.has('after'),
      );
    });

    it('should retain the article when both taxonomy requests fail', () => {
      const result = watchDetail();
      result.request.flush([post]);
      for (const endpoint of ['categories', 'tags']) {
        const request = httpTesting.expectOne((request) => request.url === `${apiUrl}/${endpoint}`);
        if (!request.cancelled) request.flush(null, { status: 503, statusText: 'Unavailable' });
      }

      expect(result.errors).toEqual([]);
      expect(result.values.at(-1)?.contentHtml).toBe('<p>Corpo preservado.</p>');
      expect(result.complete).toHaveBeenCalledOnce();
    });

    it('should return not-found without requesting optional taxonomies', () => {
      const result = watchDetail('ausente');
      result.request.flush([]);
      const taxonomies = finishPendingTaxonomies();

      expect(taxonomies).toHaveLength(0);
      expect(result.values).toEqual([null]);
      expect(result.errors).toEqual([]);
      expect(result.complete).toHaveBeenCalledOnce();
    });

    it('should reject a WoD post even if the upstream response ignores the exclusion filter', () => {
      const result = watchDetail();
      expect(result.request.request.params.get('categories_exclude[terms]')).toBe('43');
      result.request.flush([{ ...post, categories: [43, 97] }]);
      finishPendingTaxonomies();
      const navigation = httpTesting.match(
        (request) => request.params.has('before') || request.params.has('after'),
      );
      navigation.filter((request) => !request.cancelled).forEach((request) => request.flush([]));

      expect(result.values).toEqual([null]);
      expect(navigation).toHaveLength(0);
    });

    it('should preserve an essential HTTP failure instead of reporting not-found', () => {
      const result = watchDetail();
      result.request.flush(null, { status: 503, statusText: 'Unavailable' });
      finishPendingTaxonomies();

      expect(result.values).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({ status: 503 });
      expect(result.complete).not.toHaveBeenCalled();
    });

    it.each(['previous', 'next'] as const)(
      'should bound a stalled %s request without discarding the other link',
      (stalled) => {
        vi.useFakeTimers();
        const result = watchDetail();
        result.request.flush([post]);
        flushTaxonomies();
        const navigation = adjacentRequests();
        const healthy = stalled === 'previous' ? 'next' : 'previous';
        navigation[healthy].flush([{ slug: healthy, title: { rendered: healthy } }]);
        vi.advanceTimersByTime(10_001);
        result.subscription.unsubscribe();

        expect(result.errors).toEqual([]);
        expect(result.values.at(-1)?.[healthy]?.slug).toBe(healthy);
        expect(result.values.at(-1)?.[stalled]).toBeUndefined();
        expect(result.complete).toHaveBeenCalledOnce();
        expect(navigation[stalled].cancelled).toBe(true);
      },
    );

    it.each(['categories', 'tags'] as const)(
      'should bound stalled %s without hiding the article',
      (stalled) => {
        vi.useFakeTimers();
        const result = watchDetail();
        result.request.flush([post]);
        const categoryRequest = httpTesting.expectOne(
          (request) => request.url === `${apiUrl}/categories`,
        );
        const tagRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/tags`);
        if (stalled === 'categories') {
          tagRequest.flush(tags, { headers: tagHeaders });
        } else {
          categoryRequest.flush(categories);
          finishEmptyTagSuggestions();
          httpTesting
            .match((request) => request.params.has('before') || request.params.has('after'))
            .forEach((request) => request.flush([]));
        }
        const early = result.values.at(-1);
        vi.advanceTimersByTime(10_001);
        result.subscription.unsubscribe();

        expect(early?.contentHtml).toBe('<p>Corpo preservado.</p>');
        expect(result.errors).toEqual([]);
        expect(result.values.at(-1)?.contentHtml).toBe('<p>Corpo preservado.</p>');
        expect(result.complete).toHaveBeenCalledOnce();
        expect((stalled === 'categories' ? categoryRequest : tagRequest).cancelled).toBe(true);
      },
    );

    it('should cancel stalled content and keep timeout distinct from not-found', () => {
      vi.useFakeTimers();
      const result = watchDetail();
      vi.advanceTimersByTime(10_001);
      finishPendingTaxonomies();

      expect(result.request.cancelled).toBe(true);
      expect(result.values).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({ name: 'TimeoutError' });
    });

    it('should cancel obsolete navigation and keep the latest slug active', () => {
      const slugs = new Subject<string>();
      const values: (PostDetail | null)[] = [];
      const subscription = slugs
        .pipe(switchMap((slug) => service.getPostBySlug(slug)))
        .subscribe((value) => values.push(value));
      slugs.next('voce');
      httpTesting.expectOne((request) => request.params.get('slug') === 'voce').flush([post]);
      flushTaxonomies();
      const oldNavigation = adjacentRequests();
      slugs.next('outro');
      httpTesting
        .expectOne((request) => request.params.get('slug') === 'outro')
        .flush([{ ...post, id: 78, slug: 'outro' }]);
      httpTesting
        .expectOne(
          (request) => request.url === `${apiUrl}/tags` && request.params.get('post') === '78',
        )
        .flush(tags, { headers: tagHeaders });
      finishEmptyTagSuggestions();
      const newNavigation = adjacentRequests();
      newNavigation.previous.flush([]);
      newNavigation.next.flush([]);
      subscription.unsubscribe();

      expect(oldNavigation.previous.cancelled).toBe(true);
      expect(oldNavigation.next.cancelled).toBe(true);
      expect(values.at(-1)?.slug).toBe('outro');
      httpTesting.expectNone(
        (request) => request.url === `${apiUrl}/categories` || request.url === `${apiUrl}/tags`,
      );
    });

    it('should cancel unfinished taxonomies when the detail is no longer observed', () => {
      const result = watchDetail();
      result.request.flush([post]);
      const categoryRequest = httpTesting.expectOne(
        (request) => request.url === `${apiUrl}/categories`,
      );
      const tagRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/tags`);
      result.subscription.unsubscribe();

      expect(categoryRequest.cancelled).toBe(true);
      expect(tagRequest.cancelled).toBe(true);
    });

    it('should retry failed taxonomies on a later reading instead of caching the fallback', () => {
      const first = watchDetail();
      first.request.flush([post]);
      for (const endpoint of ['categories', 'tags']) {
        const request = httpTesting.expectOne((request) => request.url === `${apiUrl}/${endpoint}`);
        if (!request.cancelled) request.flush(null, { status: 503, statusText: 'Unavailable' });
      }
      const second = watchDetail();
      second.request.flush([post]);
      flushTaxonomies();
      const navigation = adjacentRequests();
      navigation.previous.flush([]);
      navigation.next.flush([]);

      expect(first.errors).toEqual([]);
      expect(second.errors).toEqual([]);
      expect(second.values.at(-1)?.tags[0]?.slug).toBe('identidade');
      expect(second.values.at(-1)?.categories.at(-1)?.slug).toBe('pensamentos');
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
    httpTesting.expectNone((request) => request.url === `${apiUrl}/tags`);
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
