import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
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
    path: 'contato',
    renderMode: RenderMode.Prerender,
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
    renderMode: RenderMode.Server,
    status: 404,
  },
];
