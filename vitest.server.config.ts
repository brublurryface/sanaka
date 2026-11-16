import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/server/**/*.spec.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/server/newsletter.ts',
        'src/server/contact.ts',
        'src/server/contact-router.ts',
        'src/server/request-rate-limit.ts',
        'src/server/cache-policy.ts',
        'src/server/security-headers.ts',
        'src/server/csp-reports.ts',
        'src/server/runtime-options.ts',
        'src/server/http-request-log.ts',
        'src/server/legacy-wordpress-redirects.ts',
      ],
      reportsDirectory: 'coverage/server',
      reporter: ['text-summary', 'json-summary'],
      thresholds: { statements: 85, branches: 85, functions: 85, lines: 85 },
    },
  },
});
