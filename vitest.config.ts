import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/**',
        'src/hooks/**',
        'src/server/**',
        'src/components/scanner/**',
      ],
      exclude: ['src/lib/gemini-food-analyzer.ts'],  // needs live API — test via mocks
    },
  },
})
