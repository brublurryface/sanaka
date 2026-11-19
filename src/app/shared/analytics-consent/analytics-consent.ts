import { afterNextRender, Component, inject, Injector, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import {
  SiteAnalytics,
  type AnalyticsPreference,
} from '../../core/analytics/site-analytics.service';

@Component({
  selector: 'app-analytics-consent',
  imports: [TranslocoPipe],
  templateUrl: './analytics-consent.html',
  styleUrl: './analytics-consent.scss',
})
export class AnalyticsConsent {
  protected readonly analytics = inject(SiteAnalytics);
  protected readonly reviewing = signal(false);
  private readonly injector = inject(Injector);

  constructor() {
    afterNextRender(() => this.analytics.initialize());
  }

  togglePreferences(trigger: HTMLButtonElement, title: HTMLHeadingElement): void {
    if (this.reviewing()) {
      this.closePreferences(trigger);
      return;
    }

    this.reviewing.set(true);
    afterNextRender(
      { write: () => title.focus({ preventScroll: true }) },
      { injector: this.injector },
    );
  }

  choose(preference: AnalyticsPreference, trigger: HTMLButtonElement): void {
    this.analytics.choose(preference);
    this.closePreferences(trigger);
  }

  closePreferences(trigger: HTMLButtonElement): void {
    if (!this.reviewing()) return;
    this.reviewing.set(false);
    trigger.focus({ preventScroll: true });
  }
}
