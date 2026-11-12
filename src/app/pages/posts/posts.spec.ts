import { PageLoadingState } from '../../core/navigation/page-loading-state';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTransloco, TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Post, PostCategory } from './post';
import { Posts } from './posts';
import { PostsStore } from './posts.store';
import { NewsletterService } from './newsletter-signup/data-access/newsletter.service';
import {
  PostsPage,
  PostsPageOutOfRangeError,
  PostsQuery,
  WordPressPostsService,
} from './data-access/wordpress-posts.service';
import { POSTS_ROUTES } from './posts.routes';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    const translations = {
      'pt-BR': {
        newsletter: {
          eyebrow: 'Novidades de Sanaka',
          title: 'Sanaka também chega por e-mail.',
          intro: 'Novidades com comentários da autora.',
          checking: 'Consultando as inscrições…',
          unavailable: 'As inscrições não estão disponíveis.',
        },
        common: {
          actions: { clearSearch: 'Limpar busca', retry: 'Tentar novamente' },
        },
        posts: {
          header: {
            eyebrow: 'Arquivo',
            title: 'Publicações do santuário',
            intro: 'Escrituras, estudos e reflexões reunidos no Sanaka.',
            imageAlt: 'Saṃvit, Nandinī e Bhū observam livros mágicos em uma biblioteca.',
            sanakaverseLink: 'Viajar para Sanaka-loka',
          },
          search: {
            label: 'Buscar nas publicações',
            placeholder: 'Busque por título ou conteúdo...',
            clear: 'Limpar busca',
          },
          view: {
            label: 'Modo de leitura',
            continuous: 'Contínua',
            paged: 'Por páginas',
          },
          filters: {
            title: 'Filtrar publicações',
            category: 'Categoria',
            subcategory: 'Subcategoria',
            allCategories: 'Todas as categorias',
            allSubcategories: 'Todas as subcategorias',
            chooseCategory: 'Escolha uma categoria primeiro',
            noSubcategories: 'Esta categoria não tem subcategorias',
            active: 'Filtros ativos',
            remove: 'Retirar filtro {{ name }}',
            clear: 'Limpar filtros',
            loading: 'Carregando categorias...',
            error: 'Não foi possível carregar as categorias.',
            browseCategory: 'Ver publicações em {{ name }}',
          },
          list: {
            title: 'Publicações',
          },
          pagination: {
            ariaLabel: 'Paginação das publicações',
            previous: 'Anterior',
            next: 'Próxima',
            goToPage: 'Ir para a página {{ page }}',
            loadMore: 'Carregar mais',
            loadingMore: 'Carregando mais...',
            error: 'Não foi possível carregar mais publicações.',
          },
          loading: 'Carregando publicações...',
          error: {
            message: 'Não foi possível carregar as publicações.',
            retry: 'Tentar novamente',
          },
          empty: 'Nenhuma publicação encontrada.',
        },
      },
      en: {
        newsletter: {
          eyebrow: 'News from Sanaka',
          title: 'Sanaka also arrives by email.',
          intro: 'News with comments from the author.',
          checking: 'Checking subscriptions…',
          unavailable: 'Subscriptions are unavailable.',
        },
        common: {
          actions: { clearSearch: 'Clear search', retry: 'Try again' },
        },
        posts: {
          header: {
            eyebrow: 'Archive',
            title: 'Sanctuary publications',
            intro: 'Scriptures, studies and reflections gathered in Sanaka.',
            imageAlt: 'Saṃvit, Nandinī, and Bhū watch magical books in a library.',
            sanakaverseLink: 'Travel to Sanaka-loka',
          },
          search: {
            label: 'Search publications',
            placeholder: 'Search by title or content...',
            clear: 'Clear search',
          },
          view: {
            label: 'Reading mode',
            continuous: 'Continuous',
            paged: 'Pages',
          },
          filters: {
            title: 'Filter publications',
            category: 'Category',
            subcategory: 'Subcategory',
            allCategories: 'All categories',
            allSubcategories: 'All subcategories',
            chooseCategory: 'Choose a category first',
            noSubcategories: 'This category has no subcategories',
            active: 'Active filters',
            remove: 'Remove {{ name }} filter',
            clear: 'Clear filters',
            loading: 'Loading categories...',
            error: 'Categories could not be loaded.',
            browseCategory: 'Browse publications in {{ name }}',
          },
          list: {
            title: 'Publications',
          },
          pagination: {
            ariaLabel: 'Publications pagination',
            previous: 'Previous',
            next: 'Next',
            goToPage: 'Go to page {{ page }}',
            loadMore: 'Load more',
            loadingMore: 'Loading more...',
            error: 'More publications could not be loaded.',
          },
          loading: 'Loading publications...',
          error: {
            message: 'The publications could not be loaded.',
            retry: 'Try again',
          },
          empty: 'No publications found.',
        },
      },
    };

    return of(translations[lang as keyof typeof translations] ?? translations['pt-BR']);
  }
}

