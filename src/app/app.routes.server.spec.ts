import { RenderMode } from '@angular/ssr';

import { serverRoutes } from './app.routes.server';

describe('serverRoutes', () => {
  it.each(['posts', 'posts/**', 'sobre', 'sanaka-loka'])(
    'should keep WordPress-backed route %s on the client until server data is cached',
    (path) => {
      expect(serverRoutes.find((route) => route.path === path)?.renderMode).toBe(RenderMode.Client);
    },
  );

  it.each([
    '',
    'samvit',
    'matrix',
    'matrix/components',
    'matrix/rest-api',
    'matrix/obolos',
    'matrix/entregas',
    'matrix/jogo',
    'matrix/padaria',
  ])('should prerender static route %s', (path) => {
    expect(serverRoutes.find((route) => route.path === path)?.renderMode).toBe(
      RenderMode.Prerender,
    );
  });

  it('should render unknown routes on the server with a real 404 response', () => {
    const wildcardRoute = serverRoutes.find((route) => route.path === '**');

    expect(wildcardRoute).toMatchObject({ renderMode: RenderMode.Server, status: 404 });
  });

  it.each(['maya', 'sanakaverse'])('should permanently redirect former route %s', (path) => {
    expect(serverRoutes.find((route) => route.path === path)).toMatchObject({
      renderMode: RenderMode.Server,
      status: 301,
    });
  });
});
