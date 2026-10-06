import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';

import { NotFound } from './not-found';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      notFound: {
        title: { line1: 'A rota se desfez', line2: 'em confusão.' },
        description: 'Nemi encontrou muitas palavras, mas nenhum caminho para esta página.',
        navigationLabel: 'Caminhos para continuar',
        actions: { home: 'Voltar ao santuário', matrix: 'Explorar a Matrix' },
        imageAlt: 'Nemi formada por palavras de confusão.',
      },
    });
  }
}

describe('NotFound', () => {
  let fixture: ComponentFixture<NotFound>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [
        provideRouter([]),
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

    fixture = TestBed.createComponent(NotFound);
    fixture.detectChanges();
  });

  it('should present Nemi and explain that the route was not found', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const image = compiled.querySelector<HTMLImageElement>('.not-found__figure img');

    expect(compiled.querySelector('h1')?.textContent).toContain('A rota se desfez');
    expect(compiled.querySelector('h1')?.textContent).toContain('em confusão.');
    expect(image?.getAttribute('src')).toBe('/images/not-found/nemi.png');
    expect(image?.getAttribute('width')).toBe('1448');
    expect(image?.getAttribute('height')).toBe('1086');
    expect(image?.getAttribute('alt')).toBe('Nemi formada por palavras de confusão.');
    expect(compiled.querySelector('.sanaka-editorial-label')).toBeNull();
    expect(compiled.querySelector('figcaption')).toBeNull();
  });

  it('should offer internal paths back to Sanaka', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll<HTMLAnchorElement>('.not-found__action'));

    expect(compiled.querySelector('.not-found__actions')?.getAttribute('aria-label')).toBe(
      'Caminhos para continuar',
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/', '/matrix']);
  });
});
