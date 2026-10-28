import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of, throwError } from 'rxjs';

import { About } from './about';
import { AboutCyclePost, AboutCyclesService } from './data-access/about-cycles.service';

const addedCycleSlugs = ['vii-aplicacao', 'viii-personagens', 'ix-fim-por-enquanto'];

const cycles: readonly AboutCyclePost[] = Array.from({ length: 9 }, (_, index) => ({
  id: index + 1,
  slug: addedCycleSlugs[index - 6] ?? `cycle-${index + 1}`,
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
      common: {
        actions: { retry: 'Tentar novamente' },
      },
      about: {
        hero: {
          eyebrow: 'Autobiografia fluída',
          title: {
            line1: 'Quem transcende',
            line2: 'Sanaka?',
          },
          intro: 'Bruna Lourenço da Silva avisa: áreas que mudam e se transmutam.',
          imageAlt: 'Saṃvit observa dragões de sombra diante de uma passagem luminosa.',
        },
        puzzle: {
          eyebrow: 'Identidade em fragmentos',
          title: {
            line1: 'Nove peças,',
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
          eyebrow: 'Presença do agora',
          title: 'Contato',
          intro: 'Redes e uma passagem direta.',
          status: 'Abrir o portal de contato',
        },
        universe: {
          eyebrow: 'Presença criativa',
          title: 'Sanakaverse',
          intro: 'Personagens, símbolos e relações que habitam o universo narrativo de Sanaka.',
          status: 'Viajar para Sanakaverse',
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

  it('should render nine WordPress cycles and preserve the contact destinations', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    const heroClasses = compiled.querySelector('.about-hero')?.classList;
    const heroImage = compiled.querySelector<HTMLImageElement>('.about-hero__image');
    const puzzleImage = compiled.querySelector('.about-puzzle__art image');

    expect(heroClasses?.contains('sanaka-atmosphere-hero')).toBe(true);
    expect(heroClasses?.contains('sanaka-atmosphere-hero--cinematic')).toBe(true);
    expect(heroClasses?.contains('sanaka-atmosphere-hero--compact')).toBe(false);
    expect(heroImage?.getAttribute('src')).toBe('/images/about/about-atmosphere-desktop.webp');
    expect(heroImage?.getAttribute('width')).toBe('1942');
    expect(heroImage?.getAttribute('height')).toBe('809');
    expect(heroImage?.getAttribute('alt')).toContain('dragões de sombra');
    expect(compiled.querySelector('.about-hero__veil')).not.toBeNull();
    expect(compiled.querySelectorAll('.about-hero h1 span')).toHaveLength(2);
    expect(compiled.querySelectorAll('.about-section-heading h2 span')).toHaveLength(2);
    expect(compiled.querySelectorAll('.about-puzzle__piece')).toHaveLength(9);
    expect(compiled.querySelectorAll('.about-puzzle-mobile__piece')).toHaveLength(9);
    expect(compiled.querySelectorAll('.about-puzzle__image')).toHaveLength(9);
    expect(compiled.querySelectorAll('.about-puzzle__image--active')).toHaveLength(1);
    expect(compiled.querySelectorAll('.about-puzzle__shade')).toHaveLength(9);
    expect(compiled.querySelectorAll('.about-puzzle-mobile__shade')).toHaveLength(9);
    expect(compiled.querySelectorAll('.about-puzzle__outline')).toHaveLength(9);
    expect(puzzleImage?.getAttribute('href')).toBe('/images/about/about-cycles-sketch.webp');
    expect(puzzleImage?.getAttribute('x')).toBe('-16');
    expect(puzzleImage?.getAttribute('width')).toBe('332');
    expect(puzzleImage?.getAttribute('height')).toBe('232');
    expect(compiled.querySelector('.about-puzzle__art')?.getAttribute('viewBox')).toBe(
      '-16 -16 332 332',
    );
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
      '/contato',
    );
    const sanakaverseLink = compiled.querySelector<HTMLAnchorElement>(
      '.about-destination--universe a',
    );

    expect(sanakaverseLink?.getAttribute('href')).toBe('/sanakaverse');
    expect(sanakaverseLink?.target).toBe('_blank');
    expect(sanakaverseLink?.rel).toBe('noopener');
  });

  it('should preserve the original six illustrations and use the approved art for the last three on desktop and mobile', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    for (const selector of ['.about-puzzle__image', '.about-puzzle-mobile__image']) {
      const images = compiled.querySelectorAll<SVGImageElement>(selector);

      expect(images).toHaveLength(9);

      for (const [index, image] of images.entries()) {
        const isOriginal = index < 6;

        expect(image.getAttribute('href')).toBe(
          isOriginal
            ? '/images/about/about-cycles-sketch.webp'
            : '/images/about/about-cycles-sketch-nine.webp',
        );
        expect(image.getAttribute('x')).toBe('-16');
        expect(image.getAttribute('y')).toBe('-16');
        expect(image.getAttribute('width')).toBe('332');
        expect(image.getAttribute('height')).toBe(isOriginal ? '232' : '332');
        expect(image.getAttribute('preserveAspectRatio')).toBe('none');
      }
    }
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

  it('should select each added fragment from desktop and mobile with its own art and link', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const selectors = compiled.querySelectorAll<HTMLButtonElement>('.about-puzzle__selector');
    const mobileSelectors = compiled.querySelectorAll<HTMLButtonElement>(
      '.about-puzzle-mobile__selector',
    );
    const images = compiled.querySelectorAll<SVGImageElement>('.about-puzzle__image');
    const mobileArt = compiled.querySelectorAll<SVGElement>('.about-puzzle-mobile__art');
    const viewBoxes = ['-18 182 136 136', '82 182 136 136', '182 182 136 136'];

    for (const [offset, slug] of addedCycleSlugs.entries()) {
      const index = offset + 6;
      const order = index + 1;

      selectors[index].click();
      fixture.detectChanges();

      expect(compiled.querySelector('.about-story__link')?.getAttribute('href')).toBe(
        `/posts/${slug}`,
      );
      expect(selectors[index].getAttribute('aria-pressed')).toBe('true');
      expect(images[index].getAttribute('clip-path')).toBe(`url(#about-puzzle-piece-${order})`);
      expect(images[index].classList.contains('about-puzzle__image--active')).toBe(true);
      expect(mobileArt[index].getAttribute('viewBox')).toBe(viewBoxes[offset]);

      selectors[0].click();
      fixture.detectChanges();
      mobileSelectors[index].click();
      fixture.detectChanges();

      expect(compiled.querySelector('.about-story__link')?.getAttribute('href')).toBe(
        `/posts/${slug}`,
      );
      expect(mobileSelectors[index].getAttribute('aria-pressed')).toBe('true');
      expect(compiled.querySelectorAll('.about-puzzle__image--active')).toHaveLength(1);
      expect(compiled.querySelectorAll('.about-puzzle-mobile__image--active')).toHaveLength(1);
    }
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
    expect(compiled.querySelectorAll('.about-puzzle__piece')).toHaveLength(9);
  });
});
