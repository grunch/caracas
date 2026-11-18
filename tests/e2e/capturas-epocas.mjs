// Capturas del plano de cada época (no es un test): node tests/e2e/capturas-epocas.mjs [url] [carpeta] [vistas-json]
// Chromium headless con SwiftShader; la ciudad levantada, en tinta, la misma cámara en cada época.
import { chromium } from '@playwright/test'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'test-results/capturas-epocas'
const VISTAS = process.argv[4] ? JSON.parse(process.argv[4]) : {
  centro: { x: 0, z: 100, dist: 1700, yaw: 0, pitch: 0.95 },
  cerca: { x: 0, z: 0, dist: 650, yaw: 0.35, pitch: 0.7 },
}

const navegador = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 800 } })
pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
pagina.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('consola:', m.text()) })
await pagina.goto(`${url}?capture&sinintro`)
await pagina.waitForFunction(() => window.lab?.ready && window.lab.relieve && window.lab.lineaDeTiempo, null, { timeout: 120000 })
await pagina.evaluate(() => window.lab.levantar(true))
// la ola termina cuando el suelo de la esquina más lejana de la hoja ya se hinchó entero (como capturas.mjs)
await pagina.waitForFunction(() => {
  const { relieve, relieveU, sueloEn, coords: { hoja } } = window.lab
  const [x, z] = [hoja.x0 + hoja.ancho, hoja.z0 + hoja.alto]
  return Math.abs(sueloEn(x, z) - relieve.alturaEn(x, z) * relieveU.uExageracion.value) < 1e-6
}, null, { polling: 2000, timeout: 900000 })
const dosCuadros = () => pagina.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

const años = await pagina.evaluate(() => [...document.querySelectorAll('#epocas .años button:not(.andar)')].map((b) => b.textContent))
for (const [i, año] of años.entries()) {
  if (i === 0) continue // 1578 muestra el plano de 1772 (ver src/planos.js)
  await pagina.evaluate((k) => window.lab.lineaDeTiempo.elegir(k), i)
  await pagina.waitForFunction((k) => window.lab.ciudad.U.uEpocaA.value === k, i, { timeout: 60000 })
  // si la ola salió con 1936 (el plano tardó más que la espera), la captura espera a que llegue el del año
  const conPlano = await pagina.evaluate((a) => fetch(`plano/${a}/chico.webp`).then((r) => (r.headers.get('content-type') ?? '').includes('webp')), año)
  if (conPlano) {
    await pagina.waitForFunction((a) => window.lab.ciudad.U.uPlanoA.value.image?.src?.includes(`plano/${a}/`), año, { timeout: 120000 })
  }
  // con SwiftShader cada cuadro tarda: se adelanta la ola hasta casi el final y se la deja terminar
  await pagina.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 8999 })
  await pagina.waitForTimeout(6000) // el nivel mejor del plano
  for (const [nombre, v] of Object.entries(VISTAS)) {
    await pagina.evaluate((v) => { window.lab.cam.jump(v); window.lab.pedirCuadro(4) }, v)
    await dosCuadros()
    await pagina.screenshot({ path: `${carpeta}/${año}-${nombre}.png`, timeout: 150000 })
    console.log('captura', año, nombre)
  }
}
await navegador.close()
