import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  testMatch: '**/*.spec.ts',
  timeout: 30000,
  fullyParallel: false, // 禁用并行执行
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // 单worker执行
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // 禁用自动启动webServer
  webServer: undefined,
});
