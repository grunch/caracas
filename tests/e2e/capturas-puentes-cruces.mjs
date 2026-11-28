// Capturas de las marcas de los cruces del Guaire (no es un test):
//   node tests/e2e/capturas-puentes-cruces.mjs [url] [carpeta] [prefijo]
// La ciudad levantada, con «Nombres» prendido, la misma cámara en 1911, 1936 y 1946: el tramo de El Paraíso
// (Ayacucho, Dolores, Restaurador), el tramo del este (Restaurador, Hierro, Sucre) y, de cerca y desde arriba,
// cada cruce. Escribe además <prefijo>-marcas.json con las marcas que se ven en cada captura.
// CRUCES_CAPTURA=1936 saca solo esa época; CRUCES_VISTA=este, solo esa vista.
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5199/'
// Fuera de lo versionado: a docs/capturas/puentes-cruces solo van las elegidas, convertidas a webp.
const carpeta = process.argv[3] ?? 'test-results/capturas-puentes-cruces'
const prefijo = process.argv[4] ?? 'despues'
const solo = process.env.CRUCES_CAPTURA
const soloVista = process.env.CRUCES_VISTA
const AÑOS = [[4, '1911'], [5, '1936'], [6, '1946']]
// Centros adoptados en docs/puentes-guaire-calce.json, en píxeles del mosaico de 1936.
const CRUCES = { dolores: [7908, 10122], restaurador: [8500, 9880], diciembre: [3284, 10727], ayacucho: [6726, 9180] }
const PLAZA = [8968.2, 6839]
const METRO = 0.5
const aMundo = ([px, py]) => ({ x: (px - PLAZA[0]) * METRO, z: (py - PLAZA[1]) * METRO })
const DESDE_ARRIBA = 1.45
const VISTAS = {
  paraiso: { x: -640, z: 1420, dist: 1250, yaw: 0, pitch: 1.2 },
  este: { x: 70, z: 1400, dist: 1100, yaw: 0, pitch: 1.2 },
  ...Object.fromEntries(Object.entries(CRUCES).map(([nombre, px]) => [nombre, { ...aMundo(px), dist: 330, yaw: 0, pitch: DESDE_ARRIBA }])),
}

const navegador = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } })
pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
await mkdir(carpeta, { recursive: true })
await pagina.goto(`${url}?capture&sinintro&sinsw`)
await pagina.waitForFunction(() => window.lab?.ready && window.lab?.lineaDeTiempo && window.lab?.casasListas, null, { timeout: 180000 })
await pagina.evaluate(() => {
  window.lab.levantar(true)
  window.lab.ciudad.U.uOla.value = 1e5
  window.lab.ciudad.U.uOlaEpoca.value = 8999
  window.lab.alternarMarcas(true)
})
await pagina.waitForTimeout(4000)

const vistos = {}
for (const [epoca, año] of AÑOS.filter(([, año]) => !solo || solo === año)) {
  await pagina.evaluate((e) => window.lab.lineaDeTiempo.elegir(e), epoca)
  await pagina.waitForFunction((e) => window.lab.ciudad.U.uEpocaA.value === e && window.lab.ciudad.U.uOlaEpoca.value >= 9000, epoca, { timeout: 300000 })
  for (const [nombre, vista] of Object.entries(VISTAS).filter(([nombre]) => !soloVista || soloVista === nombre)) {
    await pagina.evaluate((v) => { window.lab.cam.jump(v); window.lab.pedirCuadro(6) }, vista)
    await pagina.waitForTimeout(4500)
    await pagina.screenshot({ path: `${carpeta}/${prefijo}-${año}-${nombre}.png`, timeout: 400000 })
    vistos[`${año}-${nombre}`] = await pagina.evaluate(() => window.lab.marcas.visibles.map(({ id, nombre, x, y }) => ({ id, nombre, x: Math.round(x), y: Math.round(y) })))
    console.log(`captura ${prefijo} ${año} ${nombre}: ${vistos[`${año}-${nombre}`].map((m) => m.nombre).join(', ')}`)
  }
}
await writeFile(`${carpeta}/${prefijo}-marcas${soloVista ? `-${soloVista}` : ''}.json`, `${JSON.stringify(vistos, null, 1)}\n`)
await navegador.close()
