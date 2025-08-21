import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 120000,
    pool: 'threads',
    reporters: ['default'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/artifacts/**',
      '**/test/integration/validator.scenarios.test.ts', // Extensive test suite - run separately for faster feedback
    ],
  },
  resolve: {
    alias: {
      '@testUtils': path.resolve(__dirname, './test/utils/index.ts'),
    },
  },
})
