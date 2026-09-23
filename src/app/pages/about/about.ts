import { Component, computed, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

type AboutCycleId = 'origin' | 'creation' | 'code' | 'sanaka';

interface AboutCycle {
  readonly id: AboutCycleId;
}

const ABOUT_CYCLES: readonly AboutCycle[] = [
  { id: 'origin' },
  { id: 'creation' },
  { id: 'code' },
  { id: 'sanaka' },
];

@Component({
  selector: 'app-about',
  imports: [TranslocoPipe],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About {
  protected readonly cycles = ABOUT_CYCLES;
  protected readonly selectedCycleId = signal<AboutCycleId>('origin');
  protected readonly selectedCycle = computed(() => {
    return this.cycles.find((cycle) => cycle.id === this.selectedCycleId()) ?? this.cycles[0];
  });

  protected selectCycle(cycleId: AboutCycleId): void {
    this.selectedCycleId.set(cycleId);
  }
}
