import { Routes } from '@angular/router';

export const MATRIX_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    data: {
      titleKey: 'app.pageTitles.matrix',
      descriptionKey: 'app.pageDescriptions.matrix',
    },
    loadComponent: () => import('./catalog/matrix-catalog').then((m) => m.MatrixCatalog),
  },
  {
    path: 'components',
    data: {
      titleKey: 'app.pageTitles.matrixComponents',
      descriptionKey: 'app.pageDescriptions.matrixComponents',
    },
    loadComponent: () => import('./matrix').then((m) => m.Matrix),
  },
  {
    path: 'rest-api',
    data: {
      titleKey: 'app.pageTitles.matrixRestApi',
      descriptionKey: 'app.pageDescriptions.matrixRestApi',
    },
    loadComponent: () => import('./rest-api/rest-api-portal').then((m) => m.RestApiPortal),
  },
];
