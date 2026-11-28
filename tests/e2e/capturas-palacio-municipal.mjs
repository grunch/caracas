// Capturas comparables del Palacio Municipal (#252):
//   node tests/e2e/capturas-palacio-municipal.mjs [url] [carpeta] [prefijo]
// Misma cámara en las seis épocas, desde arriba y de costado (desde la plaza, hacia el frente norte).
// PALACIO_EPOCA=1911 saca solo esa época; PALACIO_VISTA=arriba, solo esa vista; PALACIO_GPU=1 usa la GPU del equipo.
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'docs/capturas/palacio-municipal-252'
const prefijo = process.argv[4] ?? 'despues'
const AÑOS = [[1, '1772'], [2, '1843'], [3, '1889'], [4, '1911'], [5, '1936'], [6, '1946']]
// El centro del recuadro en metros del mundo (docs/palacio-municipal-georreferencia.json); el frente mira al norte.
const CENTRO = { x: -42, z: 88 }
const VISTAS = {
  arriba: { ...CENTRO, dist: 190, yaw: 0, pitch: 1.1 },
  costado: { ...CENTRO, dist: 125, yaw: Math.PI + 0.55, pitch: 0.4 },
}
const lista = (valor) => valor?.split(',').map((v) => v.trim()).filter(Boolean)
const [soloEpoca, soloVista] = [lista(process.env.PALACIO_EPOCA), lista(process.env.PALACIO_VISTA)]
const args = process.env.PALACIO_GPU
  ? ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist']
  : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']

const browser = await chromium.launch({ args })
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
    window.lab.alternarMarcas?.(false)
  })
  await page.waitForFunction(() => window.lab.ciudad.U.uColor.value === 1, null, { timeout: 60000 })
  await page.waitForTimeout(4000)
  for (const [epoca, año] of AÑOS.filter(([, año]) => !soloEpoca || soloEpoca.includes(año))) {
    await page.evaluate((e) => window.lab.lineaDeTiempo.elegir(e), epoca)
    await page.waitForFunction((e) => window.lab.ciudad.U.uEpocaA.value === e && window.lab.ciudad.U.uOlaEpoca.value >= 9000, epoca, { timeout: 300000 })
    for (const [nombre, vista] of Object.entries(VISTAS).filter(([nombre]) => !soloVista || soloVista.includes(nombre))) {
      await page.evaluate((v) => { window.lab.cam.jump(v); window.lab.pedirCuadro(6) }, vista)
      await page.waitForTimeout(4500)
      await page.screenshot({ path: `${carpeta}/palacio-municipal-${prefijo}-${año}-${nombre}.png`, timeout: 400000 })
      console.log(`captura palacio-municipal ${prefijo} ${año} ${nombre}`)
    }
  }
} finally {
  await browser.close()
}
