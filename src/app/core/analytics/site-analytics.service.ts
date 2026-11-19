import { HttpClient } from '@angular/common/http';
import { DOCUMENT, DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, fromEvent } from 'rxjs';

import { ANALYTICS_CONFIG_PATH, parseGa4MeasurementId } from '../../../shared/analytics';
import { SANAKA_ORIGIN, SanakaSeoService } from '../navigation/sanaka-seo.service';
import { analyticsView, referrerOrigin, type AnalyticsView } from './analytics-view';
import { GoogleAnalyticsTag } from './google-analytics-tag';

export type AnalyticsPreference = 'granted' | 'denied';

@Injectable({ providedIn: 'root' })
export class SiteAnalytics {
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly seo = inject(SanakaSeoService);
  private readonly availableState = signal(false);
  private readonly choice = signal<AnalyticsPreference | null>(null);
  private readonly view = signal<AnalyticsView | null>(null);
  private started = false;
  private previousLocation = '';
  private lastView = '';
  private tag?: GoogleAnalyticsTag;
  private storageKey?: string;

  readonly available = this.availableState.asReadonly();
  readonly preference = this.choice.asReadonly();

  constructor() {
    effect(() => {
      const view = this.view();
      if (!this.available() || this.choice() !== 'granted' || !this.tag) return;

      if (!view || (view.article && this.seo.publicArticleLocation() !== view.location)) {
        this.lastView = '';
        this.tag.pause();
        return;
      }

      const referrer = this.previousLocation || referrerOrigin(this.document.referrer);
      this.tag.enable(view.location, referrer);
      if (!this.tag.ready() || this.lastView === view.location) return;

      this.tag.pageView(view.location, referrer);
      this.previousLocation = view.location;
      this.lastView = view.location;
    });
  }

  initialize(): void {
    const browser = this.document.defaultView;
    if (this.started || browser?.location.origin !== SANAKA_ORIGIN) return;
    this.started = true;

    this.http
      .get<unknown>(ANALYTICS_CONFIG_PATH, { transferCache: false })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          const id =
            config && typeof config === 'object' && 'measurementId' in config
              ? parseGa4MeasurementId(config.measurementId)
              : null;
          if (!id) return;
          this.tag = new GoogleAnalyticsTag(browser, id);
          this.storageKey = `sanaka.analytics.v1.${id}`;
          this.applyPreference(this.readPreference());
          if (this.router.lastSuccessfulNavigation()) this.updateView();
          this.availableState.set(true);

          this.router.events
            .pipe(
              filter((event) => event instanceof NavigationEnd),
              takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => this.updateView());
          fromEvent<StorageEvent>(browser, 'storage')
            .pipe(
              filter((event) => event.key === null || event.key === this.storageKey),
              takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => this.applyPreference(this.readPreference()));
        },
        error: () => {
          /* A failed config read leaves measurement unavailable. */
        },
      });
  }

  choose(preference: AnalyticsPreference): void {
    if (!this.storageKey) return;
    try {
      this.document.defaultView?.localStorage.setItem(this.storageKey, preference);
    } catch {
      // Honor the decision during this visit if browser storage is unavailable.
    }
    this.applyPreference(preference);
  }

  private updateView(): void {
    this.view.set(analyticsView(this.router.routerState.snapshot.root));
  }

  private readPreference(): AnalyticsPreference | null {
    if (!this.storageKey) return null;
    try {
      const preference = this.document.defaultView?.localStorage.getItem(this.storageKey);
      return preference === 'granted' || preference === 'denied' ? preference : null;
    } catch {
      return null;
    }
  }

  private applyPreference(preference: AnalyticsPreference | null): void {
    this.choice.set(preference);
    if (preference === 'granted') return;
    this.tag?.withdraw();
    this.lastView = '';
    this.previousLocation = '';
  }
}
