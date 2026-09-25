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
