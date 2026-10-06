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
    path: 'sobre',
    renderMode: RenderMode.Client,
  },
  {
    path: 'sanakaverse',
    renderMode: RenderMode.Client,
  },
  {
    path: 'maya',
    renderMode: RenderMode.Prerender,
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
    path: 'matrix/rest-api',
    renderMode: RenderMode.Prerender,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
