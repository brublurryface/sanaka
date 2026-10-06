import { RenderMode } from '@angular/ssr';

import { serverRoutes } from './app.routes.server';

describe('serverRoutes', () => {
  it.each(['posts', 'posts/**', 'sobre', 'sanakaverse'])(
    'should keep WordPress-backed route %s on the client until server data is cached',
    (path) => {
      expect(serverRoutes.find((route) => route.path === path)?.renderMode).toBe(RenderMode.Client);
    },
  );

  it.each(['maya', 'matrix', 'matrix/components', 'matrix/rest-api'])(
    'should prerender static route %s',
    (path) => {
      expect(serverRoutes.find((route) => route.path === path)?.renderMode).toBe(
        RenderMode.Prerender,
      );
    },
  );
});
