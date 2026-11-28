// Capturas comparables de las obras de 1946 (#264 Ciudad Universitaria, #276 avenida Bolívar):
//   node tests/e2e/capturas-obras-1946.mjs [url] [carpeta] [prefijo]
// Misma cámara, desde arriba y con los nombres a la vista, en las seis épocas. OBRA=ucv saca solo esa zona;
// OBRA_EPOCA=1936,1946, solo esas épocas.
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'docs/capturas/obras-1946'
const prefijo = process.argv[4] ?? 'despues'
const AÑOS = [[1, '1772'], [2, '1843'], [3, '1889'], [4, '1911'], [5, '1936'], [6, '1946']]
// Centros en metros del mundo, leídos del plano DCN de 1946 con su calce (tools/geo/gcp/1946-cuadricula.json):
// el rótulo «Ciudad Universitaria (en construcción)» y el corredor entre El Silencio y el Parque Carabobo.
const VISTAS = {
  ucv: { x: 2600, z: 1600, dist: 1150, yaw: 0, pitch: 1.25 },
  'bolivar-corredor': { x: 300, z: 470, dist: 1350, yaw: 0, pitch: 1.25 },
  'bolivar-municipal': { x: -330, z: 390, dist: 330, yaw: 0, pitch: 1.3 },
}
const lista = (valor) => valor?.split(',').map((v) => v.trim()).filter(Boolean)
const [soloObra, soloEpoca] = [lista(process.env.OBRA), lista(process.env.OBRA_EPOCA)]
const vistas = Object.entries(VISTAS).filter(([id]) => !soloObra || soloObra.some((o) => id.startsWith(o)))
if (!vistas.length) throw new Error(`OBRA desconocida: ${process.env.OBRA}`)

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (e) => console.error('pageerror:', e.message))
  await mkdir(carpeta, { recursive: true })
  await page.goto(`${url}?capture&sinintro&sinsw`)
  await page.waitForFunction(() => window.lab?.ready && window.lab?.lineaDeTiempo && window.lab?.casasListas, null, { timeout: 180000 })
  await page.evaluate(() => {
    window.lab.levantar(true)
    window.lab.ciudad.U.uOla.value = 1e5
    window.lab.ciudad.U.uOlaEpoca.value = 8999
    window.lab.alternarColor(true)
    window.lab.alternarMarcas?.(true)
  })
  await page.waitForFunction(() => window.lab.ciudad.U.uColor.value === 1, null, { timeout: 60000 })
  await page.waitForTimeout(4000)
  for (const [epoca, año] of AÑOS.filter(([, año]) => !soloEpoca || soloEpoca.includes(año))) {
    await page.evaluate((e) => window.lab.lineaDeTiempo.elegir(e), epoca)
    await page.waitForFunction((e) => window.lab.ciudad.U.uEpocaA.value === e && window.lab.ciudad.U.uOlaEpoca.value >= 9000, epoca, { timeout: 300000 })
    for (const [id, vista] of vistas) {
      await page.evaluate((v) => { window.lab.cam.jump(v); window.lab.pedirCuadro(6) }, vista)
      await page.waitForTimeout(6000)
      await page.screenshot({ path: `${carpeta}/${id}-${prefijo}-${año}.png`, timeout: 400000 })
      console.log(`captura ${id} ${prefijo} ${año}`)
    }
  }
} finally {
  await browser.close()
}
