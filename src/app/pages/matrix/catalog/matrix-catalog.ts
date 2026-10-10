import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { MATRIX_EXPERIMENTS } from '../matrix-experiments';

@Component({
  selector: 'app-matrix-catalog',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './matrix-catalog.html',
  styleUrl: './matrix-catalog.scss',
})
export class MatrixCatalog {
  // filter() cria listas derivadas do mesmo catálogo. Não mantém configurações duplicadas.
  readonly availableExperiments = MATRIX_EXPERIMENTS.filter((item) => item.status === 'available');
  readonly upcomingExperiments = MATRIX_EXPERIMENTS.filter((item) => item.status === 'planned');
}
