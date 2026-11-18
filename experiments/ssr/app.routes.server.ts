import { createServerRoutes } from '../../src/app/server-route-config.server';

// Only this fixture-backed experiment enables article SSR.
export const serverRoutes = createServerRoutes(true);
