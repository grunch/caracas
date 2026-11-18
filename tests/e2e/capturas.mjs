// Capturas de verificación del relieve (no es un test): node tests/e2e/capturas.mjs [url] [carpeta]
// Chromium headless con SwiftShader; levanta la ciudad y fotografía vistas fijas.
import { chromium } from '@playwright/test'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'test-results/capturas'
const extra = process.argv[4] ?? ''
const soloVistas = process.argv[5] ? JSON.parse(process.argv[5]) : null

const VISTAS = {
  'sur-norte': { x: 300, z: 400, dist: 5200, yaw: 0, pitch: 0.42 },
  'calvario': { x: -930, z: 200, dist: 520, yaw: 0.9, pitch: 0.42 },
  'cenital': { x: 600, z: 0, dist: 9000, yaw: 0, pitch: 1.5 },
  'pastora-cuesta': { x: -430, z: -950, dist: 260, yaw: 0.6, pitch: 0.28 },
}

const navegador = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 800 } })
pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
pagina.on('console', (m) => { if (m.type() !== 'debug') console.log('consola:', m.text()) })
await pagina.goto(`${url}?capture${extra}`)
await pagina.waitForFunction(() => window.lab?.ready && window.lab.relieve, null, { timeout: 60000 })
await pagina.waitForTimeout(4000) // texturas del plano y la ciudad
await pagina.evaluate(() => window.lab.levantar(true))
// la ola termina cuando el suelo de la esquina más lejana de la hoja ya se hinchó entero
// (con SwiftShader cada cuadro tarda segundos: no alcanza con esperar 5 s)
await pagina.waitForFunction(() => {
  const { relieve, relieveU, sueloEn, coords: { hoja } } = window.lab
  const [x, z] = [hoja.x0 + hoja.ancho, hoja.z0 + hoja.alto]
  return Math.abs(sueloEn(x, z) - relieve.alturaEn(x, z) * relieveU.uExageracion.value) < 1e-6
}, null, { polling: 2000, timeout: 600000 })
const dosCuadros = () => pagina.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
for (const [nombre, v] of Object.entries(soloVistas ?? VISTAS)) {
  await pagina.evaluate((v) => { window.lab.cam.jump(v); window.lab.pedirCuadro(4) }, v)
  await dosCuadros()
  await pagina.screenshot({ path: `${carpeta}/${nombre}.png`, timeout: 150000 })
  console.log('captura', nombre)
}
await navegador.close()
