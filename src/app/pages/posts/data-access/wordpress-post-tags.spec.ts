import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { WordPressContentPolicyService } from '../../../core/wordpress/wordpress-content-policy.service';
import { PostDetail } from '../post';
import { WORDPRESS_API_URL, WordPressPostsService } from './wordpress-posts.service';

describe('Post tags on demand', () => {
  const apiUrl = 'https://example.com/wp-json/wp/v2';
  let http: HttpTestingController;
  let service: WordPressPostsService;

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

  afterEach(() => http.verify());

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
});
