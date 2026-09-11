import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTransloco, TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Post } from './post';
import { Posts } from './posts';
import { PostsStore } from './posts.store';
import { PostsPage, PostsQuery, WordPressPostsService } from './wordpress-posts.service';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    const translations = {
      'pt-BR': {
        posts: {
          header: {
            eyebrow: 'Arquivo',
            title: 'Publicações do santuário',
            intro: 'Escrituras, estudos e reflexões reunidos no Sanaka.',
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
        posts: {
          header: {
            eyebrow: 'Archive',
            title: 'Sanctuary publications',
            intro: 'Scriptures, studies and reflections gathered in Sanaka.',
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
      slug: 'presenca-de-maya',
      title: 'A presença de Māyā',
      excerpt: 'Notas sobre as formas pelas quais Māyā aparece nas escrituras.',
      publishedAt: '2026-08-28',
      category: 'Escrituras',
    },
    {
      id: 2,
      slug: 'sanaka-como-espaco-de-estudo',
      title: 'Sanaka como espaço de estudo',
      excerpt: 'Reflexões sobre a construção de um espaço digital dedicado a textos e estudos.',
      publishedAt: '2026-08-24',
      category: 'Estudos',
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
      },
    ],
    page: 2,
    perPage: 20,
    total: 21,
    totalPages: 2,
  };

  const postsService = {
    getPosts: vi.fn<(query?: PostsQuery) => Observable<PostsPage>>(),
  };

  beforeEach(async () => {
    postsService.getPosts.mockReset();

    await TestBed.configureTestingModule({
      imports: [Posts],
      providers: [
        provideRouter([]),
        PostsStore,
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

    component.searchControl.setValue('maya');

    await vi.advanceTimersByTimeAsync(299);

    expect(postsService.getPosts).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);

    expect(postsService.getPosts).toHaveBeenLastCalledWith({
      page: 1,
      perPage: 20,
      search: 'maya',
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
    postsService.getPosts
      .mockReturnValueOnce(of(firstPage))
      .mockReturnValueOnce(of(secondPage));

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
});
