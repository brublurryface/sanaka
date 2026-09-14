import { Routes } from '@angular/router';

import { Home } from './pages/home/home';

export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'posts',
    loadChildren: () => import('./pages/posts/posts.routes').then((m) => m.POSTS_ROUTES),
  },
  {
    path: 'matrix',
    loadChildren: () => import('./pages/matrix/matrix.routes').then((m) => m.MATRIX_ROUTES),
  },
  {
    path: 'maya',
    loadComponent: () => import('./pages/maya/maya').then((m) => m.Maya),
  },
];
