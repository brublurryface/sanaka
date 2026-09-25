import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of, throwError } from 'rxjs';

import { About } from './about';
import { AboutCyclePost, AboutCyclesService } from './data-access/about-cycles.service';

const cycles: readonly AboutCyclePost[] = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  slug: `cycle-${index + 1}`,
  title: `${index + 1} — Cycle ${index + 1}`,
  hoverText: `Hover ${index + 1}`,
  excerpt: `Excerpt ${index + 1}`,
  url: `https://example.com/cycle-${index + 1}/`,
  order: index + 1,
}));

class MockAboutCyclesService {
  getCycles = vi.fn(() => of(cycles));
}

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      about: {
        hero: {
          eyebrow: 'Autobiografia em construção',
          title: 'Quem atravessa Sanaka?',
          intro: 'Uma vida não cabe em uma apresentação.',
        },
        puzzle: {
          eyebrow: 'Identidade em fragmentos',
          title: 'Seis peças, nenhuma conclusão',
          intro: 'Aproxime-se de uma peça.',
          ariaLabel: 'Quebra-cabeça autobiográfico',
          select: 'Selecionar peça',
          loading: 'Reunindo as peças...',
          error: 'As peças não puderam ser reunidas.',
          retry: 'Tentar novamente',
        },
        story: {
          eyebrow: 'Fragmento selecionado',
          read: 'Ler o ciclo completo',
        },
        destinationsLabel: 'Sobre e Sanakaverse',
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
  let cyclesService: MockAboutCyclesService;

  beforeEach(async () => {
    cyclesService = new MockAboutCyclesService();

    await TestBed.configureTestingModule({
      imports: [About],
      providers: [
        { provide: AboutCyclesService, useValue: cyclesService },
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
  });

  it('should render six WordPress cycles and preserve the contact destinations', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    const heroClasses = compiled.querySelector('.about-hero')?.classList;

    expect(heroClasses?.contains('sanaka-atmosphere-hero')).toBe(true);
    expect(heroClasses?.contains('sanaka-atmosphere-hero--compact')).toBe(true);
    expect(compiled.querySelectorAll('.about-puzzle__piece')).toHaveLength(6);
    expect(compiled.querySelectorAll('.about-puzzle__outline')).toHaveLength(6);
    expect(compiled.querySelector('.about-puzzle__art image')?.getAttribute('href')).toBe(
      '/images/about/about-cycles-sketch.webp',
    );
    expect(compiled.querySelector('.about-puzzle__hover-text')?.textContent).toContain('Hover 1');
    expect(compiled.querySelector('.about-destination--contact a')?.getAttribute('href')).toBe(
      'mailto:sanaka@sanaka.com.br',
    );
  });

  it('should expose the selected excerpt and its complete WordPress link', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const pieces = compiled.querySelectorAll<HTMLButtonElement>('.about-puzzle__piece');

    pieces[4].click();
    fixture.detectChanges();

    expect(compiled.querySelector('.about-story h2')?.textContent).toContain('Cycle 5');
    expect(
      compiled.querySelector('.about-story__content > p:not(.about-eyebrow)')?.textContent,
    ).toContain('Excerpt 5');
    expect(compiled.querySelector('.about-story__link')?.getAttribute('href')).toBe(
      'https://example.com/cycle-5/',
    );
    expect(pieces[4].getAttribute('aria-pressed')).toBe('true');
  });

  it('should show a retry action when WordPress cannot load the cycles', () => {
    cyclesService.getCycles.mockReturnValueOnce(throwError(() => new Error('offline')));

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const retryButton = compiled.querySelector<HTMLButtonElement>('.about-feedback--error button');

    expect(retryButton).not.toBeNull();

    retryButton?.click();
    fixture.detectChanges();

    expect(cyclesService.getCycles).toHaveBeenCalledTimes(2);
    expect(compiled.querySelectorAll('.about-puzzle__piece')).toHaveLength(6);
  });
});
