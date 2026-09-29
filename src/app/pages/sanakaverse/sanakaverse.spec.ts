import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of, throwError } from 'rxjs';

import { SanakaverseBooksService } from './data-access/sanakaverse-books.service';
import { Sanakaverse } from './sanakaverse';
import { SanakaverseBook } from './sanakaverse-book';

const books: readonly SanakaverseBook[] = [
  {
    id: 1,
    slug: 'maya',
    title: 'Māyā',
    coverImageUrl: 'https://example.com/maya.webp',
    coverImageAlt: 'Maya diante de um portal',
  },
  {
    id: 2,
    slug: 'vasuki',
    title: 'Vāsuki',
  },
  {
    id: 3,
    slug: 'kalika',
    title: 'Kālikā',
    coverImageUrl: 'https://example.com/kalika.webp',
  },
  {
    id: 4,
    slug: 'bhu',
    title: 'Bhū',
    coverImageUrl: 'https://example.com/bhu.webp',
  },
];

class MockSanakaverseBooksService {
  getBooks = vi.fn(() => of(books));
}

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      sanakaverse: {
        hero: {
          eyebrow: 'Sanakaverse',
          title: { line1: 'Biblioteca', line2: 'entre mundos' },
          intro: 'Livros flutuam onde histórias encontram passagem.',
        },
        collection: {
          eyebrow: 'Volumes em órbita',
          title: 'Escolha um livro',
          intro: 'Aproxime-se das capas.',
          ariaLabel: 'Livros do Sanakaverse',
        },
        book: {
          open: 'Abrir volume',
          untitled: 'Volume sem título',
          unrevealed: 'Capa ainda não revelada',
        },
        loading: 'Alinhando os livros às estrelas…',
        error: {
          title: 'A órbita se desfez.',
          retry: 'Tentar reunir os volumes',
        },
      },
    });
  }
}

describe('Sanakaverse', () => {
  let fixture: ComponentFixture<Sanakaverse>;
  let booksService: MockSanakaverseBooksService;

  beforeEach(async () => {
    booksService = new MockSanakaverseBooksService();

    await TestBed.configureTestingModule({
      imports: [Sanakaverse],
      providers: [
        provideRouter([]),
        { provide: SanakaverseBooksService, useValue: booksService },
        provideTransloco({
          config: {
            availableLangs: ['pt-BR'],
            defaultLang: 'pt-BR',
            reRenderOnLangChange: true,
            prodMode: true,
          },
          loader: MockTranslocoLoader,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Sanakaverse);
  });

  it('should render WordPress volumes as square covers that open internal posts in new tabs', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const renderedBooks = compiled.querySelectorAll('.sanakaverse-book');
    const links = compiled.querySelectorAll<HTMLAnchorElement>('.sanakaverse-book__link');
    const images = compiled.querySelectorAll<HTMLImageElement>('.sanakaverse-book__volume > img');

    expect(compiled.querySelectorAll('.sanakaverse-hero h1 span')).toHaveLength(2);
    expect(renderedBooks).toHaveLength(4);
    expect(images).toHaveLength(3);
    expect(images[0].getAttribute('src')).toBe('https://example.com/maya.webp');
    expect(images[0].getAttribute('alt')).toBe('Maya diante de um portal');
    expect(images[0].getAttribute('width')).toBe('1200');
    expect(images[0].getAttribute('height')).toBe('1200');
    expect(compiled.querySelectorAll('.sanakaverse-book__placeholder')).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/posts/maya');
    expect(links[0].target).toBe('_blank');
    expect(links[0].rel).toBe('noopener');
  });

  it('should keep the stellar collection open without adding an empty-state card', () => {
    booksService.getBooks.mockReturnValueOnce(of([]));

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.sanakaverse-empty')).toBeNull();
    expect(compiled.querySelectorAll('.sanakaverse-book')).toHaveLength(0);
    expect(compiled.textContent).toContain('Escolha um livro');
  });

  it('should offer a retry when WordPress cannot load the collection', () => {
    booksService.getBooks.mockReturnValueOnce(throwError(() => new Error('offline')));

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const retryButton = compiled.querySelector<HTMLButtonElement>(
      '.sanakaverse-feedback--error button',
    );

    expect(retryButton).not.toBeNull();

    retryButton?.click();
    fixture.detectChanges();

    expect(booksService.getBooks).toHaveBeenCalledTimes(2);
    expect(compiled.querySelectorAll('.sanakaverse-book')).toHaveLength(4);
  });
});
