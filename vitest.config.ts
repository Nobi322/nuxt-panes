import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    'import.meta.client': true,
    'import.meta.server': false
  },
  resolve: {
    alias: {
      '#imports': fileURLToPath(new URL('./test/stubs/imports.ts', import.meta.url)),
      '#build/panes.config.mjs': fileURLToPath(new URL('./test/stubs/panes.config.mjs', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts']
  }
})
