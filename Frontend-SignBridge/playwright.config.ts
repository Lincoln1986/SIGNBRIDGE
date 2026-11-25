import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Los E2E contra el backend real tienen su propia configuración
  // (playwright.real.config.ts): aquí solo corren los simulados.
  testIgnore: '**/real/**',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
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
