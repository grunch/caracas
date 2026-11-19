// Capturas de las fichas (no es un test): [ANGLE=gl] node tests/e2e/capturas-fichas.mjs [url] [carpeta]
// Con los datos reales y las fotos (node tools/fotos.mjs): la ficha de la Plaza Bolívar en 1772, 1889 y 1936,
// otros lugares, uno sin fotos, el visor de fotos y lo mismo en el ancho de un teléfono.
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'test-results/capturas-fichas'
// [nombre, año, id de la marca]
const CASOS = [
  ['plaza-1772', 1772, 'plaza-bolivar'], ['plaza-1889', 1889, 'plaza-bolivar'], ['plaza-1936', 1936, 'plaza-bolivar'],
  ['catedral-1889', 1889, 'catedral'], ['panteon-1843', 1843, 'panteon'], ['panteon-1911', 1911, 'panteon'],
  ['capitolio-1772', 1772, 'capitolio'], ['capitolio-1911', 1911, 'capitolio'], ['miraflores-1911', 1911, 'miraflores'],
  ['calvario-1911', 1911, 'calvario'], ['sin-fotos-1936', 1936, 'nuevo-circo'], ['todavia-no-1772', 1772, 'justicia'],
]
const EN_TELEFONO = [['telefono-plaza-1889', 1889, 'plaza-bolivar'], ['telefono-sin-fotos-1936', 1936, 'hospital-vargas']]

const gl = process.env.ANGLE === 'gl' ? ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const navegador = await chromium.launch({ args: gl })
await mkdir(carpeta, { recursive: true })

async function abrirPagina(viewport) {
  const pagina = await navegador.newPage({ viewport })
  pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
  await pagina.goto(`${url}?capture&sinintro`)
  await pagina.waitForFunction(() => window.lab?.ready && window.lab.relieve && window.lab.lineaDeTiempo, null, { timeout: 120000 })
  await pagina.waitForFunction(() => window.lab.fichas.fotos.length > 0, null, { timeout: 30000 }).catch(() => console.warn('sin fotos: las fichas salen solo con texto'))
  await pagina.evaluate(() => window.lab.levantar(true))
  await pagina.waitForFunction(() => {
    const { relieve, relieveU, sueloEn, coords: { hoja } } = window.lab
    const [x, z] = [hoja.x0 + hoja.ancho, hoja.z0 + hoja.alto]
    return Math.abs(sueloEn(x, z) - relieve.alturaEn(x, z) * relieveU.uExageracion.value) < 1e-6
  }, null, { polling: 2000, timeout: 900000 })
  return pagina
}

async function ponerAño(pagina, año) {
  const indice = await pagina.evaluate((a) => Number([...document.querySelectorAll('#epocas .años button:not(.andar)')].find((b) => b.textContent === String(a)).dataset.indice), año)
  await pagina.evaluate((k) => window.lab.lineaDeTiempo.elegir(k), indice)
  await pagina.waitForFunction((k) => window.lab.ciudad.U.uEpocaA.value === k, indice, { timeout: 60000 })
  await pagina.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 8999 })
}

async function capturar(pagina, [nombre, año, id]) {
  await pagina.evaluate(() => window.lab.fichas.cerrar())
  await ponerAño(pagina, año)
  // como el click en el cartel: vuela, abre el cartel y la ficha
  await pagina.evaluate((i) => { if (window.lab.marcas.abierta !== i) window.lab.marcas.abrir(i) }, id)
  await pagina.waitForFunction(() => { const { now, goal } = window.lab.cam; return Math.hypot(now.x - goal.x, now.z - goal.z) < 2 && Math.abs(now.dist - goal.dist) < 2 }, null, { polling: 500, timeout: 120000 })
  await pagina.evaluate((i) => { if (window.lab.fichas.abierta !== i) window.lab.fichas.abrir(i) }, id)
  await pagina.waitForFunction(() => [...document.querySelectorAll('#ficha img')].every((i) => i.complete), null, { timeout: 30000 })
  await pagina.waitForTimeout(4500) // la ola de la época, el fundido de los carteles y el del panel
  await pagina.screenshot({ path: `${carpeta}/${nombre}.png`, timeout: 150000 })
  console.log('captura', nombre, await pagina.evaluate(() => { const c = window.lab.fichas.contenido; return `${c.titulo} · ${c.cuando} · ${c.fotos.length} fotos` }))
}

async function capturarVisor(pagina, nombre) {
  const hay = await pagina.evaluate(() => window.lab.fichas.verFoto(0))
  if (!hay) return console.warn(`${nombre}: la ficha abierta no tiene fotos`)
  await pagina.waitForFunction(() => { const i = document.querySelector('#visor img'); return i.complete && i.naturalWidth > 0 }, null, { timeout: 30000 })
  await pagina.waitForTimeout(600)
  await pagina.screenshot({ path: `${carpeta}/${nombre}.png`, timeout: 150000 })
  await pagina.evaluate(() => window.lab.fichas.pasarFoto(1))
  await pagina.waitForFunction(() => { const i = document.querySelector('#visor img'); return i.complete && i.naturalWidth > 0 }, null, { timeout: 30000 })
  await pagina.waitForTimeout(400)
  await pagina.screenshot({ path: `${carpeta}/${nombre}-2.png`, timeout: 150000 })
  await pagina.evaluate(() => window.lab.fichas.cerrarFoto())
  console.log('captura', nombre)
}

const escritorio = await abrirPagina({ width: 1440, height: 900 })
for (const caso of CASOS) {
  await capturar(escritorio, caso)
  if (caso[0] === 'plaza-1889') await capturarVisor(escritorio, 'visor')
}
await escritorio.close()

const telefono = await abrirPagina({ width: 390, height: 780 })
for (const caso of EN_TELEFONO) {
  await capturar(telefono, caso)
  if (caso[0] === 'telefono-plaza-1889') await capturarVisor(telefono, 'telefono-visor')
}
await navegador.close()
