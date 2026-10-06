import { Routes } from '@angular/router';

import { Home } from './pages/home/home';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    data: {
      titleKey: 'app.title',
      descriptionKey: 'app.pageDescriptions.home',
    },
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
    data: {
      titleKey: 'app.pageTitles.maya',
      descriptionKey: 'app.pageDescriptions.maya',
    },
    loadComponent: () => import('./pages/maya/maya').then((m) => m.Maya),
  },
  {
    path: 'sobre',
    data: {
      titleKey: 'app.pageTitles.about',
      descriptionKey: 'app.pageDescriptions.about',
    },
    loadComponent: () => import('./pages/about/about').then((m) => m.About),
  },
  {
    path: 'sanakaverse',
    data: {
      titleKey: 'app.pageTitles.sanakaverse',
      descriptionKey: 'app.pageDescriptions.sanakaverse',
    },
    loadComponent: () => import('./pages/sanakaverse/sanakaverse').then((m) => m.Sanakaverse),
  },
];
