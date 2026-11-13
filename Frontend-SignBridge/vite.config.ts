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
      // trinquete de cobertura: sube en cada sprint, nunca baja.
      // Cierre S4 (11 nov): real 45.77 / 44.27 / 40.39 / 40.29 → redondeado hacia abajo
      thresholds: { lines: 45, functions: 40, statements: 44, branches: 40 },
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
    },
  },
})