import { MATRIX_ROUTES } from './matrix.routes';

describe('MATRIX_ROUTES', () => {
  it('should expose the catalog, components, and REST API experiments as separate routes', () => {
    expect(MATRIX_ROUTES).toHaveLength(7);
    expect(MATRIX_ROUTES[0].path).toBe('');
    expect(MATRIX_ROUTES[0].pathMatch).toBe('full');
    expect(MATRIX_ROUTES[0].loadComponent).toBeTypeOf('function');
    expect(MATRIX_ROUTES[1].path).toBe('components');
    expect(MATRIX_ROUTES[1].loadComponent).toBeTypeOf('function');
    expect(MATRIX_ROUTES[2].path).toBe('rest-api');
    expect(MATRIX_ROUTES[2].loadComponent).toBeTypeOf('function');
    expect(MATRIX_ROUTES[3].path).toBe('obolos');
    expect(MATRIX_ROUTES[4].path).toBe('entregas');
    expect(MATRIX_ROUTES[5].path).toBe('jogo');
    expect(MATRIX_ROUTES[6].path).toBe('padaria');
  });

  it.each([0, 1, 2, 3, 4, 5, 6])('should lazy load Matrix route %s', async (routeIndex) => {
    const loadComponent = MATRIX_ROUTES[routeIndex].loadComponent;

    expect(loadComponent).toBeDefined();

    const component = await loadComponent!();

    expect(component).toBeDefined();
  });
});
