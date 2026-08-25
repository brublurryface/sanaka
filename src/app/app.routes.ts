import { Routes } from '@angular/router';
import { Home } from './pages/home/home';

export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'posts',
    loadComponent: () => import('./pages/posts/posts').then((m) => m.Posts),
  },
  {
    path: 'maya',
    loadComponent: () => import('./pages/maya/maya').then((m) => m.Maya),
  },
];
