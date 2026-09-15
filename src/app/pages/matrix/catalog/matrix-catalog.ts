import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

interface UpcomingExperiment {
  readonly number: string;
  readonly translationKey: string;
}

@Component({
  selector: 'app-matrix-catalog',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './matrix-catalog.html',
  styleUrl: './matrix-catalog.scss',
})
export class MatrixCatalog {
  readonly upcomingExperiments: readonly UpcomingExperiment[] = [
    { number: '03', translationKey: 'matrix.catalog.upcoming.signals' },
    { number: '04', translationKey: 'matrix.catalog.upcoming.observables' },
    { number: '05', translationKey: 'matrix.catalog.upcoming.lifecycle' },
  ];
}
