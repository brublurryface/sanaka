import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/server/**/*.spec.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/server/analytics-config.ts',
        'src/shared/analytics.ts',
        'src/server/newsletter.ts',
        'src/server/contact.ts',
        'src/server/contact-router.ts',
        'src/server/request-rate-limit.ts',
        'src/server/cache-policy.ts',
        'src/server/security-headers.ts',
        'src/server/csp-reports.ts',
        'src/server/runtime-options.ts',
        'src/server/graceful-shutdown.ts',
        'src/server/http-request-log.ts',
        'src/server/request-log-context.ts',
        'src/server/legacy-wordpress-redirects.ts',
        'src/server/request-target.ts',
        'src/server/robots.ts',
      ],
      reportsDirectory: 'coverage/server',
      reporter: ['text-summary', 'json-summary'],
    },
  },
});
