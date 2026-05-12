import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['scripts/*.integration.test.ts'],
    testTimeout: 600000, // 10 minutes — slow integration tests
    hookTimeout: 60000,
  },
})
