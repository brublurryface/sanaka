import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { SanakaTitleStrategy } from './sanaka-title.strategy';

describe('SanakaTitleStrategy', () => {
  const languageChanges = new Subject<string>();
  const title = { setTitle: vi.fn() };
  const transloco = {
    langChanges$: languageChanges,
    translate: vi.fn((key: string) =>
      key === 'app.pageTitles.posts' ? 'Publicações do santuário' : key,
    ),
  };
  beforeEach(() => {
    title.setTitle.mockReset();
    transloco.translate.mockClear();

    TestBed.configureTestingModule({
      providers: [
        SanakaTitleStrategy,
        { provide: Title, useValue: title },
        { provide: TranslocoService, useValue: transloco },
      ],
    });
  });

  it('should translate the deepest route title and append the site name', () => {
    const strategy = TestBed.inject(SanakaTitleStrategy);

    strategy.updateTitle(routeSnapshot({ titleKey: 'app.pageTitles.posts' }));

    expect(title.setTitle).toHaveBeenCalledWith('Publicações do santuário | Sanaka');
  });

  it('should keep dynamic publication titles under component control', () => {
    const strategy = TestBed.inject(SanakaTitleStrategy);

    strategy.updateTitle(routeSnapshot({ dynamicTitle: true }));

    expect(title.setTitle).not.toHaveBeenCalled();
  });

  it('should refresh a static route title when the language changes', () => {
    const strategy = TestBed.inject(SanakaTitleStrategy);
    strategy.updateTitle(routeSnapshot({ titleKey: 'app.pageTitles.posts' }));
    title.setTitle.mockClear();

    languageChanges.next('en');

    expect(title.setTitle).toHaveBeenCalledWith('Publicações do santuário | Sanaka');
  });
});

function routeSnapshot(data: Record<string, unknown>): RouterStateSnapshot {
  return {
    root: {
      data: {},
      firstChild: { data, firstChild: null } as unknown as ActivatedRouteSnapshot,
    } as unknown as ActivatedRouteSnapshot,
  } as RouterStateSnapshot;
}
