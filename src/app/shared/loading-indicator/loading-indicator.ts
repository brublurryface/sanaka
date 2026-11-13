import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { LOADING_ARTWORK, LoadingVariant } from './loading-artwork';

@Component({
  selector: 'app-loading-indicator',
  templateUrl: './loading-indicator.html',
  styleUrl: './loading-indicator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
    '[attr.data-variant]': 'variant()',
    '[class.loading-indicator--compact]': 'compact()',
    '[class.loading-indicator--full-page]': 'fullPage()',
  },
})
export class LoadingIndicator {
  readonly variant = input.required<LoadingVariant>();
  readonly label = input.required<string>();
  readonly compact = input(false);
  readonly fullPage = input(false);

  private readonly failedVariant = signal<LoadingVariant | null>(null);
  private readonly readyVariant = signal<LoadingVariant | null>(null);
  protected readonly artworkReady = computed(() => this.readyVariant() === this.variant());
  protected readonly artwork = computed(() =>
    this.failedVariant() === this.variant() ? null : LOADING_ARTWORK[this.variant()],
  );

  protected hideFailedArtwork(): void {
    this.failedVariant.set(this.variant());
  }

  protected startDecoration(): void {
    this.readyVariant.set(this.variant());
  }
}
