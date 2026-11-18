import { RenderMode } from '@angular/ssr';

import { serverRoutes } from './app.routes.server';
import { createServerRoutes } from './server-route-config.server';

describe('article SSR experiment isolation', () => {
  it('keeps article requests client rendered in the production configuration', () => {
    expect(serverRoutes.find((route) => route.path === 'posts/:slug')).toBeUndefined();
    expect(serverRoutes.find((route) => route.path === 'posts/**')?.renderMode).toBe(
      RenderMode.Client,
    );
  });

  it('overrides only the article before the archive wildcard and retains production redirects', () => {
    const experiment = createServerRoutes(true);
    expect(experiment.filter((route) => route.path !== 'posts/:slug')).toEqual(serverRoutes);
    expect(experiment.find((route) => route.path === 'posts/:slug')?.renderMode).toBe(
      RenderMode.Server,
    );
    expect(experiment.findIndex((route) => route.path === 'posts/:slug')).toBeLessThan(
      experiment.findIndex((route) => route.path === 'posts/**'),
    );
    expect(experiment.find((route) => route.path === 'sanaka-loka')?.renderMode).toBe(
      RenderMode.Client,
    );
    expect(experiment.find((route) => route.path === 'sanakaverse')).toMatchObject({ status: 301 });
    expect(experiment.at(-1)).toMatchObject({ path: '**', status: 404 });
  });
});
