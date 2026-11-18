import { defineConfig } from '@playwright/test'

// PUERTO_E2E: otro puerto cuando el 5199 ya lo usa otro checkout (con reuseExistingServer se probaría su código)
const puerto = Number(process.env.PUERTO_E2E) || 5199

export default defineConfig({
  testDir: 'tests/e2e',
  // con los datos reales la página arma 34 mil casas y el relieve en el render por software: 30 s no alcanzan
  timeout: 90_000,
  // en CI el render es por software (SwiftShader): dos archivos de tests en paralelo se quitan la CPU y los
  // tests que esperan cuadros (la ola, el color) se pasan de tiempo; ahí van en serie
  workers: process.env.CI ? 1 : undefined,
  use: { baseURL: `http://localhost:${puerto}` },
  webServer: { command: `npx vite --port ${puerto} --strictPort`, port: puerto, reuseExistingServer: true },
})
