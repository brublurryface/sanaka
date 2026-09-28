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
    data: { titleKey: 'app.pageTitles.maya' },
    loadComponent: () => import('./pages/maya/maya').then((m) => m.Maya),
  },
  {
    path: 'sobre',
    data: { titleKey: 'app.pageTitles.about' },
    loadComponent: () => import('./pages/about/about').then((m) => m.About),
  },
];
