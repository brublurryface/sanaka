import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4300';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env['CI'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  maxFailures: process.env['CI'] ? 5 : 0,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'pt-BR',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'node dist/sanaka/server/server.mjs',
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      PORT: '4300',
      NG_ALLOWED_HOSTS: '127.0.0.1,localhost',
      TRUST_PROXY_HOPS: '0',
      SITE_NOINDEX: 'true',
    },
  },
});
