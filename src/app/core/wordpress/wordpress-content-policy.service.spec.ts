import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { vi } from 'vitest';

import { AboutCyclesService } from '../../pages/about/data-access/about-cycles.service';
import { WordPressPostsService } from '../../pages/posts/data-access/wordpress-posts.service';
import { SanakaverseBooksService } from '../../pages/sanakaverse/data-access/sanakaverse-books.service';
import { WORDPRESS_API_URL } from './wordpress-api';
import { WordPressContentPolicyService } from './wordpress-content-policy.service';

describe('WordPress editorial policy', () => {
  const apiUrl = 'https://example.com/wp-json/wp/v2';
  const categories = [
    { id: 201, name: 'Romance', slug: 'romance', parent: 0 },
    { id: 208, name: 'Sobre', slug: 'sobre', parent: 0 },
    { id: 108, name: 'Sanakaverse', slug: 'sanakaverse', parent: 0 },
    { id: 45, name: 'Pensamentos', slug: 'pensamentos', parent: 0 },
    { id: 900, name: 'WoD filho', slug: 'wod-filho', parent: 201 },
    { id: 901, name: 'Volumes', slug: 'volumes', parent: 108 },
  ];
  const article = {
    id: 77,
    slug: 'artigo',
    date: '2026-11-03T12:00:00',
    title: { rendered: 'Artigo' },
    excerpt: { rendered: '<p>Resumo.</p>' },
    content: { rendered: '<p>Leitura preservada.</p>' },
    featured_media: 0,
    categories: [45],
    tags: [],
  };
  let httpTesting: HttpTestingController;
  let policyService: WordPressContentPolicyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WORDPRESS_API_URL, useValue: apiUrl },
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    policyService = TestBed.inject(WordPressContentPolicyService);
  });
  afterEach(() => {
    vi.useRealTimers();
    httpTesting.verify();
  });

  function watch<T>(source: Observable<T>) {
    const next = vi.fn<(value: T) => void>();
    const error = vi.fn<(error: unknown) => void>();
    const complete = vi.fn<() => void>();
    const subscription = source.subscribe({ next, error, complete });
    return { next, error, complete, subscription };
  }
  function respondPolicy(response = categories) {
    const request = httpTesting.expectOne(
      (request) => request.url === `${apiUrl}/categories` && request.params.has('slug'),
    );
    request.flush(response);
    return request;
  }
  function respondCategories(response = categories) {
    const request = httpTesting.expectOne(
      (request) => request.url === `${apiUrl}/categories` && !request.params.has('slug'),
    );
    request.flush(response);
    return request;
  }

  it('should resolve current IDs by stable slugs and share a completed snapshot', () => {
    const result = watch(policyService.resolve());
    const request = respondPolicy();
    expect(request.request.params.get('slug')?.split(',')).toEqual([
      'romance',
      'sobre',
      'sanakaverse',
    ]);
    expect(request.request.params.get('_fields')).toBe('id,slug');
    expect(result.next).toHaveBeenCalledExactlyOnceWith({
      excludedCategoryIds: [201],
      aboutCycleCategoryId: 208,
      sanakaverseCategoryId: 108,
    });
    const reused = watch(policyService.resolve());
    expect(reused.next.mock.calls).toEqual(result.next.mock.calls);
    httpTesting.expectNone((request) => request.url === `${apiUrl}/categories`);
  });
  it('should share one pending policy request among concurrent consumers', () => {
    const first = watch(policyService.resolve());
    const second = watch(policyService.resolve());
    respondPolicy();
    expect(first.next.mock.calls).toEqual(second.next.mock.calls);
    expect(first.complete).toHaveBeenCalledOnce();
    expect(second.complete).toHaveBeenCalledOnce();
  });
  it('should cancel a pending policy lookup when no consumer remains', () => {
    const first = watch(policyService.resolve());
    const request = httpTesting.expectOne((request) => request.url === `${apiUrl}/categories`);
    first.subscription.unsubscribe();
    expect(request.cancelled).toBe(true);
    const retry = watch(policyService.resolve());
    respondPolicy();
    expect(retry.next).toHaveBeenCalledOnce();
  });
  it('should keep sharing a retry started from an error handler', () => {
    const retried = vi.fn();
    const failed = vi.fn();
    policyService.resolve().subscribe({
      error: () => {
        failed();
        policyService.resolve().subscribe(retried);
      },
    });
    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/categories`)
      .flush(null, { status: 503, statusText: 'Unavailable' });
    const concurrent = watch(policyService.resolve());
    const requests = httpTesting.match((request) => request.url === `${apiUrl}/categories`);
    requests.forEach((request) => request.flush(categories));
    expect(requests).toHaveLength(1);
    expect(failed).toHaveBeenCalledOnce();
    expect(retried).toHaveBeenCalledOnce();
    expect(concurrent.next).toHaveBeenCalledOnce();
  });
  it('should revalidate completed policy after five minutes without retaining obsolete IDs', () => {
    vi.useFakeTimers();
    const first = watch(policyService.resolve());
    respondPolicy();
    vi.advanceTimersByTime(300_001);
    const refreshed = watch(policyService.resolve());
    respondPolicy(
      categories.map((category) =>
        category.slug === 'romance' ? { ...category, id: 301 } : category,
      ),
    );
    expect(first.next.mock.calls[0][0].excludedCategoryIds).toEqual([201]);
    expect(refreshed.next.mock.calls[0][0].excludedCategoryIds).toEqual([301]);
  });
  it('should fail closed after an expired snapshot and retry the failed lookup later', () => {
    vi.useFakeTimers();
    watch(policyService.resolve());
    respondPolicy();
    vi.advanceTimersByTime(300_001);
    const failed = watch(policyService.resolve());
    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/categories`)
      .flush(null, { status: 503, statusText: 'Unavailable' });
    expect(failed.next).not.toHaveBeenCalled();
    expect(failed.error).toHaveBeenCalledOnce();
    const retry = watch(policyService.resolve());
    respondPolicy();
    expect(retry.next).toHaveBeenCalledOnce();
  });
  it.each([0, -2, 1.5])('should reject invalid editorial category ID %s', (id) => {
    const result = watch(policyService.resolve());
    respondPolicy(
      categories.map((category) => (category.slug === 'romance' ? { ...category, id } : category)),
    );
    expect(result.next).not.toHaveBeenCalled();
    expect(result.error).toHaveBeenCalledOnce();
  });
  it('should bound a policy lookup without allowing an unfiltered content query', () => {
    vi.useFakeTimers();
    const result = watch(TestBed.inject(WordPressPostsService).getPosts());
    const request = httpTesting.expectOne((request) => request.url === `${apiUrl}/categories`);
    vi.advanceTimersByTime(10_001);
    expect(request.cancelled).toBe(true);
    expect(result.next).not.toHaveBeenCalled();
    expect(result.error).toHaveBeenCalledOnce();
    httpTesting.expectNone((request) => request.url === `${apiUrl}/posts`);
  });
  it.each(['archive', 'detail', 'books', 'cycles'] as const)(
    'should not query %s content when the WoD boundary is missing',
    (collection) => {
      const source =
        collection === 'archive'
          ? TestBed.inject(WordPressPostsService).getPosts()
          : collection === 'detail'
            ? TestBed.inject(WordPressPostsService).getPostBySlug('artigo')
            : collection === 'books'
              ? TestBed.inject(SanakaverseBooksService).getBooks()
              : TestBed.inject(AboutCyclesService).getCycles();
      const result = watch(source as Observable<unknown>);
      respondPolicy(categories.filter((category) => category.slug !== 'romance'));
      expect(result.next).not.toHaveBeenCalled();
      expect(result.error).toHaveBeenCalledOnce();
      httpTesting.expectNone((request) => request.url === `${apiUrl}/posts`);
    },
  );
  it('should keep books and cycles empty when only their optional categories are absent', () => {
    const books = watch(TestBed.inject(SanakaverseBooksService).getBooks());
    const cycles = watch(TestBed.inject(AboutCyclesService).getCycles());
    respondPolicy(categories.filter((category) => category.slug === 'romance'));
    expect(books.next).toHaveBeenCalledExactlyOnceWith({
      books: [],
      page: 1,
      perPage: 12,
      total: 0,
      totalPages: 0,
    });
    expect(cycles.next).toHaveBeenCalledExactlyOnceWith([]);
    httpTesting.expectNone((request) => request.url === `${apiUrl}/posts`);
  });
  it('should send resolved exclusions before pagination and preserve the filtered headers', () => {
    const result = watch(
      TestBed.inject(WordPressPostsService).getPosts({ page: 2, perPage: 5, search: 'vida' }),
    );
    httpTesting.expectNone((request) => request.url === `${apiUrl}/posts`);
    respondPolicy();
    const posts = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);
    expect(posts.request.params.get('categories_exclude[terms]')).toBe('201,108');
    expect(posts.request.params.get('categories_exclude[include_children]')).toBe('true');
    expect(posts.request.params.get('page')).toBe('2');
    expect(posts.request.params.get('per_page')).toBe('5');
    expect(posts.request.params.get('search')).toBe('vida');
    posts.flush([article], { headers: { 'X-WP-Total': '15', 'X-WP-TotalPages': '3' } });
    respondCategories();
    expect(result.next.mock.calls[0][0]).toMatchObject({
      total: 15,
      totalPages: 3,
      page: 2,
      perPage: 5,
    });
    expect(result.next.mock.calls[0][0].posts).toHaveLength(1);
  });
  it.each([201, 108, 900, 901])(
    'should reject an incoherent archive response containing category %s instead of falsifying totals',
    (id) => {
      const result = watch(TestBed.inject(WordPressPostsService).getPosts());
      respondPolicy();
      httpTesting
        .expectOne((request) => request.url === `${apiUrl}/posts`)
        .flush([{ ...article, categories: [id] }], {
          headers: { 'X-WP-Total': '20', 'X-WP-TotalPages': '1' },
        });
      respondCategories();
      expect(result.next).not.toHaveBeenCalled();
      expect(result.error).toHaveBeenCalledOnce();
    },
  );

  const invalidPagination: readonly { label: string; headers: Record<string, string> }[] = [
    { label: 'missing metadata', headers: {} },
    { label: 'missing total', headers: { 'X-WP-TotalPages': '1' } },
    { label: 'missing page count', headers: { 'X-WP-Total': '1' } },
    { label: 'negative total', headers: { 'X-WP-Total': '-1', 'X-WP-TotalPages': '1' } },
    { label: 'fractional total', headers: { 'X-WP-Total': '1.5', 'X-WP-TotalPages': '1' } },
    { label: 'nonnumeric total', headers: { 'X-WP-Total': 'unknown', 'X-WP-TotalPages': '1' } },
    { label: 'blank total', headers: { 'X-WP-Total': '', 'X-WP-TotalPages': '1' } },
    { label: 'fractional page count', headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1.5' } },
    { label: 'inconsistent page count', headers: { 'X-WP-Total': '21', 'X-WP-TotalPages': '1' } },
    {
      label: 'total smaller than response',
      headers: { 'X-WP-Total': '0', 'X-WP-TotalPages': '0' },
    },
  ];
  it.each(invalidPagination)('should not invent archive counts for $label', ({ headers }) => {
    const result = watch(TestBed.inject(WordPressPostsService).getPosts());
    respondPolicy();
    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/posts`)
      .flush([article], { headers });
    respondCategories();
    expect(result.next).not.toHaveBeenCalled();
    expect(result.error).toHaveBeenCalledOnce();
  });

  it('should resolve a tag outside the first hundred by a targeted slug query', () => {
    const result = watch(
      TestBed.inject(WordPressPostsService).getPosts({ tagSlug: 'alem-de-cem' }),
    );
    respondPolicy();
    const tag = httpTesting.expectOne((request) => request.url === `${apiUrl}/tags`);
    expect(tag.request.params.get('slug')).toBe('alem-de-cem');
    expect(tag.request.params.get('per_page')).toBe('1');
    tag.flush([{ id: 250, name: 'Tag 250', slug: 'alem-de-cem' }]);
    const posts = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);
    expect(posts.request.params.get('tags')).toBe('250');
    posts.flush([], { headers: { 'X-WP-Total': '0', 'X-WP-TotalPages': '0' } });
    respondCategories();
    expect(result.error).not.toHaveBeenCalled();
    httpTesting.expectNone((request) => request.url === `${apiUrl}/tags`);
  });
  it('should distinguish a failed tag lookup from a confirmed missing slug', () => {
    const result = watch(TestBed.inject(WordPressPostsService).getPosts({ tagSlug: 'despertar' }));
    respondPolicy();
    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/tags`)
      .flush(null, { status: 503, statusText: 'Unavailable' });
    expect(result.next).not.toHaveBeenCalled();
    expect(result.error).toHaveBeenCalledOnce();
    httpTesting.expectNone((request) => request.url === `${apiUrl}/posts`);
  });
  it('should not substitute a different tag if an upstream response ignores the requested slug', () => {
    const result = watch(
      TestBed.inject(WordPressPostsService).getPosts({ tagSlug: 'requisitada' }),
    );
    respondPolicy();
    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/tags`)
      .flush([{ id: 250, name: 'Outra', slug: 'outra' }]);
    const posts = httpTesting.match((request) => request.url === `${apiUrl}/posts`);
    posts.forEach((request) =>
      request.flush([], { headers: { 'X-WP-Total': '0', 'X-WP-TotalPages': '0' } }),
    );
    httpTesting
      .match((request) => request.url === `${apiUrl}/categories` && !request.params.has('slug'))
      .forEach((request) => request.flush(categories));
    expect(posts).toHaveLength(0);
    expect(result.next.mock.calls[0][0]).toMatchObject({ posts: [], total: 0, totalPages: 0 });
  });
  it.each([101, 200, 250])(
    'should complete %s categories before exposing the filtered hierarchy',
    (count) => {
      const source = Array.from({ length: count - 3 }, (_, index) => ({
        id: 1000 + index,
        name: `Categoria ${index}`,
        slug: `categoria-${index}`,
        parent: 0,
      })).concat(categories.slice(0, 3));
      const result = watch(TestBed.inject(WordPressPostsService).getArchiveCategories());
      respondPolicy();
      const pages = Math.ceil(count / 100);
      for (let page = 1; page <= pages; page++) {
        const request = httpTesting.expectOne(
          (request) => request.url === `${apiUrl}/categories` && !request.params.has('slug'),
        );
        expect(request.request.params.get('page')).toBe(String(page));
        request.flush(source.slice((page - 1) * 100, page * 100), {
          headers: { 'X-WP-TotalPages': String(pages) },
        });
        if (page < pages) expect(result.next).not.toHaveBeenCalled();
      }
      expect(result.next.mock.calls[0][0]).toHaveLength(count - 2);
      expect(
        result.next.mock.calls[0][0].some(
          (category) => category.slug === 'sanakaverse' || category.slug === 'romance',
        ),
      ).toBe(false);
    },
  );
  it('should not expose a partial category hierarchy when a later page fails', () => {
    const result = watch(TestBed.inject(WordPressPostsService).getArchiveCategories());
    respondPolicy();
    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/categories` && !request.params.has('slug'))
      .flush(
        Array.from({ length: 100 }, (_, index) => ({
          id: 1000 + index,
          name: 'Categoria',
          slug: `cat-${index}`,
          parent: 0,
        })),
        { headers: { 'X-WP-TotalPages': '2' } },
      );
    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/categories` && !request.params.has('slug'))
      .flush(null, { status: 503, statusText: 'Unavailable' });
    expect(result.next).not.toHaveBeenCalled();
    expect(result.error).toHaveBeenCalledOnce();
  });
  it('should continue after a full category page even when the pagination header is absent', () => {
    const result = watch(TestBed.inject(WordPressPostsService).getArchiveCategories());
    respondPolicy();
    respondCategories(
      Array.from({ length: 100 }, (_, index) => ({
        id: 1000 + index,
        name: 'Categoria',
        slug: `cat-${index}`,
        parent: 0,
      })),
    );
    respondCategories(categories.slice(0, 3));
    expect(result.next.mock.calls[0][0]).toHaveLength(101);
  });
  it.each(['invalid', '-1', '1.5'])(
    'should reject a malformed category pagination header %s',
    (header) => {
      const result = watch(TestBed.inject(WordPressPostsService).getArchiveCategories());
      respondPolicy();
      httpTesting
        .expectOne(
          (request) => request.url === `${apiUrl}/categories` && !request.params.has('slug'),
        )
        .flush(categories, { headers: { 'X-WP-TotalPages': header } });
      expect(result.next).not.toHaveBeenCalled();
      expect(result.error).toHaveBeenCalledOnce();
    },
  );
  it('should reject a missing intermediate category page instead of truncating the hierarchy', () => {
    const result = watch(TestBed.inject(WordPressPostsService).getArchiveCategories());
    respondPolicy();
    httpTesting
      .expectOne((request) => request.url === `${apiUrl}/categories` && !request.params.has('slug'))
      .flush([], { headers: { 'X-WP-TotalPages': '2' } });
    expect(result.next).not.toHaveBeenCalled();
    expect(result.error).toHaveBeenCalledOnce();
  });
  it('should keep a migrated volume readable by slug and constrain child-volume navigation', () => {
    const result = watch(TestBed.inject(WordPressPostsService).getPostBySlug('volume'));
    respondPolicy();
    const post = httpTesting.expectOne((request) => request.params.get('slug') === 'volume');
    expect(post.request.params.get('categories_exclude[terms]')).toBe('201');
    post.flush([{ ...article, slug: 'volume', categories: [901] }]);
    expect(result.next.mock.calls.at(-1)?.[0]?.contentHtml).toBe('<p>Leitura preservada.</p>');
    respondCategories();
    httpTesting.expectNone((request) => request.url === `${apiUrl}/tags`);
    const context = httpTesting.expectOne(
      (request) => request.params.get('_fields') === 'tags,categories',
    );
    expect(context.request.params.get('categories[terms]')).toBe('108');
    expect(context.request.params.get('categories_exclude[terms]')).toBe('201');
    context.flush([]);
    const navigation = httpTesting.match(
      (request) => request.params.has('before') || request.params.has('after'),
    );
    expect(navigation).toHaveLength(2);
    for (const request of navigation) {
      expect(request.request.params.get('categories[terms]')).toBe('108');
      expect(request.request.params.get('categories[include_children]')).toBe('true');
      expect(request.request.params.get('categories_exclude[terms]')).toBe('201');
      request.flush([]);
    }
    expect(result.error).not.toHaveBeenCalled();
  });
  it('should resolve About and library categories from one policy lookup and preserve cover fields', () => {
    const cycles = watch(TestBed.inject(AboutCyclesService).getCycles());
    const books = watch(TestBed.inject(SanakaverseBooksService).getBooks());
    respondPolicy();
    const requests = httpTesting.match((request) => request.url === `${apiUrl}/posts`);
    expect(requests).toHaveLength(2);
    const about = requests.find((request) => request.request.params.get('categories') === '208')!;
    const library = requests.find(
      (request) => request.request.params.get('categories[terms]') === '108',
    )!;
    for (const request of requests) {
      expect(request.request.params.get('categories_exclude[terms]')).toBe('201');
      expect(request.request.params.get('categories_exclude[include_children]')).toBe('true');
    }
    expect(about.request.params.get('per_page')).toBe('9');
    expect(library.request.params.get('per_page')).toBe('12');
    expect(library.request.params.get('page')).toBe('1');
    expect(library.request.params.get('_fields')).toContain('sanakaverse_cover');
    about.flush([]);
    library.flush([], { headers: { 'X-WP-Total': '0', 'X-WP-TotalPages': '0' } });
    expect(cycles.next).toHaveBeenCalledExactlyOnceWith([]);
    expect(books.next).toHaveBeenCalledExactlyOnceWith({
      books: [],
      page: 1,
      perPage: 12,
      total: 0,
      totalPages: 0,
    });
  });
});
