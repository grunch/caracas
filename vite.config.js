import { execFileSync } from 'node:child_process'
import { defineConfig } from 'vite'

/** El commit con que se construye, para la ayuda (src/acerca.js, `bloqueDeVersion`); null fuera de git. */
function commitActual() {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  try {
    return { hash: git('rev-parse', 'HEAD'), sucio: git('status', '--porcelain', '--untracked-files=no') !== '' }
  } catch {
    return null
  }
}

export default defineConfig({
  base: './',
  define: { __COMMIT__: JSON.stringify(commitActual()) },
  // dos páginas: el visor y «la ciudad edificio por edificio» (T71), que lo embebe como vitrina
  build: { target: 'es2022', assetsInlineLimit: 0, rollupOptions: { input: { main: 'index.html', edificios: 'edificios.html' } } },
  test: { include: ['tests/unit/**/*.test.js'], coverage: { include: ['src/**', 'tools/**'] } },
})
