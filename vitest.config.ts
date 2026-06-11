import { defineConfig } from 'vitest/config'

export default defineConfig({
  server: {
    hmr: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
})
