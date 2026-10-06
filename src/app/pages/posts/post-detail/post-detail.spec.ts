import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Translation, TranslocoLoader, provideTransloco } from '@jsverse/transloco';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { PostDetail } from '../post';
import { WordPressPostsService } from '../data-access/wordpress-posts.service';
import { PostDetailPage } from './post-detail';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation(): Observable<Translation> {
    return of({
      posts: {
        error: { retry: 'Tentar novamente' },
        detail: {
          loading: 'Abrindo a publicação...',
          error: 'Não foi possível abrir esta publicação.',
          notFound: 'Esta publicação não foi encontrada.',
          back: 'Voltar à biblioteca',
          progress: 'Progresso da leitura',
          categories: 'Caminho de categorias',
          category: 'Categoria',
          categoriesGroup: 'Categorias',
          relatedCategories: 'Também em {{ category }}',
          tags: 'Tags',
          exploreCategories: 'Explore categorias',
          exploreTags: 'Explore tags',
          readingTime: '{{ minutes }} min de leitura',
          adjacent: 'Publicações próximas',
          previous: 'Publicação anterior',
          next: 'Próxima publicação',
        },
      },
      app: {
        pageTitles: { post: 'Publicação' },
        pageDescriptions: { post: 'Leia esta publicação no santuário de Sanaka.' },
      },
    });
  }
}

describe('PostDetailPage', () => {
  let fixture: ComponentFixture<PostDetailPage>;

  const post: PostDetail = {
    id: 77,
    slug: 'voce',
    title: 'VOCÊ',
    excerpt: 'Quem é você?',
    publishedAt: '2026-09-22',
    category: 'Bruna · Pensamentos',
    coverImageUrl: 'https://example.com/voce.jpg',
    coverImageAlt: 'Maya escrevendo',
    contentHtml: '<p>Quem é <strong>você</strong>?</p>',
    categories: [
      { id: 41, name: 'Bruna', slug: 'bruna' },
      { id: 45, name: 'Pensamentos', slug: 'pensamentos' },
    ],
    tags: [{ id: 9, name: 'Identidade', slug: 'identidade' }],
    relatedCategories: [{ id: 43, name: 'Romance', slug: 'romance' }],
    exploreCategories: [{ id: 62, name: 'Sobre', slug: 'sobre' }],
    exploreTags: [{ id: 10, name: 'Consciência', slug: 'consciencia' }],
    readingMinutes: 4,
    previous: { slug: 'anterior', title: 'Anterior' },
    next: { slug: 'proxima', title: 'Próxima' },
  };

  const postsService = {
    getPostBySlug: vi.fn<(slug: string) => Observable<PostDetail | null>>(),
  };

  beforeEach(async () => {
    postsService.getPostBySlug.mockReset();

    await TestBed.configureTestingModule({
      imports: [PostDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'voce' })) },
        },
        { provide: WordPressPostsService, useValue: postsService },
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

  function createComponent(response: Observable<PostDetail | null> = of(post)): HTMLElement {
    postsService.getPostBySlug.mockReturnValue(response);
    fixture = TestBed.createComponent(PostDetailPage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('should render the complete publication, taxonomy and navigation', () => {
    const compiled = createComponent();

    expect(postsService.getPostBySlug).toHaveBeenCalledWith('voce');
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('VOCÊ');
    expect(compiled.querySelector('.post-reader__content')?.textContent?.trim()).toBe(
      'Quem é você?',
    );
    expect(compiled.querySelector('.post-reader__categories')?.textContent).toContain(
      'Pensamentos',
    );
    expect(compiled.querySelector('.post-reader__taxonomy')?.textContent).toContain('Bruna');
    expect(compiled.querySelector('.post-reader__tags')?.textContent).toContain('Identidade');
    expect(compiled.querySelector('.post-reader__article')).not.toBeNull();
    expect(compiled.querySelector('.post-reader__taxonomy')).not.toBeNull();
    expect(compiled.querySelector('.post-reader__title-rule img')?.getAttribute('src')).toBe(
      '/images/posts/temple/hamsa.svg',
    );
    expect(compiled.querySelector('.post-reader__taxonomy')?.textContent).toContain('Romance');
    expect(compiled.querySelector('.post-reader__taxonomy')?.textContent).toContain('Sobre');
    expect(compiled.querySelector('.post-reader__taxonomy')?.textContent).toContain('Consciência');
    expect(
      compiled.querySelector<HTMLAnchorElement>('.post-reader__categories a')?.getAttribute('href'),
    ).toBe('/posts?category=pensamentos');
    expect(
      compiled.querySelector<HTMLAnchorElement>('.post-reader__tags a')?.getAttribute('href'),
    ).toBe('/posts?tag=identidade');
    expect(compiled.querySelector('.post-detail__art img')?.getAttribute('src')).toBe(
      'https://example.com/voce.jpg',
    );
    expect(compiled.querySelectorAll('.post-detail__adjacent a')).toHaveLength(2);
    expect(TestBed.inject(Title).getTitle()).toBe('VOCÊ | Sanaka');
    expect(compiled.querySelector<HTMLAnchorElement>('.post-detail__adjacent a')?.target).toBe(
      '_blank',
    );
    expect(compiled.querySelector<HTMLAnchorElement>('.post-detail__adjacent a')?.rel).toBe(
      'noopener',
    );
  });

  it('should calculate reading progress from the article position in the document', () => {
    createComponent();
    const component = fixture.componentInstance;
    const article = document.getElementById('post-reading-nave');

    vi.spyOn(article!, 'getBoundingClientRect').mockReturnValue({
      top: -500,
      bottom: 700,
      height: 1200,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: -500,
      toJSON: () => ({}),
    });
    Object.defineProperty(article, 'scrollHeight', { configurable: true, value: 1200 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 700 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 700 });

    component.updateReadingProgress();

    expect(component.readingProgress()).toBe(100);
  });

  it('should show the not-found state without rendering an article', () => {
    const compiled = createComponent(of(null));

    expect(compiled.textContent).toContain('Esta publicação não foi encontrada.');
    expect(compiled.querySelector('.post-reader')).toBeNull();
  });

  it('should retry after a loading error', () => {
    postsService.getPostBySlug
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(of(post));

    fixture = TestBed.createComponent(PostDetailPage);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const retry = compiled.querySelector<HTMLButtonElement>('.post-detail__feedback button');

    retry?.click();
    fixture.detectChanges();

    expect(postsService.getPostBySlug).toHaveBeenCalledTimes(2);
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('VOCÊ');
  });
});
