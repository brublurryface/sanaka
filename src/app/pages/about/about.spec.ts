import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';

import { About } from './about';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      about: {
        hero: {
          eyebrow: 'Autobiografia em construção',
          title: 'Quem atravessa Sanaka?',
          intro: 'Uma vida não cabe em uma apresentação.',
        },
        map: {
          eyebrow: 'Cartografia autobiográfica',
          title: 'Quatro ciclos, uma travessia',
          intro: 'Escolha um território.',
          ariaLabel: 'Ciclos da trajetória autobiográfica',
          traveler: 'Māyā acompanha o ciclo selecionado',
          open: 'Ler este ciclo',
        },
        status: { provisional: 'Texto provisório' },
        cycles: {
          origin: {
            number: '01',
            title: 'Origem',
            teaser: 'Primeiro ciclo',
            body: ['Origem um.', 'Origem dois.'],
          },
          creation: {
            number: '02',
            title: 'Criação',
            teaser: 'Segundo ciclo',
            body: ['Criação um.', 'Criação dois.'],
          },
          code: {
            number: '03',
            title: 'Código e transformação',
            teaser: 'Terceiro ciclo',
            body: ['Código um.', 'Código dois.'],
          },
          sanaka: {
            number: '04',
            title: 'E, de repente, Sanaka',
            teaser: 'Quarto ciclo',
            body: ['Sanaka um.', 'Sanaka dois.'],
          },
        },
        contact: {
          eyebrow: 'Presença atual',
          title: 'Onde me encontrar',
          intro: 'A conversa começa pelo e-mail.',
          emailLabel: 'Escrever por e-mail',
          email: 'sanaka@sanaka.com.br',
        },
        universe: {
          eyebrow: 'Outro portal',
          title: 'Sanakaverse',
          intro: 'Uma cartografia própria.',
          status: 'Portal em construção',
        },
      },
    });
  }
}

describe('About', () => {
  let fixture: ComponentFixture<About>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [About],
      providers: [
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

    fixture = TestBed.createComponent(About);
    fixture.detectChanges();
  });

  it('should render the four autobiographical cycles and the contact destination', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('.about-map__cycle')).toHaveLength(4);
    expect(compiled.querySelector('.about-destination--contact a')?.getAttribute('href')).toBe(
      'mailto:sanaka@sanaka.com.br',
    );
    expect(compiled.querySelector('.about-destination--universe')?.textContent).toContain(
      'Portal em construção',
    );
  });

  it('should replace the visible chapter after selecting another cycle', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cycles = compiled.querySelectorAll<HTMLAnchorElement>('.about-map__cycle');

    expect(compiled.querySelector('.about-story h2')?.textContent).toContain('Origem');

    cycles[3].click();
    fixture.detectChanges();

    expect(compiled.querySelector('.about-story h2')?.textContent).toContain(
      'E, de repente, Sanaka',
    );
    expect(cycles[3].getAttribute('aria-current')).toBe('step');
  });
});
