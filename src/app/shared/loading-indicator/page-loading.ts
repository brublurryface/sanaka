import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';

import { PageLoadingState } from '../../core/navigation/page-loading-state';
import { LoadingVariant } from './loading-artwork';

/** Registers the initial request without placing an illustration inside a small page section. */
@Component({
  selector: 'app-page-loading',
  template: '',
  styles: ':host { display: none; }',
  host: { '[attr.data-variant]': 'variant()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLoading {
  readonly variant = input.required<LoadingVariant>();
  readonly labelKey = input.required<string>();

  private readonly pageLoading = inject(PageLoadingState);

  constructor() {
    effect((onCleanup) => {
      onCleanup(this.pageLoading.begin({ variant: this.variant(), labelKey: this.labelKey() }));
    });
  }
}
