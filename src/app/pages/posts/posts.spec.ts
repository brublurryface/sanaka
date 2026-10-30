import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTransloco, TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Post, PostCategory } from './post';
import { Posts } from './posts';
import { PostsStore } from './posts.store';
import { NewsletterService } from './newsletter-signup/data-access/newsletter.service';
import {
  PostsPage,
  PostsQuery,
  WordPressPostsService,
} from './data-access/wordpress-posts.service';

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
            sanakaverseLink: 'Viajar para Sanakaverse',
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
            sanakaverseLink: 'Travel to Sanakaverse',
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

    expect(link?.getAttribute('href')).toBe('/sanakaverse');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.textContent).toContain('Viajar para Sanakaverse');
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
    expect(fixture.nativeElement.querySelector('app-newsletter-signup#newsletter')).not.toBeNull();
  });

  it('should show a loading state while WordPress is pending', () => {
    createComponent(new Subject<PostsPage>());

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.posts-feedback')?.textContent?.trim()).toBe(
      'Carregando publicações...',
    );
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
    expect(router.navigate).toHaveBeenLastCalledWith(['/posts', 'paged'], { replaceUrl: false });
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
