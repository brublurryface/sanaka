import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { WORDPRESS_API_URL } from '../../../core/wordpress/wordpress-api';
import { AboutCyclePost, AboutCyclesService } from './about-cycles.service';

describe('AboutCyclesService', () => {
  let httpTesting: HttpTestingController;
  let service: AboutCyclesService;

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
    service = TestBed.inject(AboutCyclesService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should load the configured category directly and order cycles by their roman numerals', () => {
    let result: readonly AboutCyclePost[] | undefined;

    service.getCycles().subscribe((cycles) => {
      result = cycles;
    });

    const postsRequest = httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`);

    expect(postsRequest.request.params.get('categories')).toBe('62');
    expect(postsRequest.request.params.get('per_page')).toBe('6');
    expect(postsRequest.request.params.get('_fields')).not.toContain('link');
    expect(postsRequest.request.params.get('_fields')).toContain('meta');

    postsRequest.flush([
      {
        id: 6,
        slug: 'om-sanakaya-namah',
        title: { rendered: 'VI — Oṁ Sanakāya Namaḥ' },
        hover_text: 'Um nome antigo. Uma forma jovem.',
        excerpt: { rendered: '<p>Um nome antigo.</p>' },
      },
      {
        id: 1,
        slug: 'morte',
        title: { rendered: 'I — Morte' },
        hover_text: { rendered: '<p>Uma janela e uma pergunta.</p>' },
        excerpt: {
          rendered: '<p>Uma janela &amp; um reflexo.</p><a class="more-link">Continuar</a>',
        },
      },
      {
        id: 4,
        slug: 'renascimento',
        title: { rendered: 'IV — Renascimento' },
        meta: { hover_text: 'E se o eu pudesse ser desmontado?' },
        excerpt: { rendered: '<p>Desmontar o eu.</p>' },
      },
    ]);

    expect(result).toEqual([
      {
        id: 1,
        slug: 'morte',
        title: 'I — Morte',
        hoverText: 'Uma janela e uma pergunta.',
        excerpt: 'Uma janela & um reflexo.',
        order: 1,
      },
      {
        id: 4,
        slug: 'renascimento',
        title: 'IV — Renascimento',
        hoverText: 'E se o eu pudesse ser desmontado?',
        excerpt: 'Desmontar o eu.',
        order: 4,
      },
      {
        id: 6,
        slug: 'om-sanakaya-namah',
        title: 'VI — Oṁ Sanakāya Namaḥ',
        hoverText: 'Um nome antigo. Uma forma jovem.',
        excerpt: 'Um nome antigo.',
        order: 6,
      },
    ]);
  });

  it('should return an empty collection when WordPress has no autobiographical cycles', () => {
    let result: readonly AboutCyclePost[] | undefined;

    service.getCycles().subscribe((cycles) => {
      result = cycles;
    });

    httpTesting.expectOne((request) => request.url === `${apiUrl}/posts`).flush([]);

    expect(result).toEqual([]);
  });
});
