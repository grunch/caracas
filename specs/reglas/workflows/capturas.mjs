// Capturas fijas de una época para la revisión visual de las reglas de construcción (specs/13 § 2.3).
// Uso: node specs/reglas/workflows/capturas.mjs <url> <carpeta> <indice de época> [vistas separadas por coma]
// Ej.: node specs/reglas/workflows/capturas.mjs https://caracas.city /tmp/rev 2
// Escribe <carpeta>/<indice>-<vista>.png (1280×900, en color, ciudad levantada). Cámaras en metros, plaza en el origen.
import { chromium } from '@playwright/test'

export const VISTAS = {
  general: { x: 100, z: 200, dist: 3200, yaw: 0, pitch: 1.5 },
  sur_oblicua: { x: 100, z: 300, dist: 1800, yaw: 0, pitch: 0.55 },
  noreste_oblicua: { x: 100, z: 100, dist: 1800, yaw: 2.4, pitch: 0.55 },
  oeste_oblicua: { x: 0, z: 200, dist: 1800, yaw: -1.6, pitch: 0.55 },
  plaza_baja: { x: 0, z: 0, dist: 260, yaw: 0.6, pitch: 0.25 },
  plaza_cenital: { x: 0, z: 0, dist: 550, yaw: 0, pitch: 1.5 },
  norte: { x: -100, z: -700, dist: 1000, yaw: 0, pitch: 1.2 },
  sur: { x: 150, z: 1000, dist: 1000, yaw: 0, pitch: 1.2 },
  este: { x: 900, z: 200, dist: 1000, yaw: 0, pitch: 1.2 },
  oeste: { x: -800, z: 200, dist: 1000, yaw: 0, pitch: 1.2 },
  catuche_centro: { x: -250, z: -300, dist: 700, yaw: 0, pitch: 1.5 },
  caroata: { x: -700, z: 350, dist: 900, yaw: 0, pitch: 1.5 },
}

const [url, carpeta, epocaTxt, lista] = process.argv.slice(2)
if (!url || !carpeta || epocaTxt === undefined) {
  console.error('uso: node specs/reglas/workflows/capturas.mjs <url> <carpeta> <indice de época> [vistas]')
  process.exit(2)
}
const epoca = Number(epocaTxt)
const nombres = lista ? lista.split(',') : Object.keys(VISTAS)
const desconocidas = nombres.filter((n) => !VISTAS[n])
if (desconocidas.length) {
  console.error(`vistas desconocidas: ${desconocidas.join(', ')}`)
  process.exit(2)
}
const nav = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const p = await nav.newPage({ viewport: { width: 1280, height: 900 } })
p.on('pageerror', (e) => console.error('pageerror:', e.message))
await p.goto(`${url}?capture&sinintro`)
await p.waitForFunction(() => window.lab?.ready && window.lab.relieve && window.lab.lineaDeTiempo, null, { timeout: 240000 })
await p.evaluate((e) => { window.lab.levantar(true); window.lab.alternarColor?.(); window.lab.lineaDeTiempo.elegir(e) }, epoca)
await p.waitForFunction((e) => window.lab.ciudad.U.uEpocaA.value === e, epoca, { timeout: 120000 })
await p.evaluate(() => { window.lab.ciudad.U.uOla.value = 1e5; window.lab.ciudad.U.uOlaEpoca.value = 8999 })
await p.waitForTimeout(15000)
for (const n of nombres) {
  await p.evaluate((v) => { window.lab.cam.jump(v); window.lab.pedirCuadro(4) }, VISTAS[n])
  await p.waitForTimeout(9000)
  await p.screenshot({ path: `${carpeta}/${epoca}-${n}.png`, timeout: 240000 })
  console.log('captura', n)
}
await nav.close()
