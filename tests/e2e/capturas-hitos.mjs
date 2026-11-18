// Capturas de los hitos (no es un test): node tests/e2e/capturas-hitos.mjs [url] [carpeta] [vistas-json]
// Cada vista: { epoca, color (true/false), x, z, dist, yaw, pitch }. Chromium headless con SwiftShader.
// Con GPU: ANGLE=gl node tests/e2e/capturas-hitos.mjs … (mucho más rápido que SwiftShader).
// Para comparar con las referencias de fuentes/imagenes (los montajes los arma quien las mira).
import { chromium } from '@playwright/test'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'test-results/capturas-hitos'
const VISTAS = process.argv[4] ? JSON.parse(process.argv[4]) : {
  'mercado-1843': { epoca: 2, color: true, x: 20, z: 130, dist: 150, yaw: 0.15, pitch: 0.42 },
  'plaza-1889': { epoca: 3, color: true, x: 20, z: 130, dist: 150, yaw: 0.15, pitch: 0.42 },
  'plaza-1936': { epoca: 5, color: true, x: 20, z: 130, dist: 150, yaw: 0.15, pitch: 0.42 },
  'plaza-1889-tinta': { epoca: 3, color: false, x: 20, z: 130, dist: 150, yaw: 0.15, pitch: 0.42 },
}

const angle = process.env.ANGLE ?? 'swiftshader'
const navegador = await chromium.launch({ args: [`--use-angle=${angle}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 800 } })
pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
pagina.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('consola:', m.text()) })
await pagina.goto(`${url}?capture&sinintro`)
await pagina.waitForFunction(() => window.lab?.ready && window.lab.hitos && window.lab.lineaDeTiempo, null, { timeout: 120000 })
// sin esperar la ola: la ciudad entera de pie de una vez
await pagina.evaluate(() => { window.lab.levantar(true); window.lab.ciudad.U.uOla.value = 1e5 })
const dosCuadros = () => pagina.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

let epoca = null
let color = null
for (const [nombre, v] of Object.entries(VISTAS)) {
  if (v.epoca !== epoca) {
    epoca = v.epoca
    await pagina.evaluate((k) => window.lab.lineaDeTiempo.elegir(k), epoca)
    await pagina.waitForFunction((k) => window.lab.ciudad.U.uEpocaA.value === k, epoca, { timeout: 60000 })
    await pagina.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 8999 })
    await pagina.waitForTimeout(1500)
  }
  if (v.color !== color) {
    color = v.color
    await pagina.evaluate((c) => { window.lab.alternarColor(c); window.lab.ciudad.U.uColor.value = c ? 0.999 : 0.001 }, color)
    await pagina.waitForTimeout(color ? 4000 : 500) // la máscara de suelo y la de rótulos
  }
  await pagina.evaluate((v) => { window.lab.cam.jump(v); window.lab.pedirCuadro(6) }, v)
  await pagina.waitForTimeout(v.espera ?? 2500) // las teselas finas del plano
  await dosCuadros()
  await pagina.screenshot({ path: `${carpeta}/${nombre}.png`, timeout: 150000 })
  console.log('captura', nombre)
}
await navegador.close()
