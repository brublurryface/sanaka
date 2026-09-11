import { Routes } from '@angular/router';

import { PostsStore } from './posts.store';

export const POSTS_ROUTES: Routes = [
  {
    path: '',
    providers: [PostsStore],
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { view: 'continuous' },
        loadComponent: () => import('./posts').then((m) => m.Posts),
      },
      {
        path: 'paged',
        pathMatch: 'full',
        data: { view: 'paged' },
        loadComponent: () => import('./posts').then((m) => m.Posts),
      },
      {
        path: 'paged/:page',
        data: { view: 'paged' },
        loadComponent: () => import('./posts').then((m) => m.Posts),
      },
    ],
  },
];
