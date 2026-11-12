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
    data: { initialLoading: true },
    loadChildren: () => import('./pages/posts/posts.routes').then((m) => m.POSTS_ROUTES),
  },
  {
    path: 'matrix',
    loadChildren: () => import('./pages/matrix/matrix.routes').then((m) => m.MATRIX_ROUTES),
  },
  {
    path: 'samvit',
    data: {
      titleKey: 'app.pageTitles.samvit',
      descriptionKey: 'app.pageDescriptions.samvit',
    },
    loadComponent: () => import('./pages/samvit/samvit').then((m) => m.Samvit),
  },
  {
    path: 'maya',
    pathMatch: 'full',
    redirectTo: 'samvit',
  },
  {
    path: 'sobre',
    data: {
      titleKey: 'app.pageTitles.about',
      initialLoading: true,
      descriptionKey: 'app.pageDescriptions.about',
    },
    loadComponent: () => import('./pages/about/about').then((m) => m.About),
  },
  {
    path: 'contato',
    data: {
      titleKey: 'app.pageTitles.contact',
      descriptionKey: 'app.pageDescriptions.contact',
    },
    loadComponent: () => import('./pages/contact/contact').then((m) => m.Contact),
  },
  {
    path: 'sanaka-loka',
    data: {
      titleKey: 'app.pageTitles.sanakaverse',
      initialLoading: true,
      descriptionKey: 'app.pageDescriptions.sanakaverse',
    },
    loadComponent: () => import('./pages/sanakaverse/sanakaverse').then((m) => m.Sanakaverse),
  },
  {
    path: 'sanakaverse',
    pathMatch: 'full',
    redirectTo: 'sanaka-loka',
  },
  {
    path: '**',
    data: {
      titleKey: 'app.pageTitles.notFound',
      descriptionKey: 'app.pageDescriptions.notFound',
      indexable: false,
    },
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
