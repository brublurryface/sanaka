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
        data: { view: 'continuous', titleKey: 'app.pageTitles.posts' },
        loadComponent: () => import('./posts').then((m) => m.Posts),
      },
      {
        path: 'paged',
        pathMatch: 'full',
        data: { view: 'paged', titleKey: 'app.pageTitles.posts' },
        loadComponent: () => import('./posts').then((m) => m.Posts),
      },
      {
        path: 'paged/:page',
        data: { view: 'paged', titleKey: 'app.pageTitles.posts' },
        loadComponent: () => import('./posts').then((m) => m.Posts),
      },
      {
        path: ':slug',
        data: { dynamicTitle: true },
        loadComponent: () => import('./post-detail/post-detail').then((m) => m.PostDetailPage),
      },
    ],
  },
];
