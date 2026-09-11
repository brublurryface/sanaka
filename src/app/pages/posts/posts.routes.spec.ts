import { POSTS_ROUTES } from './posts.routes';

describe('POSTS_ROUTES', () => {
  const children = POSTS_ROUTES[0].children ?? [];

  it('should expose clean routes for both reading modes', () => {
    expect(children.map((route) => route.path)).toEqual(['', 'paged', 'paged/:page']);
  });

  it('should map each route to its reading mode', () => {
    expect(children[0].data?.['view']).toBe('continuous');
    expect(children[1].data?.['view']).toBe('paged');
    expect(children[2].data?.['view']).toBe('paged');
  });
});
