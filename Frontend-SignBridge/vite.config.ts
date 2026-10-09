import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // solo unitarios de src: e2e/ lo corre Playwright, no Vitest
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      // trinquete de cobertura S1: sube en cada sprint, nunca baja
      thresholds: { lines: 30, functions: 30, statements: 30, branches: 30 },
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
    },
  },
})