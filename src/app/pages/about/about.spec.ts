import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
          eyebrow: 'Autobiografia fluída',
          title: {
            line1: 'Quem transcende',
            line2: 'Sanaka?',
          },
          intro: 'Bruna Lourenço da Silva avisa: áreas que mudam e se transmutam.',
        },
        puzzle: {
          eyebrow: 'Identidade em fragmentos',
          title: {
            line1: 'Seis peças,',
            line2: 'nenhuma conclusão',
          },
          intro: {
            start: 'Use o seu mouse ou dedo, como',
            middle: 'sobe no ratinho',
            end: 'para se locomover e passeie pelos fragmentos.',
          },
          ariaLabel: 'Quebra-cabeça autobiográfico',
          select: 'Ir para fragmento',
          loading: 'Reunindo fragmentos de Sanaka',
          error: 'As peças não puderam ser reunidas.',
          retry: 'Tentar novamente',
        },
        story: {
          eyebrow: 'Fragmento selecionado',
          read: 'Ler fragmento inteiro',
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
        provideRouter([]),
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
    const puzzleImage = compiled.querySelector('.about-puzzle__art image');

    expect(heroClasses?.contains('sanaka-atmosphere-hero')).toBe(true);
    expect(heroClasses?.contains('sanaka-atmosphere-hero--compact')).toBe(true);
    expect(compiled.querySelectorAll('.about-hero h1 span')).toHaveLength(2);
    expect(compiled.querySelectorAll('.about-section-heading h2 span')).toHaveLength(2);
    expect(compiled.querySelectorAll('.about-puzzle__piece')).toHaveLength(6);
    expect(compiled.querySelectorAll('.about-puzzle-mobile__piece')).toHaveLength(6);
    expect(compiled.querySelectorAll('.about-puzzle__image')).toHaveLength(6);
    expect(compiled.querySelectorAll('.about-puzzle__image--active')).toHaveLength(1);
    expect(compiled.querySelectorAll('.about-puzzle__shade')).toHaveLength(6);
    expect(compiled.querySelectorAll('.about-puzzle-mobile__shade')).toHaveLength(6);
    expect(compiled.querySelectorAll('.about-puzzle__outline')).toHaveLength(6);
    expect(puzzleImage?.getAttribute('href')).toBe('/images/about/about-cycles-sketch.webp');
    expect(puzzleImage?.getAttribute('x')).toBe('-16');
    expect(puzzleImage?.getAttribute('width')).toBe('332');
    expect(compiled.querySelector('.about-puzzle-mobile__art')?.getAttribute('viewBox')).toBe(
      '-18 -18 136 136',
    );
    expect(compiled.querySelector('.about-puzzle__hover-text')?.textContent).toContain('Hover 1');
    expect(compiled.querySelector('.about-puzzle__action')?.textContent).toContain(
      'Ir para fragmento',
    );
    expect(compiled.querySelector('.about-puzzle__action')?.getAttribute('href')).toBe(
      '/sobre#about-story',
    );
    expect(compiled.querySelector('.about-destination--contact a')?.getAttribute('href')).toBe(
      'mailto:sanaka@sanaka.com.br',
    );
  });

  it('should expose the selected excerpt and its internal publication link', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const selectors = compiled.querySelectorAll<HTMLButtonElement>('.about-puzzle__selector');
    const mobileSelectors = compiled.querySelectorAll<HTMLButtonElement>(
      '.about-puzzle-mobile__selector',
    );
    const images = compiled.querySelectorAll<SVGImageElement>('.about-puzzle__image');

    selectors[4].click();
    fixture.detectChanges();

    expect(compiled.querySelector('.about-story h2')?.textContent).toContain('Cycle 5');
    expect(
      compiled.querySelector('.about-story__content > p:not(.about-eyebrow)')?.textContent,
    ).toContain('Excerpt 5');
    const storyLink = compiled.querySelector<HTMLAnchorElement>('.about-story__link');

    expect(storyLink?.getAttribute('href')).toBe('/posts/cycle-5');
    expect(storyLink?.target).toBe('_blank');
    expect(storyLink?.rel).toBe('noopener');
    expect(selectors[4].getAttribute('aria-pressed')).toBe('true');
    expect(selectors[4].getAttribute('aria-label')).toContain('Cycle 5');
    expect(selectors[4].getAttribute('href')).toBeNull();
    expect(images[0].classList.contains('about-puzzle__image--active')).toBe(false);
    expect(images[4].classList.contains('about-puzzle__image--active')).toBe(true);

    mobileSelectors[2].click();
    fixture.detectChanges();

    expect(compiled.querySelector('.about-story h2')?.textContent).toContain('Cycle 3');
    expect(mobileSelectors[2].getAttribute('aria-pressed')).toBe('true');
    expect(compiled.querySelector('.about-puzzle-mobile__action')?.getAttribute('href')).toBe(
      '/sobre#about-story',
    );
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
