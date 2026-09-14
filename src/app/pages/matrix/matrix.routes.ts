import { Routes } from '@angular/router';

export const MATRIX_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./catalog/matrix-catalog').then((m) => m.MatrixCatalog),
  },
  {
    path: 'components',
    loadComponent: () => import('./matrix').then((m) => m.Matrix),
  },
];
