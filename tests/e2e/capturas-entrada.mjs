// Capturas de la entrada (no es un test): [ANGLE=gl] node tests/e2e/capturas-entrada.mjs [url] [carpeta]
// Sin bienvenida (ya vista), una captura cada tanto mientras la hoja se pone en color, la ciudad se levanta y la
// cámara baja volando al centro (src/arranque.js). Con SwiftShader cada cuadro tarda: mejor con ANGLE=gl.
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'test-results/capturas-entrada'
const gl = process.env.ANGLE === 'gl' ? ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const MOMENTOS_MS = [300, 1500, 3000, 4000, 5000, 6000, 7500, 10000]

const navegador = await chromium.launch({ args: gl })
await mkdir(carpeta, { recursive: true })
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } })
pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
await pagina.addInitScript(() => localStorage.setItem('caracas:intro-vista', '1'))
await pagina.goto(url)
await pagina.waitForFunction(() => window.lab?.ready === true, null, { timeout: 120000 })
const inicio = Date.now()
for (const ms of MOMENTOS_MS) {
  await pagina.waitForTimeout(Math.max(0, ms - (Date.now() - inicio)))
  const estado = await pagina.evaluate(() => {
    const { ciudad, cam } = window.lab
    return { ola: Math.round(ciudad.U.uOla.value), color: +ciudad.U.uColor.value.toFixed(2), dist: Math.round(cam.now.dist), pitch: +cam.now.pitch.toFixed(2), volando: cam.volando }
  })
  console.log(ms, JSON.stringify(estado))
  await pagina.screenshot({ path: `${carpeta}/entrada-${ms}.png` })
}
await navegador.close()
