// Capturas comparables del Cuartel San Carlos (#248):
//   node tests/e2e/capturas-san-carlos.mjs [url] [carpeta] [prefijo]
// Misma cámara en las seis épocas, desde arriba y de costado (desde el suroeste, hacia la fachada).
// CUARTEL_EPOCA=1911 saca solo esa época; CUARTEL_VISTA=arriba, solo esa vista; CUARTEL_GPU=1 usa la GPU del equipo.
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'docs/capturas/san-carlos-248'
const prefijo = process.argv[4] ?? 'despues'
const AÑOS = [[1, '1772'], [2, '1843'], [3, '1889'], [4, '1911'], [5, '1936'], [6, '1946']]
// El centro del cuartel en metros del mundo (su contorno en docs/san-carlos-georreferencia.json); la fachada
// principal mira al sur-suroeste.
const CENTRO = { x: 110, z: -929 }
const VISTAS = {
  arriba: { ...CENTRO, dist: 230, yaw: 0, pitch: 1.1 },
  costado: { ...CENTRO, dist: 170, yaw: -0.95, pitch: 0.42 },
}
const lista = (valor) => valor?.split(',').map((v) => v.trim()).filter(Boolean)
const [soloEpoca, soloVista] = [lista(process.env.CUARTEL_EPOCA), lista(process.env.CUARTEL_VISTA)]
const args = process.env.CUARTEL_GPU
  ? ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist']
  : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']

const browser = await chromium.launch({ args })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (e) => console.error('pageerror:', e.message))
  await mkdir(carpeta, { recursive: true })
  const destino = new URL(url) // conserva lo que traiga la URL (?planos…)
  for (const bandera of ['capture', 'sinintro', 'sinsw']) destino.searchParams.set(bandera, '')
  await page.goto(destino.href)
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
      await page.screenshot({ path: `${carpeta}/san-carlos-${prefijo}-${año}-${nombre}.png`, timeout: 400000 })
      console.log(`captura san-carlos ${prefijo} ${año} ${nombre}`)
    }
  }
} finally {
  await browser.close()
}
