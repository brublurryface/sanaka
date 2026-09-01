import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Posts } from './posts';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Posts],
      providers: [
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

    fixture = TestBed.createComponent(Posts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one post card for each post', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('app-post-card');

    expect(cards.length).toBe(component.posts.length);
  });

  it('should render the post titles', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const titles = Array.from(compiled.querySelectorAll('.post-card__title')).map((title) =>
      title.textContent?.trim(),
    );

    expect(titles).toEqual(component.posts.map((post) => post.title));
  });

  it('should wait for the debounce before filtering posts', async () => {
    vi.useFakeTimers();

    component.searchControl.setValue('maya');

    await vi.advanceTimersByTimeAsync(299);

    expect(component.filteredPosts()).toEqual(component.posts);

    await vi.advanceTimersByTimeAsync(1);

    expect(component.filteredPosts().map((post) => post.title)).toEqual(['A presença de Māyā']);
  });

  it('should ignore accents and casing when filtering posts', async () => {
    vi.useFakeTimers();

    component.searchControl.setValue('SILENCIO');

    await vi.advanceTimersByTimeAsync(300);

    expect(component.filteredPosts().map((post) => post.title)).toEqual([
      'O silêncio do santuário',
    ]);
  });

  it('should search across post title, excerpt and category', async () => {
    vi.useFakeTimers();

    component.searchControl.setValue('REFLEXOES');

    await vi.advanceTimersByTimeAsync(300);

    expect(component.filteredPosts().map((post) => post.title)).toEqual([
      'Sanaka como espaço de estudo',
      'O silêncio do santuário',
    ]);
  });

  it('should render an empty state when no posts match the search', async () => {
    vi.useFakeTimers();

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
    expect(component.posts.map((post) => post.title)).toEqual([
      'A presença de Māyā',
      'Sanaka como espaço de estudo',
      'O silêncio do santuário',
    ]);
  });
});
