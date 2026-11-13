import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { afterRenderEffect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationSkipped, NavigationStart, Router, Scroll } from '@angular/router';

import { PageLoadingState } from './page-loading-state';

/** Applies route fragments after the page can actually be scrolled and focused. */
@Injectable({ providedIn: 'root' })
export class PageAnchorNavigation {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly pageLoading = inject(PageLoadingState);
  private readonly pendingAnchor = signal<string | null>(null);
  private navigationId = 0;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart || event instanceof NavigationSkipped) {
        this.navigationId = event.id;
        this.pendingAnchor.set(null);
      } else if (event instanceof Scroll && event.routerEvent.id >= this.navigationId) {
        this.navigationId = event.routerEvent.id;
        this.pendingAnchor.set(
          !event.position && event.scrollBehavior !== 'manual' ? event.anchor : null,
        );
      }
    });

    afterRenderEffect({
      write: () => {
        const anchor = this.pendingAnchor();
        if (!anchor || this.pageLoading.active()) return;

        const target = this.document.getElementById(anchor);
        this.pendingAnchor.set(null);
        if (!target) return;

        // Native scrolling respects the target's scroll-margin below the sticky header.
        target.scrollIntoView({ block: 'start', behavior: 'auto' });
        target.focus({ preventScroll: true });
      },
    });
  }
}
