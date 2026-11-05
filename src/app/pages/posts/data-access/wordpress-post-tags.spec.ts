import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, Subject, switchMap } from 'rxjs';

import { WordPressContentPolicyService } from '../../../core/wordpress/wordpress-content-policy.service';
import { PostDetail } from '../post';
import { WORDPRESS_API_URL, WordPressPostsService } from './wordpress-posts.service';

describe('Post tags on demand', () => {
  const apiUrl = 'https://example.com/wp-json/wp/v2';
  let http: HttpTestingController;
  let service: WordPressPostsService;
  const article = {
    id: 77,
    slug: 'artigo',
    date: '2026-11-04T12:00:00',
    title: { rendered: 'Artigo' },
    excerpt: { rendered: '' },
    content: { rendered: '<p>Leitura preservada.</p>' },
    categories: [45],
    tags: [250],
    featured_media: 0,
  };
  const categories = [
    { id: 41, name: 'Bruna', slug: 'bruna', parent: 0 },
    { id: 45, name: 'Estudos', slug: 'estudos', parent: 41 },
    { id: 43, name: 'Romance', slug: 'romance', parent: 0 },
    { id: 44, name: 'WoD', slug: 'wod', parent: 43 },
    { id: 97, name: 'Sanakaverse', slug: 'sanakaverse', parent: 0 },
    { id: 98, name: 'Subcoleção', slug: 'subcolecao', parent: 97 },
  ];
  const tag = (id: number) => ({ id, name: `Tag ${id}`, slug: `tag-${id}` });
  const headers = (total: number) => ({
    'X-WP-Total': String(total),
    'X-WP-TotalPages': String(Math.ceil(total / 100)),
  });

  function openArticle(overrides: Partial<typeof article> = {}) {
    const values: (PostDetail | null)[] = [];
    const error = vi.fn();
    const complete = vi.fn();
    const subscription = service
      .getPostBySlug('artigo')
      .subscribe({ next: (value) => values.push(value), error, complete });
    http
      .expectOne((request) => request.params.get('slug') === 'artigo')
      .flush([{ ...article, ...overrides }]);
    return { values, error, complete, subscription };
  }

  function flushCategories() {
    http.expectOne((request) => request.url === `${apiUrl}/categories`).flush(categories);
  }

  function contextRequest() {
    return http.expectOne((request) => request.params.get('_fields') === 'tags,categories');
  }

  function finishNavigation() {
    const requests = http.match(
      (request) => request.params.has('before') || request.params.has('after'),
    );
    expect(requests).toHaveLength(2);
    requests.forEach((request) => request.flush([]));
  }

  function finishEmptyContext() {
    flushCategories();
    contextRequest().flush([]);
    finishNavigation();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WORDPRESS_API_URL, useValue: apiUrl },
        {
          provide: WordPressContentPolicyService,
          useValue: { resolve: () => of({ excludedCategoryIds: [43], sanakaverseCategoryId: 97 }) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(WordPressPostsService);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('should request the article tags directly instead of the first hundred global terms', () => {
    let result: PostDetail | null | undefined;
    service.getPostBySlug('artigo').subscribe((value) => (result = value));
    http
      .expectOne((request) => request.params.get('slug') === 'artigo')
      .flush([
        {
          id: 77,
          slug: 'artigo',
          date: '2026-11-04T12:00:00',
          title: { rendered: 'Artigo' },
          excerpt: { rendered: '' },
          content: { rendered: '<p>Leitura preservada.</p>' },
          categories: [45],
          tags: [250],
          featured_media: 0,
        },
      ]);
    http
      .expectOne((request) => request.url === `${apiUrl}/categories`)
      .flush([{ id: 45, name: 'Estudos', slug: 'estudos', parent: 0 }]);
    const tags = http.expectOne((request) => request.url === `${apiUrl}/tags`);
    const params = tags.request.params;
    tags.flush([{ id: 250, name: 'Tag além de cem', slug: 'tag-250' }], {
      headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' },
    });
    http
      .match((request) => request.url === `${apiUrl}/posts`)
      .forEach((request) => request.flush([]));
    expect(params.get('post')).toBe('77');
    expect(params.get('page')).toBe('1');
    expect(result?.tags.map((tag) => tag.id)).toEqual([250]);
  });

  it.each([101, 200, 250])(
    'should find the selected article term in a vocabulary of %s tags without downloading that vocabulary',
    (size) => {
      const catalog = Array.from({ length: size }, (_, index) => tag(index + 1));
      const result = openArticle({ tags: [size] });
      const request = http.expectOne((request) => request.url === `${apiUrl}/tags`);
      expect(request.request.params.get('post')).toBe('77');
      expect(request.request.params.has('include')).toBe(false);
      request.flush(
        catalog.filter((item) => item.id === size),
        { headers: headers(1) },
      );
      finishEmptyContext();
      expect(result.values.at(-1)?.tags).toEqual([tag(size)]);
      expect(result.complete).toHaveBeenCalledOnce();
      http.expectNone((request) => request.url === `${apiUrl}/tags`);
    },
  );

  it.each([0, 1, 100, 101, 200, 250])(
    'should load all %s assigned terms through projected post-specific pages only',
    (count) => {
      const ids = Array.from({ length: count }, (_, index) => index + 500);
      const result = openArticle({ tags: ids });
      for (let page = 1; page <= Math.ceil(count / 100); page++) {
        const request = http.expectOne((request) => request.url === `${apiUrl}/tags`);
        expect(request.request.params.get('post')).toBe('77');
        expect(request.request.params.get('page')).toBe(String(page));
        expect(request.request.params.get('per_page')).toBe('100');
        expect(request.request.params.get('_fields')).toBe('id,name,slug');
        request.flush(ids.slice((page - 1) * 100, page * 100).map(tag), {
          headers: headers(count),
        });
        if (page < Math.ceil(count / 100)) expect(result.values.at(-1)?.tags).toEqual([]);
      }
      finishEmptyContext();
      expect(result.values.at(-1)?.tags.map((item) => item.id)).toEqual(ids);
      expect(result.error).not.toHaveBeenCalled();
      http.expectNone((request) => request.url === `${apiUrl}/tags`);
    },
  );

  it('should use at most eight distinct contextual terms and reject foreign collections', () => {
    const result = openArticle();
    http
      .expectOne((request) => request.url === `${apiUrl}/tags`)
      .flush([tag(250)], { headers: headers(1) });
    flushCategories();
    const sample = contextRequest();
    expect(sample.request.params.get('per_page')).toBe('5');
    expect(sample.request.params.get('categories[terms]')).toBe('45');
    expect(sample.request.params.get('categories[include_children]')).toBe('true');
    expect(sample.request.params.get('categories_exclude[terms]')).toBe('43,97');
    expect(sample.request.params.get('categories_exclude[include_children]')).toBe('true');
    expect(sample.request.params.get('exclude')).toBe('77');
    expect(sample.request.params.get('orderby')).toBe('date');
    expect(sample.request.params.get('order')).toBe('desc');
    sample.flush([
      { categories: [45], tags: [250, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      { categories: [44], tags: [2001] },
      { categories: [98], tags: [3001] },
      { categories: [41], tags: [4001] },
      { categories: [45, 43], tags: [5001] },
    ]);
    const terms = http.expectOne((request) => request.url === `${apiUrl}/tags`);
    expect(terms.request.params.get('include')).toBe('1,2,3,4,5,6,7,8');
    expect(terms.request.params.get('per_page')).toBe('8');
    expect(terms.request.params.get('orderby')).toBe('include');
    terms.flush(Array.from({ length: 8 }, (_, index) => tag(index + 1)).concat(tag(2001)));
    finishNavigation();
    expect(result.values.at(-1)?.tags.map((item) => item.id)).toEqual([250]);
    expect(result.values.at(-1)?.exploreTags.map((item) => item.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it('should keep volume suggestions inside the Sanakaverse branch including descendants', () => {
    const result = openArticle({ categories: [98] });
    http
      .expectOne((request) => request.url === `${apiUrl}/tags`)
      .flush([tag(250)], { headers: headers(1) });
    flushCategories();
    const sample = contextRequest();
    expect(sample.request.params.get('categories[terms]')).toBe('97');
    expect(sample.request.params.get('categories_exclude[terms]')).toBe('43');
    sample.flush([
      { categories: [98], tags: [12] },
      { categories: [45], tags: [13] },
    ]);
    const terms = http.expectOne((request) => request.url === `${apiUrl}/tags`);
    expect(terms.request.params.get('include')).toBe('12');
    terms.flush([tag(12)]);
    finishNavigation();
    expect(result.values.at(-1)?.exploreTags).toEqual([tag(12)]);
  });

  it.each(['sample', 'terms'] as const)(
    'should preserve the article and its own tags if contextual %s fail',
    (stage) => {
      const result = openArticle();
      http
        .expectOne((request) => request.url === `${apiUrl}/tags`)
        .flush([tag(250)], { headers: headers(1) });
      flushCategories();
      const sample = contextRequest();
      if (stage === 'sample') sample.flush(null, { status: 503, statusText: 'Unavailable' });
      else {
        sample.flush([{ categories: [45], tags: [12] }]);
        http
          .expectOne((request) => request.url === `${apiUrl}/tags`)
          .flush(null, { status: 503, statusText: 'Unavailable' });
      }
      finishNavigation();
      expect(result.values.at(-1)?.contentHtml).toBe('<p>Leitura preservada.</p>');
      expect(result.values.at(-1)?.tags).toEqual([tag(250)]);
      expect(result.values.at(-1)?.exploreTags).toEqual([]);
      expect(result.error).not.toHaveBeenCalled();
    },
  );

  it('should preserve healthy contextual suggestions when the article tag lookup fails', () => {
    const result = openArticle();
    http
      .expectOne((request) => request.url === `${apiUrl}/tags`)
      .flush(null, { status: 503, statusText: 'Unavailable' });
    flushCategories();
    contextRequest().flush([{ categories: [45], tags: [12, 250] }]);
    http.expectOne((request) => request.url === `${apiUrl}/tags`).flush([tag(12)]);
    finishNavigation();
    expect(result.values.at(-1)?.tags).toEqual([]);
    expect(result.values.at(-1)?.exploreTags).toEqual([tag(12)]);
    expect(result.error).not.toHaveBeenCalled();
  });

  it('should preserve the article without exposing an incomplete tag list if a later page fails', () => {
    const ids = Array.from({ length: 101 }, (_, index) => index + 500);
    const result = openArticle({ tags: ids });
    http
      .expectOne((request) => request.url === `${apiUrl}/tags`)
      .flush(ids.slice(0, 100).map(tag), { headers: headers(101) });
    http
      .expectOne((request) => request.url === `${apiUrl}/tags`)
      .flush(null, { status: 503, statusText: 'Unavailable' });
    finishEmptyContext();
    expect(result.values.at(-1)?.tags).toEqual([]);
    expect(result.values.at(-1)?.contentHtml).toBe('<p>Leitura preservada.</p>');
    expect(result.error).not.toHaveBeenCalled();
  });

  it('should cancel a stalled contextual lookup without blocking the article', () => {
    vi.useFakeTimers();
    const result = openArticle();
    http
      .expectOne((request) => request.url === `${apiUrl}/tags`)
      .flush([tag(250)], { headers: headers(1) });
    flushCategories();
    const sample = contextRequest();
    finishNavigation();
    vi.advanceTimersByTime(10_001);
    expect(sample.cancelled).toBe(true);
    expect(result.complete).toHaveBeenCalledOnce();
    expect(result.values.at(-1)?.tags).toEqual([tag(250)]);
    expect(result.error).not.toHaveBeenCalled();
  });

  it('should cancel obsolete article tags and contextual requests when the slug changes', () => {
    const slugs = new Subject<string>();
    const values: (PostDetail | null)[] = [];
    const subscription = slugs
      .pipe(switchMap((slug) => service.getPostBySlug(slug)))
      .subscribe((value) => values.push(value));
    slugs.next('artigo');
    http.expectOne((request) => request.params.get('slug') === 'artigo').flush([article]);
    flushCategories();
    const oldTags = http.expectOne((request) => request.url === `${apiUrl}/tags`);
    const oldContext = contextRequest();
    const oldNavigation = http.match(
      (request) => request.params.has('before') || request.params.has('after'),
    );
    slugs.next('outro');
    expect(oldTags.cancelled).toBe(true);
    expect(oldContext.cancelled).toBe(true);
    expect(oldNavigation.every((request) => request.cancelled)).toBe(true);
    http
      .expectOne((request) => request.params.get('slug') === 'outro')
      .flush([{ ...article, id: 78, slug: 'outro', tags: [301] }]);
    const newTags = http.expectOne((request) => request.url === `${apiUrl}/tags`);
    expect(newTags.request.params.get('post')).toBe('78');
    newTags.flush([tag(301)], { headers: headers(1) });
    contextRequest().flush([]);
    finishNavigation();
    expect(values.at(-1)?.slug).toBe('outro');
    expect(values.at(-1)?.tags).toEqual([tag(301)]);
    subscription.unsubscribe();
  });
});
