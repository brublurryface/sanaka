import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationStart, provideRouter, Router } from '@angular/router';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { filter, firstValueFrom, of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { routes } from './app.routes';
import { LanguagePreferenceService } from './core/i18n/language-preference.service';
import { PageLoadingState } from './core/navigation/page-loading-state';
import {
  WordPressPostsService,
  PostsPage,
} from './pages/posts/data-access/wordpress-posts.service';
import { NewsletterService } from './pages/posts/newsletter-signup/data-access/newsletter.service';
import { PostCategory } from './pages/posts/post';
import { SanakaverseBooksService } from './pages/sanakaverse/data-access/sanakaverse-books.service';

@Component({ template: 'Ready' })
class ReadyPage {}

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    const translations = {
      'pt-BR': {
        posts: { loading: 'Carregando publicações...' },
        newsletter: { footerLink: 'Newsletter' },
        app: {
          title: 'Sanaka',
          navigation: {
            ariaLabel: 'Navegação principal',
            home: 'Início',
            posts: 'Posts',
            matrix: 'Matrix',
            samvit: 'Saṃvit',
            about: 'Sobre',
          },
          language: {
            selector: 'Seletor de idioma',
          },
          footer: {
            navigation: 'Navegação do rodapé',
            about: 'Sobre',
            contact: 'Contato',
            sanakaverse: 'Sanaka-loka',
            signature: 'Estudos entre códigos e presença.',
          },
        },
      },
      en: {
        posts: { loading: 'Loading publications...' },
        newsletter: { footerLink: 'Newsletter' },
        app: {
          title: 'Sanaka',
          navigation: {
            ariaLabel: 'Main navigation',
            home: 'Home',
            posts: 'Posts',
            matrix: 'Matrix',
            samvit: 'Saṃvit',
            about: 'About',
          },
          language: {
            selector: 'Language selector',
          },
          footer: {
            navigation: 'Footer navigation',
            about: 'About',
            contact: 'Contact',
            sanakaverse: 'Sanaka-loka',
            signature: 'Studies between code and presence.',
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

  it.each(['success', 'empty', 'error'])(
    'should dispose the Hysteria frame and restore the shell after Sanaka-loka %s',
    async (outcome) => {
      const pending = new Subject();
      TestBed.overrideProvider(SanakaverseBooksService, {
        useValue: { getBooks: () => pending },
      });
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await TestBed.inject(Router).navigateByUrl('/sanaka-loka');
      fixture.detectChanges();
      await fixture.whenStable();
      const host = fixture.nativeElement as HTMLElement;
      const frame = host.querySelector('iframe');

      expect(frame?.getAttribute('src')).toBe('/loadings/sabala/hysteria/index.html');
      expect(host.querySelector<HTMLElement>('.app-footer')?.style.visibility).toBe('hidden');

      if (outcome === 'error') pending.error(new Error('offline'));
      else {
        pending.next({
          books: outcome === 'empty' ? [] : [{ id: 1, slug: 'mors', title: 'Mors' }],
          page: 1,
          perPage: 12,
          total: outcome === 'empty' ? 0 : 1,
          totalPages: outcome === 'empty' ? 0 : 1,
        });
        pending.complete();
      }
      fixture.detectChanges();
      await fixture.whenStable();

      expect(host.querySelector('iframe')).toBeNull();
      expect(frame?.isConnected).toBe(false);
      expect(host.querySelector<HTMLElement>('.app-footer')?.style.visibility).toBe('');
      expect(host.querySelector('.app-footer')?.getAttribute('aria-hidden')).toBeNull();
    },
  );

  it('should dispose Hysteria and cancel the pending books request when leaving Sanaka-loka', async () => {
    const pending = new Subject();
    TestBed.overrideProvider(SanakaverseBooksService, {
      useValue: { getBooks: () => pending },
    });
    const router = TestBed.inject(Router);
    router.resetConfig([...routes, { path: 'ready', component: ReadyPage }]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await router.navigateByUrl('/sanaka-loka');
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const frame = host.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(pending.observed).toBe(true);

    await router.navigateByUrl('/ready');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(pending.observed).toBe(false);
    expect(host.querySelector('iframe')).toBeNull();
    expect(frame?.isConnected).toBe(false);
    expect(host.querySelector<HTMLElement>('.app-footer')?.style.visibility).toBe('');
  });

  it('should expose only the full-page loader until both posts and categories are ready', async () => {
    const posts = new Subject<PostsPage>();
    const categories = new Subject<readonly PostCategory[]>();
    TestBed.overrideProvider(WordPressPostsService, {
      useValue: { getPosts: () => posts, getArchiveCategories: () => categories },
    });
    TestBed.overrideProvider(NewsletterService, {
      useValue: { getAvailability: () => of({ available: false }) },
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/posts');
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('app-loading-indicator')).toHaveLength(1);
    expect(host.querySelector('.loading-indicator--full-page')?.getAttribute('data-variant')).toBe(
      'vasuki',
    );
    expect(host.querySelector('.app-header')?.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('main')?.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('.app-footer')?.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector<HTMLElement>('.app-header')?.inert).toBe(true);
    expect(host.querySelector<HTMLElement>('main')?.inert).toBe(true);
    expect(host.querySelector<HTMLElement>('.app-footer')?.style.visibility).toBe('hidden');
    expect(host.querySelector('.loading-label')?.textContent).toBe('Carregando publicações...');

    posts.next({ posts: [], page: 1, perPage: 20, total: 0, totalPages: 0 });
    posts.complete();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.querySelector('.loading-indicator--full-page')).not.toBeNull();

    categories.next([]);
    categories.complete();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.querySelector('app-loading-indicator')).toBeNull();
    expect(TestBed.inject(PageLoadingState).current()).toBeNull();
    expect(host.querySelector('.app-header')?.getAttribute('aria-hidden')).toBeNull();
    expect(host.querySelector<HTMLElement>('main')?.inert).toBe(false);
    expect(host.querySelector<HTMLElement>('.app-footer')?.style.visibility).toBe('');
  });

  it('should hide the shell before a lazy page can register its loading request', async () => {
    let finishLoading!: (page: typeof ReadyPage) => void;
    const page = new Promise<typeof ReadyPage>((resolve) => (finishLoading = resolve));
    const router = TestBed.inject(Router);
    router.resetConfig([
      { path: 'waiting', data: { initialLoading: true }, loadComponent: () => page },
    ]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const started = firstValueFrom(
      router.events.pipe(filter((event) => event instanceof NavigationStart)),
    );

    const navigation = router.navigateByUrl('/waiting');
    await started;
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const state = TestBed.inject(PageLoadingState);
    expect(state.current()).toBeNull();
    expect(state.active()).toBe(true);
    for (const element of host.querySelectorAll<HTMLElement>('.app-header, main, .app-footer')) {
      expect(element.style.visibility).toBe('hidden');
      expect(element.inert).toBe(true);
      expect(element.getAttribute('aria-hidden')).toBe('true');
    }

    // A cached or immediately ready page must also release the navigation hold.
    finishLoading(ReadyPage);
    await navigation;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(state.active()).toBe(false);
    expect(host.querySelector<HTMLElement>('.app-footer')?.style.visibility).toBe('');
    expect(host.querySelector<HTMLElement>('.app-footer')?.inert).toBe(false);
  });

  it('should restore the shell when navigation to a loading page is cancelled', async () => {
    const router = TestBed.inject(Router);
    router.resetConfig([
      {
        path: 'waiting',
        data: { initialLoading: true },
        component: ReadyPage,
        canActivate: [() => false],
      },
    ]);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(await router.navigateByUrl('/waiting')).toBe(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(TestBed.inject(PageLoadingState).active()).toBe(false);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.app-footer')?.inert,
    ).toBe(false);
  });

  it('should restore navigation when leaving a page whose data is still pending', async () => {
    TestBed.overrideProvider(WordPressPostsService, {
      useValue: { getPosts: () => new Subject<PostsPage>(), getArchiveCategories: () => of([]) },
    });
    TestBed.overrideProvider(NewsletterService, {
      useValue: { getAvailability: () => of({ available: false }) },
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/posts');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(TestBed.inject(PageLoadingState).current()?.variant).toBe('vasuki');

    await router.navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(TestBed.inject(PageLoadingState).current()).toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-loading-indicator'),
    ).toBeNull();
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
    expect(links.map((link) => link.getAttribute('href'))).toContain('/samvit');
    expect(links.map((link) => link.getAttribute('href'))).toContain('/sobre');
  });

  it('should send visitors from the former companion address to Samvit', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/maya');

    expect(router.url).toBe('/samvit');
  });

  it('should link the footer to About, Contact, Sanakaverse and the internal newsletter anchor', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const footer = compiled.querySelector<HTMLElement>('.app-footer');
    const footerNavigation = footer?.querySelector<HTMLElement>('nav');
    const futureDestination = footer?.querySelector<HTMLElement>('.app-footer__future');

    expect(footer).toBeTruthy();
    expect(footerNavigation?.getAttribute('aria-label')).toBe('Navegação do rodapé');
    const destinationLinks = Array.from(
      futureDestination?.querySelectorAll<HTMLAnchorElement>('a') ?? [],
    );

    expect(futureDestination?.textContent).toContain('Sobre');
    expect(futureDestination?.textContent).toContain('Contato');
    expect(futureDestination?.textContent).toContain('Sanaka-loka');
    expect(destinationLinks.map((link) => link.getAttribute('href'))).toEqual([
      '/sobre',
      '/contato',
      '/sanaka-loka',
      '/posts#newsletter',
    ]);
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
