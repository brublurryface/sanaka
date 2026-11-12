import { isPlatformBrowser, Location } from '@angular/common';
import {
  afterNextRender,
  computed,
  inject,
  Injectable,
  Injector,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  PRIMARY_OUTLET,
  Router,
} from '@angular/router';

import { LoadingVariant } from '../../shared/loading-indicator/loading-artwork';

export interface PageLoadingRequest {
  readonly variant: LoadingVariant;
  readonly labelKey: string;
}

/** Keeps the application busy only while a routed page is waiting for its initial data. */
@Injectable({ providedIn: 'root' })
export class PageLoadingState {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly navigationPending = signal(
    this.isBrowser &&
      !this.router.navigated &&
      this.requiresInitialLoading(inject(Location).path()),
  );
  private navigationId = 0;
  private readonly requests = new Map<symbol, PageLoadingRequest>();
  private readonly currentRequest = signal<PageLoadingRequest | null>(null);
  readonly current = this.currentRequest.asReadonly();
  readonly active = computed(() => this.navigationPending() || this.current() !== null);

  constructor() {
    if (!this.isBrowser) return;

    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.navigationId = event.id;
        this.navigationPending.set(this.requiresInitialLoading(event.url));
      } else if (event instanceof NavigationEnd) {
        // Keep the shell hidden until the routed view has registered its data request.
        afterNextRender(
          () => {
            if (this.navigationId === event.id) this.navigationPending.set(false);
          },
          { injector: this.injector },
        );
      } else if (
        event instanceof NavigationCancel ||
        event instanceof NavigationError ||
        event instanceof NavigationSkipped
      ) {
        if (this.navigationId === event.id) this.navigationPending.set(false);
      }
    });
  }

  private requiresInitialLoading(url: string): boolean {
    const firstSegment = this.router.parseUrl(url).root.children[PRIMARY_OUTLET]?.segments[0]?.path;
    return this.router.config.some(
      (route) => route.path === firstSegment && route.data?.['initialLoading'] === true,
    );
  }

  begin(request: PageLoadingRequest): () => void {
    const owner = Symbol();
    this.requests.set(owner, request);
    this.currentRequest.set(request);

    return () => {
      this.requests.delete(owner);
      this.currentRequest.set([...this.requests.values()].at(-1) ?? null);
    };
  }
}
