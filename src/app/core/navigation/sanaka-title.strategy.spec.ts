import { PendingTasks } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { SanakaSeoService } from './sanaka-seo.service';
import { SanakaTitleStrategy } from './sanaka-title.strategy';

describe('SanakaTitleStrategy', () => {
  const descriptions = new BehaviorSubject('Escrituras reunidas em Sanaka.');
  const titles = new BehaviorSubject('Publicações do santuário');
  let activeLanguage = 'pt-BR';

  const seo = { applyPage: vi.fn() };
  const releasePendingTranslation = vi.fn();
  const pendingTasks = { add: vi.fn(() => releasePendingTranslation) };
  const transloco = {
    getActiveLang: vi.fn(() => activeLanguage),
    selectTranslate: vi.fn((key: string) =>
      key === 'app.pageTitles.posts' ? titles : descriptions,
    ),
  };

  beforeEach(() => {
    activeLanguage = 'pt-BR';
    descriptions.next('Escrituras reunidas em Sanaka.');
    titles.next('Publicações do santuário');
    seo.applyPage.mockReset();
    pendingTasks.add.mockClear();
    releasePendingTranslation.mockClear();
    transloco.getActiveLang.mockClear();
    transloco.selectTranslate.mockClear();

    TestBed.configureTestingModule({
      providers: [
        SanakaTitleStrategy,
        { provide: PendingTasks, useValue: pendingTasks },
        { provide: SanakaSeoService, useValue: seo },
        { provide: TranslocoService, useValue: transloco },
      ],
    });
  });

  it('should translate the deepest route title and append the site name', () => {
    const strategy = TestBed.inject(SanakaTitleStrategy);

    strategy.updateTitle(
      routeSnapshot(
        {
          titleKey: 'app.pageTitles.posts',
          descriptionKey: 'app.pageDescriptions.posts',
        },
        '/posts',
      ),
    );

    expect(seo.applyPage).toHaveBeenLastCalledWith({
      pageTitle: 'Publicações do santuário',
      description: 'Escrituras reunidas em Sanaka.',
      path: '/posts',
      language: 'pt-BR',
    });
    expect(pendingTasks.add).toHaveBeenCalledOnce();
    expect(releasePendingTranslation).toHaveBeenCalledOnce();
  });

  it('should cancel static metadata while a dynamic publication controls the page', () => {
    const strategy = TestBed.inject(SanakaTitleStrategy);
    strategy.updateTitle(
      routeSnapshot({
        titleKey: 'app.pageTitles.posts',
        descriptionKey: 'app.pageDescriptions.posts',
      }),
    );
    seo.applyPage.mockClear();

    strategy.updateTitle(routeSnapshot({ dynamicTitle: true }));
    titles.next('Sanctuary publications');

    expect(seo.applyPage).not.toHaveBeenCalled();
    expect(releasePendingTranslation).toHaveBeenCalledOnce();
  });

  it('should refresh metadata when translated values change', () => {
    const strategy = TestBed.inject(SanakaTitleStrategy);
    strategy.updateTitle(
      routeSnapshot({
        titleKey: 'app.pageTitles.posts',
        descriptionKey: 'app.pageDescriptions.posts',
      }),
    );
    seo.applyPage.mockClear();

    activeLanguage = 'en';
    titles.next('Sanctuary publications');
    descriptions.next('Writings gathered in Sanaka.');

    expect(seo.applyPage).toHaveBeenLastCalledWith({
      pageTitle: 'Sanctuary publications',
      description: 'Writings gathered in Sanaka.',
      path: '/',
      language: 'en',
    });
  });

  it('should ignore routes without complete metadata keys', () => {
    const strategy = TestBed.inject(SanakaTitleStrategy);

    strategy.updateTitle(routeSnapshot({ titleKey: 'app.pageTitles.posts' }));

    expect(seo.applyPage).not.toHaveBeenCalled();
  });
});

function routeSnapshot(data: Record<string, unknown>, url = '/'): RouterStateSnapshot {
  return {
    url,
    root: {
      data: {},
      firstChild: { data, firstChild: null } as unknown as ActivatedRouteSnapshot,
    } as unknown as ActivatedRouteSnapshot,
  } as RouterStateSnapshot;
}
