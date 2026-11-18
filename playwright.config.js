import { defineConfig } from '@playwright/test'

// PUERTO_E2E: otro puerto cuando el 5199 ya lo usa otro checkout (con reuseExistingServer se probaría su código)
const puerto = Number(process.env.PUERTO_E2E) || 5199

export default defineConfig({
  testDir: 'tests/e2e',
  // con los datos reales la página arma 34 mil casas y el relieve en el render por software: 30 s no alcanzan
  timeout: 90_000,
  use: { baseURL: `http://localhost:${puerto}` },
  webServer: { command: `npx vite --port ${puerto} --strictPort`, port: puerto, reuseExistingServer: true },
})
