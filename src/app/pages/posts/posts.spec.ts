import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Post } from './post';
import { Posts } from './posts';
import { WordPressPostsService } from './wordpress-posts.service';

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
            placeholder: 'Busque por título, tema ou categoria...',
          },
          list: {
            title: 'Publicações',
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
            label: 'Search in publications',
            placeholder: 'Search by title, theme or category...',
          },
          list: {
            title: 'Publications',
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
    {
      id: 3,
      slug: 'silencio-do-santuario',
      title: 'O silêncio do santuário',
      excerpt: 'Uma investigação sobre silêncio, espaço e presença.',
      publishedAt: '2026-08-20',
      category: 'Reflexões',
    },
  ];

  const postsService = {
    getPosts: vi.fn<() => Observable<readonly Post[]>>(),
  };

  beforeEach(async () => {
    postsService.getPosts.mockReset();

    await TestBed.configureTestingModule({
      imports: [Posts],
      providers: [
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createComponent(postsResponse: Observable<readonly Post[]> = of(posts)): void {
    postsService.getPosts.mockReturnValue(postsResponse);
    fixture = TestBed.createComponent(Posts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    createComponent();

    expect(component).toBeTruthy();
  });

  it('should render one post card for each post returned by WordPress', () => {
    createComponent();

    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('app-post-card');

    expect(cards.length).toBe(component.posts().length);
  });

  it('should render the post titles returned by WordPress', () => {
    createComponent();

    const compiled = fixture.nativeElement as HTMLElement;
    const titles = Array.from(compiled.querySelectorAll('.post-card__title')).map((title) =>
      title.textContent?.trim(),
    );

    expect(titles).toEqual(component.posts().map((post) => post.title));
  });

  it('should show a loading state and disable search while WordPress is pending', () => {
    createComponent(new Subject<readonly Post[]>());

    const compiled = fixture.nativeElement as HTMLElement;
    const search = compiled.querySelector<HTMLInputElement>('.posts-search__input');

    expect(compiled.querySelector('.posts-feedback')?.textContent?.trim()).toBe(
      'Carregando publicações...',
    );
    expect(search?.disabled).toBe(true);
  });

  it('should show an error and load the posts after retrying', () => {
    postsService.getPosts
      .mockReturnValueOnce(throwError(() => new Error('WordPress unavailable')))
      .mockReturnValueOnce(of(posts));

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

  it('should wait for the debounce before filtering posts', async () => {
    vi.useFakeTimers();
    createComponent();

    component.searchControl.setValue('maya');

    await vi.advanceTimersByTimeAsync(299);

    expect(component.filteredPosts()).toEqual(component.posts());

    await vi.advanceTimersByTimeAsync(1);

    expect(component.filteredPosts().map((post) => post.title)).toEqual(['A presença de Māyā']);
  });

  it('should ignore accents and casing when filtering posts', async () => {
    vi.useFakeTimers();
    createComponent();

    component.searchControl.setValue('SILENCIO');

    await vi.advanceTimersByTimeAsync(300);

    expect(component.filteredPosts().map((post) => post.title)).toEqual([
      'O silêncio do santuário',
    ]);
  });

  it('should search across post title, excerpt and category', async () => {
    vi.useFakeTimers();
    createComponent();

    component.searchControl.setValue('REFLEXOES');

    await vi.advanceTimersByTimeAsync(300);

    expect(component.filteredPosts().map((post) => post.title)).toEqual([
      'Sanaka como espaço de estudo',
      'O silêncio do santuário',
    ]);
  });

  it('should render an empty state when no posts match the search', async () => {
    vi.useFakeTimers();
    createComponent();

    component.searchControl.setValue('conteudo inexistente');

    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('app-post-card').length).toBe(0);
    expect(compiled.querySelector('.posts-empty')?.textContent?.trim()).toBe(
      'Nenhuma publicação encontrada.',
    );
  });

  it('should switch the Posts UI language at runtime without changing the editorial content', async () => {
    createComponent();

    const transloco = TestBed.inject(TranslocoService);

    expect(transloco.getActiveLang()).toBe('pt-BR');
    expect(fixture.nativeElement.textContent).toContain('Publicações do santuário');
    expect(fixture.nativeElement.textContent).toContain('Buscar nas publicações');

    transloco.setActiveLang('en');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(transloco.getActiveLang()).toBe('en');
    expect(fixture.nativeElement.textContent).toContain('Sanctuary publications');
    expect(fixture.nativeElement.textContent).toContain('Search in publications');
    expect(component.posts().map((post) => post.title)).toEqual(posts.map((post) => post.title));
  });
});
