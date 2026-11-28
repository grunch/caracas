// Capturas comparables del convento de San Francisco y la Universidad (#254):
//   node tests/e2e/capturas-convento-254.mjs [url] [carpeta] [prefijo]
// Misma cámara en las seis épocas: desde arriba, de costado hacia el frente norte y de costado desde el sur.
// CONVENTO_EPOCA=1843, solo esa época; CONVENTO_VISTA=arriba, solo esa vista; CONVENTO_MODO=tinta, sin color;
// CONVENTO_GPU=1, con la tarjeta de video en vez del render por software.
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'docs/capturas/convento-254'
const prefijo = process.argv[4] ?? 'despues'
const AÑOS = [[1, '1772'], [2, '1843'], [3, '1889'], [4, '1911'], [5, '1936'], [6, '1946']]
// el centro del convento en metros del mundo (docs/convento-san-francisco-georreferencia.json); el frente mira al norte
const CENTRO = { x: -168, z: 231 }
const VISTAS = {
  arriba: { ...CENTRO, dist: 230, yaw: 0, pitch: 1.1 },
  frente: { ...CENTRO, dist: 150, yaw: Math.PI - 0.45, pitch: 0.42 },
  sur: { ...CENTRO, dist: 150, yaw: 0.45, pitch: 0.42 },
}
const lista = (valor) => valor?.split(',').map((v) => v.trim()).filter(Boolean)
const [soloEpoca, soloVista] = [lista(process.env.CONVENTO_EPOCA), lista(process.env.CONVENTO_VISTA)]
const enTinta = process.env.CONVENTO_MODO === 'tinta'
const GPU = process.env.CONVENTO_GPU === '1'

const browser = await chromium.launch({ args: GPU ? ['--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (e) => console.error('pageerror:', e.message))
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
  await page.waitForFunction((tinta) => window.lab.ciudad.U.uColor.value === (tinta ? 0 : 1), enTinta, { timeout: 60000 })
  await page.waitForTimeout(4000)
  for (const [epoca, año] of AÑOS.filter(([, año]) => !soloEpoca || soloEpoca.includes(año))) {
    await page.evaluate((e) => window.lab.lineaDeTiempo.elegir(e), epoca)
    await page.waitForFunction((e) => window.lab.ciudad.U.uEpocaA.value === e && window.lab.ciudad.U.uOlaEpoca.value >= 9000, epoca, { timeout: 300000 })
    for (const [nombre, vista] of Object.entries(VISTAS).filter(([nombre]) => !soloVista || soloVista.includes(nombre))) {
      await page.evaluate((v) => { window.lab.cam.jump(v); window.lab.pedirCuadro(6) }, vista)
      await page.waitForTimeout(4500)
      await page.screenshot({ path: `${carpeta}/convento-${prefijo}-${año}-${nombre}${enTinta ? '-tinta' : ''}.png`, timeout: 400000 })
      console.log(`captura ${prefijo} ${año} ${nombre}`)
    }
  }
} finally {
  await browser.close()
}
