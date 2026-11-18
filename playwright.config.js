import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  // con los datos reales la página arma 59 mil casas y el relieve en el render por software: 30 s no alcanzan
  timeout: 90_000,
  use: { baseURL: 'http://localhost:5199' },
  webServer: { command: 'npx vite --port 5199 --strictPort', port: 5199, reuseExistingServer: true },
})