describe('Posts', () => {
  let component: Posts;
  let fixture: ComponentFixture<Posts>;
  let router: Router;

  const posts: readonly Post[] = [
    {
      id: 1,
      slug: 'presenca-de-samvit',
      title: 'A presença de Saṃvit',
      excerpt: 'Notas sobre as formas pelas quais Saṃvit aparece nas escrituras.',
      publishedAt: '2026-08-28',
      category: 'Escrituras',
      categories: [{ id: 3, name: 'Escrituras', slug: 'escrituras' }],
    },
    {
      id: 2,
      slug: 'sanaka-como-espaco-de-estudo',
      title: 'Sanaka como espaço de estudo',
      excerpt: 'Reflexões sobre a construção de um espaço digital dedicado a textos e estudos.',
      publishedAt: '2026-08-24',
      category: 'Estudos',
      categories: [{ id: 4, name: 'Estudos', slug: 'estudos' }],
    },
  ];

  const firstPage: PostsPage = {
    posts,
    page: 1,
    perPage: 20,
    total: 21,
    totalPages: 2,
  };

  const secondPage: PostsPage = {
    posts: [
      {
        id: 3,
        slug: 'silencio-do-santuario',
        title: 'O silêncio do santuário',
        excerpt: 'Uma investigação sobre silêncio, espaço e presença.',
        publishedAt: '2026-08-20',
        category: 'Reflexões',
        categories: [{ id: 5, name: 'Reflexões', slug: 'reflexoes' }],
      },
    ],
    page: 2,
    perPage: 20,
    total: 21,
    totalPages: 2,
  };

  const postsService = {
    getPosts: vi.fn<(query?: PostsQuery) => Observable<PostsPage>>(),
    getArchiveCategories: vi.fn<() => Observable<readonly PostCategory[]>>(),
  };

  const categories: readonly PostCategory[] = [
    { id: 41, name: 'Bruna', slug: 'bruna', parentId: 0 },
    { id: 3, name: 'Catuhsana', slug: 'catuhsana', parentId: 0 },
    { id: 45, name: 'Pensamentos', slug: 'pensamentos', parentId: 41 },
    { id: 46, name: 'De Preto', slug: 'de-preto', parentId: 41 },
  ];

  beforeEach(async () => {
    postsService.getPosts.mockReset();
    postsService.getArchiveCategories.mockReset().mockReturnValue(of(categories));

    await TestBed.configureTestingModule({
      imports: [Posts],
      providers: [
        provideRouter([]),
        PostsStore,
        {
          provide: NewsletterService,
          useValue: { getAvailability: () => of({ available: false }), subscribe: vi.fn() },
        },
        {
          provide: WordPressPostsService,
          useValue: postsService,
        },
        provideTransloco({
          config: {
            availableLangs: ['pt-BR', 'en'],
            defaultLang: 'pt-BR',
            fallbackLang: 'pt-BR',
            reRenderOnLangChange: true,
            prodMode: true,
          },
          loader: MockTranslocoLoader,
        }),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function createComponent(postsResponse: Observable<PostsPage> = of(firstPage)): void {
    postsService.getPosts.mockReturnValue(postsResponse);
    fixture = TestBed.createComponent(Posts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and request 20 posts from the first page', () => {
    createComponent();

    expect(component).toBeTruthy();
    expect(postsService.getPosts).toHaveBeenCalledWith({
      page: 1,
      perPage: 20,
      search: '',
    });
  });

  it('should render one post card for each post returned by WordPress', () => {
    createComponent();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('app-post-card').length).toBe(posts.length);
    expect(component.total()).toBe(21);
  });

  it('should expose the Sanakaverse from the publications header in a new tab', () => {
    createComponent();

    const compiled = fixture.nativeElement as HTMLElement;
    const link = compiled.querySelector<HTMLAnchorElement>('.posts-header__sanakaverse');

    expect(link?.getAttribute('href')).toBe('/sanaka-loka');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.textContent).toContain('Viajar para Sanaka-loka');
  });

  it('should present the posts atmosphere as a cinematic image', () => {
    createComponent();

    const compiled = fixture.nativeElement as HTMLElement;
    const hero = compiled.querySelector<HTMLElement>('.posts-header');
    const image = hero?.querySelector<HTMLImageElement>('.posts-header__image');

    expect(hero?.classList.contains('sanaka-atmosphere-hero--cinematic')).toBe(true);
    expect(image?.getAttribute('src')).toBe('/images/posts/posts-atmosphere-desktop.webp');
    expect(image?.getAttribute('alt')).toContain('Saṃvit, Nandinī e Bhū');
  });

  it('should keep the newsletter anchor available independently of the WordPress request', () => {
    createComponent(new Subject<PostsPage>());
    const anchor = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('#newsletter');
    expect(anchor?.tagName).toBe('H2');
    expect(anchor?.tabIndex).toBe(-1);
    expect(anchor?.closest('section')?.getAttribute('aria-labelledby')).toBe('newsletter');
  });

  it('should show a loading state while WordPress is pending', () => {
    const pending = new Subject<PostsPage>();
    createComponent(pending);

    const compiled = fixture.nativeElement as HTMLElement;

    expect(TestBed.inject(PageLoadingState).current()?.labelKey).toBe('posts.loading');
    expect(compiled.querySelector('app-page-loading')?.getAttribute('data-variant')).toBe('vasuki');

    pending.next(firstPage);
    pending.complete();
    fixture.detectChanges();

    expect(compiled.querySelector('app-page-loading')).toBeNull();
    expect(compiled.querySelector('app-post-card')).not.toBeNull();
  });

  it('should replace Vāsuki with the error and retry action after a pending request fails', () => {
    const pending = new Subject<PostsPage>();
    createComponent(pending);
    pending.error(new Error('offline'));
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-page-loading')).toBeNull();
    expect(compiled.querySelector('.posts-feedback[role="alert"] button')).not.toBeNull();
  });

  it('should show an error and load the posts after retrying', () => {
    postsService.getPosts
      .mockReturnValueOnce(throwError(() => new Error('WordPress unavailable')))
      .mockReturnValueOnce(of(firstPage));

    fixture = TestBed.createComponent(Posts);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const retryButton = compiled.querySelector<HTMLButtonElement>('.posts-feedback button');

    expect(compiled.querySelector('.posts-feedback')?.textContent).toContain(
      'Não foi possível carregar as publicações.',
    );

    retryButton?.click();
    fixture.detectChanges();

    expect(postsService.getPosts).toHaveBeenCalledTimes(2);
    expect(compiled.querySelectorAll('app-post-card').length).toBe(posts.length);
  });

  it('should wait for the debounce before searching all WordPress posts', async () => {
    vi.useFakeTimers();
    createComponent();

    component.searchControl.setValue('samvit');

    await vi.advanceTimersByTimeAsync(299);

    expect(postsService.getPosts).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);

    expect(postsService.getPosts).toHaveBeenLastCalledWith({
      page: 1,
      perPage: 20,
      search: 'samvit',
    });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should clear the search and return focus to its input', () => {
    createComponent();

    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector<HTMLInputElement>('#posts-search');
    const clearButton = compiled.querySelector<HTMLButtonElement>('.posts-search__clear');

    component.searchControl.setValue('Blake', { emitEvent: false });
    fixture.detectChanges();
    clearButton?.click();

    expect(component.searchControl.value).toBe('');
    expect(document.activeElement).toBe(input);
    expect(clearButton?.getAttribute('aria-label')).toBe('Limpar busca');
  });

  it('should append the next page in continuous mode', () => {
    postsService.getPosts.mockReturnValueOnce(of(firstPage)).mockReturnValueOnce(of(secondPage));

    fixture = TestBed.createComponent(Posts);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.loadMore();
    fixture.detectChanges();

    expect(postsService.getPosts).toHaveBeenLastCalledWith({
      page: 2,
      perPage: 20,
      search: '',
    });
    expect(component.posts().map((post) => post.id)).toEqual([1, 2, 3]);
  });

  it('should replace the cards when navigating in paged mode', () => {
    postsService.getPosts.mockImplementation((query) =>
      query?.page === 2 ? of(secondPage) : of(firstPage),
    );

    fixture = TestBed.createComponent(Posts);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.setViewMode('paged');
    component.goToPage(2);
    fixture.detectChanges();

    expect(component.posts().map((post) => post.id)).toEqual([3]);
    expect(component.currentPage()).toBe(2);
    expect(router.navigate).toHaveBeenLastCalledWith(['/posts', 'paged', 2], {
      replaceUrl: false,
    });
  });

  it('should navigate to the paged route without query parameters', () => {
    createComponent();

    component.setViewMode('paged');

    expect(router.navigate).toHaveBeenCalledWith(['/posts', 'paged'], {
      replaceUrl: false,
    });
  });

  it('should navigate back to the canonical continuous route', () => {
    createComponent();

    component.setViewMode('paged');
    component.setViewMode('continuous');

    expect(router.navigate).toHaveBeenLastCalledWith(['/posts'], {
      replaceUrl: false,
    });
  });

  it('should request WordPress filters using readable taxonomy slugs', () => {
    createComponent();

    const store = TestBed.inject(PostsStore);
    store.activateRoute('continuous', null, 'de-preto', 'despertar');

    expect(postsService.getPosts).toHaveBeenLastCalledWith({
      page: 1,
      perPage: 20,
      search: '',
      categorySlug: 'de-preto',
      tagSlug: 'despertar',
    });
  });

  it('should switch the UI language without changing editorial content', async () => {
    createComponent();

    const transloco = TestBed.inject(TranslocoService);

    expect(fixture.nativeElement.textContent).toContain('Publicações do santuário');

    transloco.setActiveLang('en');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Sanctuary publications');
    expect(component.posts().map((post) => post.title)).toEqual(posts.map((post) => post.title));
  });

  it('should render a bounded pagination window with accessible current, first and last pages', () => {
    createComponent(of({ ...firstPage, total: 10_000, totalPages: 500 }));
    component.setViewMode('paged');
    component.goToPage(250);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const nav = compiled.querySelector('.posts-pagination--paged');
    expect(nav?.getAttribute('aria-label')).toBe('Paginação das publicações');
    expect(nav?.querySelectorAll('.posts-pagination__page').length).toBeLessThanOrEqual(7);
    expect(nav?.querySelectorAll('.posts-pagination__ellipsis')).toHaveLength(2);
    expect(nav?.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(nav?.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('250');
    const last = nav?.querySelector<HTMLButtonElement>('[aria-label="Ir para a página 500"]');
    last?.click();
    fixture.detectChanges();
    expect(component.currentPage()).toBe(500);
    expect(
      compiled.querySelectorAll<HTMLButtonElement>('.posts-pagination__direction')[1].disabled,
    ).toBe(true);
    compiled.querySelector<HTMLButtonElement>('[aria-label="Ir para a página 1"]')?.click();
    fixture.detectChanges();
    expect(component.currentPage()).toBe(1);
    expect(
      compiled.querySelector<HTMLButtonElement>('.posts-pagination__direction')?.disabled,
    ).toBe(true);
    for (const gap of compiled.querySelectorAll('.posts-pagination__ellipsis')) {
      expect(gap.getAttribute('aria-hidden')).toBe('true');
      expect(gap.querySelector('button')).toBeNull();
    }
  });

  function selectFilter(id: string, slug: string): void {
    const select = fixture.nativeElement.querySelector(`#${id}`) as HTMLSelectElement;
    select.value = slug;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('should expose category and dependent subcategory selectors below search', () => {
    createComponent();
    const compiled = fixture.nativeElement as HTMLElement;
    const category = compiled.querySelector<HTMLSelectElement>('#posts-category');
    const subcategory = compiled.querySelector<HTMLSelectElement>('#posts-subcategory');

    expect(
      compiled
        .querySelector('.posts-search')
        ?.nextElementSibling?.classList.contains('posts-filters'),
    ).toBe(true);
    expect(Array.from(category?.options ?? []).map((option) => option.text)).toEqual([
      'Todas as categorias',
      'Bruna',
      'Catuhsana',
    ]);
    expect(subcategory?.disabled).toBe(true);

    selectFilter('posts-category', 'bruna');
    expect(subcategory?.disabled).toBe(false);
    expect(Array.from(subcategory?.options ?? []).map((option) => option.text)).toEqual([
      'Todas as subcategorias',
      'Pensamentos',
      'De Preto',
    ]);

    selectFilter('posts-category', 'catuhsana');
    expect(subcategory?.disabled).toBe(true);
    expect(component.subcategoryControl.value).toBe('');
  });

  it('should keep search while filtering and remove a child or its entire branch with the X buttons', async () => {
    vi.useFakeTimers();
    createComponent();
    component.searchControl.setValue('presença');
    await vi.advanceTimersByTimeAsync(300);
    selectFilter('posts-category', 'bruna');
    selectFilter('posts-subcategory', 'pensamentos');

    expect(postsService.getPosts).toHaveBeenLastCalledWith({
      page: 1,
      perPage: 20,
      search: 'presença',
      categorySlug: 'pensamentos',
    });
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.posts-filters__chip')).toHaveLength(2);

    compiled.querySelector<HTMLButtonElement>('[aria-label="Retirar filtro Pensamentos"]')?.click();
    fixture.detectChanges();
    expect(postsService.getPosts).toHaveBeenLastCalledWith({
      page: 1,
      perPage: 20,
      search: 'presença',
      categorySlug: 'bruna',
    });
    expect(compiled.querySelectorAll('.posts-filters__chip')).toHaveLength(1);
    expect(document.activeElement).toBe(compiled.querySelector('#posts-category'));

    selectFilter('posts-subcategory', 'de-preto');
    compiled.querySelector<HTMLButtonElement>('[aria-label="Retirar filtro Bruna"]')?.click();
    fixture.detectChanges();
    expect(component.categoryControl.value).toBe('');
    expect(component.subcategoryControl.value).toBe('');
    expect(compiled.querySelector('.posts-filters__active')).toBeNull();
    expect(postsService.getPosts).toHaveBeenLastCalledWith({
      page: 1,
      perPage: 20,
      search: 'presença',
    });
  });

  it('should show filters supplied by category links and reset pagination when clearing them', () => {
    createComponent();
    const store = TestBed.inject(PostsStore);
    store.activateRoute('paged', '2', 'de-preto', 'despertar');
    fixture.detectChanges();

    expect(component.categoryControl.value).toBe('bruna');
    expect(component.subcategoryControl.value).toBe('de-preto');
    expect(fixture.nativeElement.querySelectorAll('.posts-filters__chip')).toHaveLength(3);
    fixture.nativeElement.querySelector('.posts-filters__clear').click();
    fixture.detectChanges();

    expect(component.currentPage()).toBe(1);
    expect(component.hasActiveFilters()).toBe(false);
    expect(router.navigate).toHaveBeenLastCalledWith(['/posts', 'paged'], {
      replaceUrl: false,
      scroll: 'manual',
    });
    expect(postsService.getPosts).toHaveBeenLastCalledWith({ page: 1, perPage: 20, search: '' });
  });

  it('should let the visitor retry category options after an error', () => {
    postsService.getArchiveCategories
      .mockReturnValueOnce(throwError(() => new Error('Unavailable')))
      .mockReturnValueOnce(of(categories));
    createComponent();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.posts-filters__feedback')?.textContent).toContain(
      'Não foi possível carregar as categorias.',
    );
    expect(compiled.querySelector<HTMLSelectElement>('#posts-category')?.disabled).toBe(true);

    compiled.querySelector<HTMLButtonElement>('.posts-filters__feedback button')?.click();
    fixture.detectChanges();
    expect(compiled.querySelector<HTMLSelectElement>('#posts-category')?.disabled).toBe(false);
    expect(compiled.querySelector('.posts-filters__feedback')).toBeNull();
  });
});

describe('Posts real-router canonicalization', () => {
  const getPosts = vi.fn<(query?: PostsQuery) => Observable<PostsPage>>();
  function response(page: number): PostsPage {
    return {
      posts: [
        {
          id: page,
          slug: `post-${page}`,
          title: `Post ${page}`,
          excerpt: '',
          publishedAt: '2026-11-04',
          category: '',
          categories: [],
        },
      ],
      page,
      perPage: 20,
      total: 200,
      totalPages: 10,
    };
  }
  beforeEach(async () => {
    getPosts.mockReset().mockImplementation((query) => of(response(query?.page ?? 1)));
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'posts', children: POSTS_ROUTES }]),
        {
          provide: WordPressPostsService,
          useValue: { getPosts, getArchiveCategories: () => of([]) },
        },
        {
          provide: NewsletterService,
          useValue: { getAvailability: () => of({ available: false }), subscribe: vi.fn() },
        },
        provideTransloco({
          config: {
            availableLangs: ['pt-BR', 'en'],
            defaultLang: 'pt-BR',
            fallbackLang: 'pt-BR',
            reRenderOnLangChange: true,
            prodMode: true,
          },
          loader: MockTranslocoLoader,
        }),
      ],
    }).compileComponents();
  });

  it.each(['0', '-1', 'abc', '1e3', '1', '9007199254740992'])(
    'should settle invalid or noncanonical page %s once and preserve URL filters',
    async (value) => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(`/posts/paged/${value}?category=pensamentos&tag=identidade`);
      await harness.fixture.whenStable();
      harness.detectChanges();
      const router = TestBed.inject(Router);
      expect(router.url.split('?')[0]).toBe('/posts/paged');
      expect(router.parseUrl(router.url).queryParams).toEqual({
        category: 'pensamentos',
        tag: 'identidade',
      });
      expect(getPosts).toHaveBeenCalledExactlyOnceWith({
        page: 1,
        perPage: 20,
        search: '',
        categorySlug: 'pensamentos',
        tagSlug: 'identidade',
      });
      expect(harness.routeNativeElement?.querySelectorAll('app-post-card')).toHaveLength(1);
    },
  );

  it('should recover an out-of-range URL once without a navigation loop', async () => {
    getPosts.mockImplementation((query) =>
      query?.page === 999999
        ? throwError(() => new PostsPageOutOfRangeError())
        : of(response(query?.page ?? 1)),
    );
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/posts/paged/999999?category=pensamentos&tag=identidade');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/posts/paged?category=pensamentos&tag=identidade');
    expect(getPosts.mock.calls.map(([query]) => query?.page)).toEqual([999999, 1]);
    expect(harness.routeNativeElement?.querySelector('.posts-feedback[role="alert"]')).toBeNull();
  });

  it('should request only the final page and filter combination during a reused route transition', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/posts/paged/4?category=bruna');
    await harness.navigateByUrl('/posts/paged/2?category=pensamentos&tag=identidade');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/posts/paged/2?category=pensamentos&tag=identidade');
    expect(
      getPosts.mock.calls.map(([query]) => [query?.page, query?.categorySlug, query?.tagSlug]),
    ).toEqual([
      [4, 'bruna', undefined],
      [2, 'pensamentos', 'identidade'],
    ]);
  });
});
