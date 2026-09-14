import { MATRIX_ROUTES } from './matrix.routes';

describe('MATRIX_ROUTES', () => {
  it('should expose the catalog and components experiment as separate routes', () => {
    expect(MATRIX_ROUTES).toHaveLength(2);
    expect(MATRIX_ROUTES[0].path).toBe('');
    expect(MATRIX_ROUTES[0].pathMatch).toBe('full');
    expect(MATRIX_ROUTES[0].loadComponent).toBeTypeOf('function');
    expect(MATRIX_ROUTES[1].path).toBe('components');
    expect(MATRIX_ROUTES[1].loadComponent).toBeTypeOf('function');
  });

  it.each([0, 1])('should lazy load Matrix route %s', async (routeIndex) => {
    const loadComponent = MATRIX_ROUTES[routeIndex].loadComponent;

    expect(loadComponent).toBeDefined();

    const component = await loadComponent!();

    expect(component).toBeDefined();
  });
});
