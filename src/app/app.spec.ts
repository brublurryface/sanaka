import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { routes } from './app.routes';
import { LanguagePreferenceService } from './core/i18n/language-preference.service';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    const translations = {
      'pt-BR': {
        app: {
          title: 'Sanaka',
          navigation: {
            ariaLabel: 'Navegação principal',
            home: 'Início',
            posts: 'Posts',
            matrix: 'Matrix',
            maya: 'Māyā',
          },
          language: {
            selector: 'Seletor de idioma',
          },
          footer: {
            description: 'Conhecimento em movimento.',
            navigation: 'Navegação do rodapé',
            about: 'Sobre & contato',
            soon: 'Em breve',
            signature: 'Entre código, símbolos e presença.',
          },
        },
      },
      en: {
        app: {
          title: 'Sanaka',
          navigation: {
            ariaLabel: 'Main navigation',
            home: 'Home',
            posts: 'Posts',
            matrix: 'Matrix',
            maya: 'Māyā',
          },
          language: {
            selector: 'Language selector',
          },
          footer: {
            description: 'Knowledge in motion.',
            navigation: 'Footer navigation',
            about: 'About & contact',
            soon: 'Coming soon',
            signature: 'Between code, symbols, and presence.',
          },
        },
      },
    };

    return of(translations[lang as keyof typeof translations] ?? translations['pt-BR']);
  }
}

describe('App', () => {
  let mockLanguagePreferenceService: {
    initialize: ReturnType<typeof vi.fn>;
    setLanguage: ReturnType<typeof vi.fn>;
    isActiveLanguage: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockLanguagePreferenceService = {
      initialize: vi.fn(),
      setLanguage: vi.fn(),
      isActiveLanguage: vi.fn((lang) => lang === 'pt-BR'),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: LanguagePreferenceService, useValue: mockLanguagePreferenceService },
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

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('should render the Sanaka brand', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    const brand = compiled.querySelector<HTMLAnchorElement>('.brand');
    const flame = brand?.querySelector<HTMLImageElement>('.brand-flame');

    expect(brand).toBeTruthy();
    expect(brand?.getAttribute('aria-label')).toBe('Sanaka');
    expect(brand?.getAttribute('href')).toBe('/');
    expect(brand?.textContent?.replace(/\s/g, '')).toBe('SANAKA');
    expect(flame?.getAttribute('src')).toBe('/images/brand/flame-mark.webp');
    expect(flame?.getAttribute('alt')).toBe('');
    expect(flame?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should render the main navigation links', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    const navigation = compiled.querySelector('nav');

    expect(navigation).toBeTruthy();

    const links = Array.from(navigation?.querySelectorAll<HTMLAnchorElement>('a') ?? []);

    expect(links.length).toBeGreaterThan(0);
    expect(links.map((link) => link.getAttribute('href'))).toContain('/');
    expect(links.map((link) => link.getAttribute('href'))).toContain('/posts');
    expect(links.map((link) => link.getAttribute('href'))).toContain('/matrix');
    expect(links.map((link) => link.getAttribute('href'))).toContain('/maya');
  });

  it('should render the footer without exposing an unfinished About route', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const footer = compiled.querySelector<HTMLElement>('.app-footer');
    const footerNavigation = footer?.querySelector<HTMLElement>('nav');
    const futureDestination = footer?.querySelector<HTMLElement>('.app-footer__future');

    expect(footer).toBeTruthy();
    expect(footerNavigation?.getAttribute('aria-label')).toBe('Navegação do rodapé');
    expect(futureDestination?.textContent).toContain('Sobre & contato');
    expect(futureDestination?.querySelector('a')).toBeNull();
  });

  it('should switch the interface language at runtime using the PT | EN selector', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    // Confirma o idioma inicial pelo estado do componente.
    mockLanguagePreferenceService.isActiveLanguage = vi.fn((lang) => lang === 'pt-BR');
    expect(fixture.componentInstance.isActiveLanguage('pt-BR')).toBe(true);
    expect(fixture.componentInstance.isActiveLanguage('en')).toBe(false);

    // Troca para inglês.
    fixture.componentInstance.setLanguage('en');
    expect(mockLanguagePreferenceService.setLanguage).toHaveBeenCalledWith('en');

    // Atualiza o mock para refletir a troca.
    mockLanguagePreferenceService.isActiveLanguage = vi.fn((lang) => lang === 'en');
    expect(fixture.componentInstance.isActiveLanguage('en')).toBe(true);
    expect(fixture.componentInstance.isActiveLanguage('pt-BR')).toBe(false);

    // Retorna ao português.
    fixture.componentInstance.setLanguage('pt-BR');
    expect(mockLanguagePreferenceService.setLanguage).toHaveBeenCalledWith('pt-BR');
  });
});
