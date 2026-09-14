import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'posts',
    renderMode: RenderMode.Client,
  },
  {
    path: 'posts/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'matrix',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'matrix/components',
    renderMode: RenderMode.Prerender,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
