import { afterNextRender, Component, inject } from '@angular/core';
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

  constructor() {
    afterNextRender(() => this.analytics.initialize());
  }

  choose(preference: AnalyticsPreference, panel: HTMLDetailsElement, summary: HTMLElement): void {
    this.analytics.choose(preference);
    panel.open = false;
    summary.focus();
  }
}
