import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/application-smoke.spec.ts',
  timeout: 60000,
  expect: {
    timeout: 15000, // 增加expect超时到15秒
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalTeardown: './tests/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:3111',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15000, // 增加操作超时
    navigationTimeout: 30000, // 增加导航超时
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'node scripts/test-server.js',
    url: 'http://localhost:3111/login',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
