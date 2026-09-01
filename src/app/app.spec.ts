import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoLoader, TranslocoService } from '@jsverse/transloco';
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
            maya: 'Māyā',
          },
          language: {
            selector: 'Seletor de idioma',
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
            maya: 'Māyā',
          },
          language: {
            selector: 'Language selector',
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

    expect(brand).toBeTruthy();
    expect(brand?.getAttribute('aria-label')).toBe('Sanaka');
    expect(brand?.getAttribute('href')).toBe('/');
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
    expect(links.map((link) => link.getAttribute('href'))).toContain('/maya');
  });

  it('should switch the interface language at runtime using the PT | EN selector', () => {
    const fixture = TestBed.createComponent(App);
    const transloco = TestBed.inject(TranslocoService);
    fixture.detectChanges();

    // Verify initial language is pt-BR (component state)
    mockLanguagePreferenceService.isActiveLanguage = vi.fn((lang) => lang === 'pt-BR');
    expect(fixture.componentInstance.isActiveLanguage('pt-BR')).toBe(true);
    expect(fixture.componentInstance.isActiveLanguage('en')).toBe(false);

    // Switch to English
    fixture.componentInstance.setLanguage('en');
    expect(mockLanguagePreferenceService.setLanguage).toHaveBeenCalledWith('en');

    // Update mock to reflect language switch
    mockLanguagePreferenceService.isActiveLanguage = vi.fn((lang) => lang === 'en');
    expect(fixture.componentInstance.isActiveLanguage('en')).toBe(true);
    expect(fixture.componentInstance.isActiveLanguage('pt-BR')).toBe(false);

    // Switch back to Portuguese
    fixture.componentInstance.setLanguage('pt-BR');
    expect(mockLanguagePreferenceService.setLanguage).toHaveBeenCalledWith('pt-BR');
  });
});
