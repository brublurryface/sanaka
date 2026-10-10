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
  {
    path: 'obolos',
    data: {
      titleKey: 'matrix.studies.obolos.title',
      descriptionKey: 'matrix.studies.obolos.description',
    },
    loadComponent: () => import('./studies/obolos/obolos-lab').then((m) => m.ObolosLab),
  },
  {
    path: 'entregas',
    data: {
      titleKey: 'matrix.studies.entregas.title',
      descriptionKey: 'matrix.studies.entregas.description',
    },
    loadComponent: () => import('./studies/entregas/entregas-lab').then((m) => m.EntregasLab),
  },
  {
    path: 'jogo',
    data: {
      titleKey: 'matrix.studies.jogo.title',
      descriptionKey: 'matrix.studies.jogo.description',
    },
    loadComponent: () => import('./studies/jogo/jogo-lab').then((m) => m.JogoLab),
  },
  {
    path: 'padaria',
    data: {
      titleKey: 'matrix.studies.padaria.title',
      descriptionKey: 'matrix.studies.padaria.description',
    },
    loadComponent: () => import('./studies/padaria/padaria-lab').then((m) => m.PadariaLab),
  },
];
