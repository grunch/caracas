import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  // dos páginas: el visor y «la ciudad edificio por edificio» (T71), que lo embebe como vitrina
  build: { target: 'es2022', assetsInlineLimit: 0, rollupOptions: { input: { main: 'index.html', edificios: 'edificios.html' } } },
  test: { include: ['tests/unit/**/*.test.js'], coverage: { include: ['src/**', 'tools/**'] } },
})
