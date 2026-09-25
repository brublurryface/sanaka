import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { finalize } from 'rxjs';

import { AboutCyclePost, AboutCyclesService } from './data-access/about-cycles.service';

@Component({
  selector: 'app-about',
  imports: [TranslocoPipe],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About implements OnInit {
  private readonly cyclesService = inject(AboutCyclesService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly puzzlePiecePaths = [
    'M 0 0 H 40 C 40 -12 60 -12 60 0 H 100 V 40 C 112 40 112 60 100 60 V 100 H 60 C 60 88 40 88 40 100 H 0 V 60 C 12 60 12 40 0 40 V 0 Z',
    'M 100 0 H 140 C 140 12 160 12 160 0 H 200 V 40 C 188 40 188 60 200 60 V 100 H 160 C 160 112 140 112 140 100 H 100 V 60 C 112 60 112 40 100 40 V 0 Z',
    'M 200 0 H 240 C 240 -12 260 -12 260 0 H 300 V 40 C 312 40 312 60 300 60 V 100 H 260 C 260 88 240 88 240 100 H 200 V 60 C 188 60 188 40 200 40 V 0 Z',
    'M 0 100 H 40 C 40 88 60 88 60 100 H 100 V 140 C 88 140 88 160 100 160 V 200 H 60 C 60 188 40 188 40 200 H 0 V 160 C -12 160 -12 140 0 140 V 100 Z',
    'M 100 100 H 140 C 140 112 160 112 160 100 H 200 V 140 C 212 140 212 160 200 160 V 200 H 160 C 160 212 140 212 140 200 H 100 V 160 C 88 160 88 140 100 140 V 100 Z',
    'M 200 100 H 240 C 240 88 260 88 260 100 H 300 V 140 C 288 140 288 160 300 160 V 200 H 260 C 260 188 240 188 240 200 H 200 V 160 C 212 160 212 140 200 140 V 100 Z',
  ] as const;

  protected readonly cycles = signal<readonly AboutCyclePost[]>([]);
  protected readonly selectedCycleId = signal<number | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);

  protected readonly selectedCycle = computed(() => {
    const cycles = this.cycles();
    return cycles.find((cycle) => cycle.id === this.selectedCycleId()) ?? cycles[0];
  });

  ngOnInit(): void {
    this.loadCycles();
  }

  protected selectCycle(cycleId: number): void {
    this.selectedCycleId.set(cycleId);
  }

  protected retry(): void {
    this.loadCycles();
  }

  private loadCycles(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.cyclesService
      .getCycles()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (cycles) => {
          this.cycles.set(cycles);
          this.selectedCycleId.set(cycles[0]?.id ?? null);
          this.hasError.set(cycles.length === 0);
        },
        error: () => {
          this.cycles.set([]);
          this.selectedCycleId.set(null);
          this.hasError.set(true);
        },
      });
  }
}
