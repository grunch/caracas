// Capturas comparables de los templos (Santa Rosalía, San Juan y San José, #259; La Candelaria, #243):
//   node tests/e2e/capturas-templos.mjs [url] [carpeta] [prefijo]
// Misma cámara en las seis épocas, desde arriba y de costado (hacia la fachada). TEMPLO=san-jose saca solo ese;
// TEMPLO_EPOCA=1911, solo esa época; TEMPLO_VISTA=arriba, solo esa vista; TEMPLO_MODO=tinta, sin color;
// TEMPLO_GPU=1, con la tarjeta de video en vez del render por software (mucho más rápido donde la hay).
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'docs/capturas/templos-259'
const prefijo = process.argv[4] ?? 'despues'
const AÑOS = [[1, '1772'], [2, '1843'], [3, '1889'], [4, '1911'], [5, '1936'], [6, '1946']]
// El centro de cada templo en metros del mundo (su contorno en docs/templos-259-georreferencia.json) y el rumbo
// desde el que se ve la fachada: Santa Rosalía mira al oeste, San Juan al norte y San José al sur.
const TEMPLOS = {
  // San Jacinto (#245): el solar del convento y del mercado (docs/san-jacinto-georreferencia.json); la iglesia y el
  // frente del mercado miran al norte
  'san-jacinto': { x: 236, z: 140, yaw: Math.PI - 0.45, dist: [230, 150] },
  'santa-rosalia': { x: 74, z: 853, yaw: -Math.PI / 2 + 0.45 },
  'san-juan': { x: -1020, z: 762, yaw: Math.PI - 0.45 },
  'san-jose': { x: 831, z: -758, yaw: 0.45 },
  candelaria: { x: 1133, z: 79, yaw: -Math.PI / 2 + 0.45 }, // docs/candelaria-georreferencia.json; mira al oeste, a su plaza
}
const vistasDe = ({ x, z, yaw, dist = [170, 105] }) => ({
  arriba: { x, z, dist: dist[0], yaw: 0, pitch: 1.1 },
  costado: { x, z, dist: dist[1], yaw, pitch: 0.36 },
})
const lista = (valor) => valor?.split(',').map((v) => v.trim()).filter(Boolean)
const [soloTemplo, soloEpoca, soloVista] = [lista(process.env.TEMPLO), lista(process.env.TEMPLO_EPOCA), lista(process.env.TEMPLO_VISTA)]
const enTinta = process.env.TEMPLO_MODO === 'tinta'
for (const id of soloTemplo ?? []) if (!TEMPLOS[id]) throw new Error(`TEMPLO desconocido: ${id}`)

const GPU = process.env.TEMPLO_GPU === '1'
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
    for (const [id, templo] of Object.entries(TEMPLOS).filter(([id]) => !soloTemplo || soloTemplo.includes(id))) {
      for (const [nombre, vista] of Object.entries(vistasDe(templo)).filter(([nombre]) => !soloVista || soloVista.includes(nombre))) {
        await page.evaluate((v) => { window.lab.cam.jump(v); window.lab.pedirCuadro(6) }, vista)
        await page.waitForTimeout(4500)
        await page.screenshot({ path: `${carpeta}/${id}-${prefijo}-${año}-${nombre}${enTinta ? '-tinta' : ''}.png`, timeout: 400000 })
        console.log(`captura ${id} ${prefijo} ${año} ${nombre}`)
      }
    }
  }
} finally {
  await browser.close()
}
