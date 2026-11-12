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
  },
})
export class LoadingIndicator {
  readonly variant = input.required<LoadingVariant>();
  readonly label = input.required<string>();
  readonly compact = input(false);

  private readonly failedVariant = signal<LoadingVariant | null>(null);
  private readonly readyVariant = signal<LoadingVariant | null>(null);
  protected readonly artworkReady = computed(() => this.readyVariant() === this.variant());
  protected readonly artwork = computed(() =>
    this.failedVariant() === this.variant() ? null : LOADING_ARTWORK[this.variant()],
  );
  protected readonly letters = Array.from('LOADING...');
  protected readonly notes = [
    { symbol: '♪', color: '#ff6c68', x: 8, y: 29, delay: -0.2 },
    { symbol: '♫', color: '#ffab5e', x: 19, y: 59, delay: -0.9 },
    { symbol: '♪', color: '#f5d968', x: 29, y: 15, delay: -1.6 },
    { symbol: '♫', color: '#8bd87d', x: 43, y: 6, delay: -0.5 },
    { symbol: '♪', color: '#64d9c4', x: 61, y: 12, delay: -1.3 },
    { symbol: '♫', color: '#8ddcff', x: 73, y: 31, delay: -2.1 },
    { symbol: '♪', color: '#7f9dff', x: 87, y: 18, delay: -0.7 },
    { symbol: '♫', color: '#bd93f5', x: 82, y: 61, delay: -1.8 },
    { symbol: '♪', color: '#f38fc6', x: 9, y: 74, delay: -2.4 },
  ];

  protected hideFailedArtwork(): void {
    this.failedVariant.set(this.variant());
  }

  protected startDecoration(): void {
    this.readyVariant.set(this.variant());
  }
}
