import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: { target: 'es2022', assetsInlineLimit: 0 },
  test: { include: ['tests/unit/**/*.test.js'], coverage: { include: ['src/**', 'tools/**'] } },
})
