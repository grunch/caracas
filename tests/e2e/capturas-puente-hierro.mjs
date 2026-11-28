// Capturas comparables del Puente de Hierro: node tests/e2e/capturas-puente-hierro.mjs [url] [carpeta] [prefijo]
// Misma cámara en 1889, 1911, 1936 y 1946: desde arriba, baja de costado (desde el este) y desde el cauce (oeste).
// PUENTE_CAPTURA=1936 saca solo esa época; PUENTE_VISTA=arriba,costado, solo esas vistas; PUENTE_MODO=tinta, sin color.
// Otro puente: PUENTE_CRUCE=x,z (el centro del tablero en metros del mundo) y su carpeta. El cruce de la calle Sur 7
// (Constitución y Sucre): PUENTE_CRUCE=369,1299 PUENTE_VISTA=arriba,costado node tests/e2e/capturas-puente-hierro.mjs <url> docs/capturas/puente-sucre
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'docs/capturas/puente-hierro'
const prefijo = process.argv[4] ?? 'despues'
const años = [[3, '1889'], [4, '1911'], [5, '1936'], [6, '1946']]
const solo = process.env.PUENTE_CAPTURA
const soloVista = process.env.PUENTE_VISTA
const enTinta = process.env.PUENTE_MODO === 'tinta'
// El cruce medido (docs/puentes-guaire-calce.md), en metros del mundo: el centro del tablero. Por omisión, el de Hierro.
const [x, z] = (process.env.PUENTE_CRUCE ?? '235,1301').split(',').map(Number)
if (![x, z].every(Number.isFinite)) throw new Error('PUENTE_CRUCE debe ser «x,z» en metros del mundo')
const CRUCE = { x, z }
const VISTAS = {
  arriba: { ...CRUCE, dist: 190, yaw: 0, pitch: 1.05 },
  costado: { ...CRUCE, dist: 85, yaw: Math.PI / 2, pitch: 0.3 },
  cauce: { ...CRUCE, dist: 60, yaw: -Math.PI / 2 + 0.5, pitch: 0.14 },
}
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', e => console.error('pageerror:', e.message))
await mkdir(carpeta, { recursive: true })
await page.goto(`${url}?capture&sinintro&sinsw`)
await page.waitForFunction(() => window.lab?.ready && window.lab?.lineaDeTiempo && window.lab?.casasListas, null, { timeout: 180000 })
await page.evaluate((tinta) => {
  window.lab.levantar(true)
  window.lab.ciudad.U.uOla.value = 1e5
  window.lab.ciudad.U.uOlaEpoca.value = 8999
  window.lab.alternarColor(!tinta)
  window.lab.alternarMarcas?.(false)
}, enTinta)
await page.waitForFunction(tinta => window.lab.ciudad.U.uColor.value === (tinta ? 0 : 1), enTinta, { timeout: 60000 })
await page.waitForTimeout(4000)
for (const [epoca, año] of años.filter(([, año]) => !solo || solo === año)) {
  await page.evaluate(e => window.lab.lineaDeTiempo.elegir(e), epoca)
  await page.waitForFunction(e => window.lab.ciudad.U.uEpocaA.value === e && window.lab.ciudad.U.uOlaEpoca.value >= 9000, epoca, { timeout: 300000 })
  for (const [nombre, vista] of Object.entries(VISTAS).filter(([nombre]) => !soloVista || soloVista.split(',').includes(nombre))) {
    await page.evaluate(v => { window.lab.cam.jump(v); window.lab.pedirCuadro(6) }, vista)
    await page.waitForTimeout(4500)
    await page.screenshot({ path: `${carpeta}/${prefijo}-${año}-${nombre}${enTinta ? '-tinta' : ''}.png`, timeout: 400000 })
    console.log(`captura ${prefijo} ${año} ${nombre}`)
  }
}
await browser.close()
