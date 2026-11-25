import { defineConfig } from '@playwright/test';

/**
 * E2E contra el backend real (sin page.route).
 * El backend debe estar corriendo en http://localhost:8000; este archivo solo
 * levanta el frontend. En el CI lo prepara el job "End-to-End Tests".
 */
export default defineConfig({
  testDir: './e2e/real',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report-real' }]]
    : [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium' }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
});
