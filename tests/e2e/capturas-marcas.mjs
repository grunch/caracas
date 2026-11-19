// Capturas de las marcas (no es un test): [ANGLE=gl] node tests/e2e/capturas-marcas.mjs [url] [carpeta] [vistas-json]
// La ciudad levantada, la misma cámara en cada época: lejos, medio y cerca, en tinta; y 1936 también en color.
// Escribe además marcas.json con lo que se ve en cada captura (id, nombre, posición en pantalla).
import { chromium } from '@playwright/test'
import { writeFile, mkdir } from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'test-results/capturas-marcas'
const VISTAS = process.argv[4] ? JSON.parse(process.argv[4]) : {
  lejos: { x: 0, z: 300, dist: 6500, yaw: 0, pitch: 0.95 },
  medio: { x: 0, z: 150, dist: 2600, yaw: 0, pitch: 0.85 },
  cerca: { x: 0, z: 60, dist: 900, yaw: 0.25, pitch: 0.7 },
}
const AÑOS_EN_COLOR = ['1936']

const gl = process.env.ANGLE === 'gl' ? ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const navegador = await chromium.launch({ args: gl })
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } })
pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
await mkdir(carpeta, { recursive: true })
await pagina.goto(`${url}?capture&sinintro`)
await pagina.waitForFunction(() => window.lab?.ready && window.lab.relieve && window.lab.lineaDeTiempo, null, { timeout: 120000 })
await pagina.evaluate(() => window.lab.levantar(true))
await pagina.waitForFunction(() => {
  const { relieve, relieveU, sueloEn, coords: { hoja } } = window.lab
  const [x, z] = [hoja.x0 + hoja.ancho, hoja.z0 + hoja.alto]
  return Math.abs(sueloEn(x, z) - relieve.alturaEn(x, z) * relieveU.uExageracion.value) < 1e-6
}, null, { polling: 2000, timeout: 900000 })
const cuadros = () => pagina.evaluate(() => new Promise((r) => { window.lab.pedirCuadro(4); requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))) }))

const vistos = {}
async function capturar(nombre) {
  for (const [vista, v] of Object.entries(VISTAS)) {
    await pagina.evaluate((v) => window.lab.cam.jump(v), v)
    await cuadros()
    await pagina.waitForTimeout(700) // el fundido de los carteles
    await pagina.screenshot({ path: `${carpeta}/${nombre}-${vista}.png`, timeout: 150000 })
    vistos[`${nombre}-${vista}`] = await pagina.evaluate(() => window.lab.marcas.visibles)
    console.log('captura', nombre, vista, vistos[`${nombre}-${vista}`].length, 'marcas')
  }
}

const años = await pagina.evaluate(() => [...document.querySelectorAll('#epocas .años button:not(.andar)')].map((b) => [Number(b.dataset.indice), b.textContent]))
for (const [i, año] of años) {
  await pagina.evaluate((k) => window.lab.lineaDeTiempo.elegir(k), i)
  await pagina.waitForFunction((k) => window.lab.ciudad.U.uEpocaA.value === k, i, { timeout: 60000 })
  await pagina.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 8999 })
  await pagina.waitForTimeout(4000)
  await capturar(`${año}-tinta`)
  if (!AÑOS_EN_COLOR.includes(año)) continue
  await pagina.evaluate(() => window.lab.alternarColor(true))
  await pagina.waitForFunction(() => window.lab.ciudad.U.uColor.value === 1, null, { timeout: 60000 })
  await pagina.waitForTimeout(4000) // la máscara de suelo
  await capturar(`${año}-color`)
  await pagina.evaluate(() => window.lab.alternarColor(false))
  await pagina.waitForFunction(() => window.lab.ciudad.U.uColor.value === 0, null, { timeout: 60000 })
}
// el velo: el mouse sobre un cartel (1936, de cerca)
await pagina.evaluate((v) => window.lab.cam.jump(v), VISTAS.cerca ?? Object.values(VISTAS)[0])
await cuadros()
const cartel = pagina.locator('#marcas .marca.ver .tag').first()
if (await cartel.count()) {
  await cartel.hover()
  await pagina.waitForTimeout(700)
  await pagina.screenshot({ path: `${carpeta}/1936-velo.png`, timeout: 150000 })
  await cartel.click()
  await pagina.waitForTimeout(2500) // el vuelo y la nota
  await pagina.screenshot({ path: `${carpeta}/1936-abierta.png`, timeout: 150000 })
  await pagina.mouse.move(5, 5)
}
// con la ciudad acostada las marcas siguen, apoyadas en el papel
await pagina.evaluate(() => { window.lab.levantar(false); window.lab.ciudad.U.uOla.value = 0 })
await pagina.evaluate((v) => window.lab.cam.jump(v), VISTAS.medio ?? Object.values(VISTAS)[0])
await cuadros()
await pagina.waitForTimeout(700)
await pagina.screenshot({ path: `${carpeta}/1936-acostada.png`, timeout: 150000 })
await writeFile(`${carpeta}/marcas.json`, JSON.stringify(vistos, null, 1))
await navegador.close()
