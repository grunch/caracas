// Vistas de control del buscador (no es un test):
//   node tests/e2e/capturas-buscador.mjs [url] [carpeta]
// La caja vacía, las sugerencias, "De La Torre a Veroes" en 1772 y en 1936, una dirección de hoy, una que
// queda fuera del plano, una que no existe, un error de red y el teléfono. Nominatim va simulado: de acá no
// sale ningún pedido. Usa la GPU del equipo y necesita los datos reales (public/datos, public/plano).
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'test-results/capturas-buscador'
const NOMINATIM = 'https://nominatim.openstreetmap.org/**'
const RESPUESTAS = {
  'Avenida Urdaneta': [{ lat: '10.5074', lon: '-66.9128', name: 'Avenida Urdaneta', display_name: 'Avenida Urdaneta, Parroquia Altagracia, Caracas, Venezuela' }],
  'Plaza Venezuela': [{ lat: '10.4969', lon: '-66.8853', name: 'Plaza Venezuela', display_name: 'Plaza Venezuela, El Recreo, Caracas, Venezuela' }],
  Petare: [{ lat: '10.4767', lon: '-66.8078', name: 'Petare', display_name: 'Petare, Municipio Sucre, Miranda, Venezuela' }],
}

mkdirSync(carpeta, { recursive: true })
const navegador = await chromium.launch({ args: ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'] })

async function abrir(viewport, extra = {}) {
  const contexto = await navegador.newContext({ viewport, ...extra })
  const pagina = await contexto.newPage()
  pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
  await pagina.route(NOMINATIM, (ruta) => {
    const q = new URL(ruta.request().url()).searchParams.get('q')
    if (q === 'sin red') return ruta.abort('internetdisconnected')
    return ruta.fulfill({ contentType: 'application/json', body: JSON.stringify(RESPUESTAS[q] ?? []) })
  })
  await pagina.goto(`${url}?sinintro`)
  await pagina.waitForFunction(() => window.lab?.ready && window.lab.relieve && window.lab.lineaDeTiempo && window.lab.arboles, null, { timeout: 120000 })
  await pagina.evaluate(() => window.lab.buscador.listo)
  await pagina.evaluate(() => { window.lab.levantar(true); window.lab.alternarColor(true) })
  await pagina.waitForTimeout(7000) // la ola y las texturas del color
  return pagina
}

const quieta = (pagina) => pagina.waitForFunction(() => {
  const { cam } = window.lab
  return Math.abs(cam.goal.dist - cam.now.dist) < 1 && Math.abs(cam.goal.x - cam.now.x) < 0.5 && Math.abs(cam.goal.z - cam.now.z) < 0.5
}, null, { timeout: 30000 })
const foto = async (pagina, nombre) => {
  await quieta(pagina)
  await pagina.waitForTimeout(2500) // teselas finas, sombras y la ola de la época
  await pagina.screenshot({ path: `${carpeta}/${nombre}.png` })
  console.log(nombre, '·', await pagina.evaluate(() => {
    const r = window.lab.buscador.resultado
    const aviso = document.getElementById('buscar-aviso')
    return r ? `${r.titulo}: ${r.texto}` : aviso.hidden ? '(nada)' : aviso.textContent
  }))
}
const epoca = (pagina, año) => pagina.locator('#epocas button', { hasText: String(año) }).click()
const buscar = async (pagina, texto) => {
  await pagina.locator('#buscar input').fill(texto)
  await pagina.locator('#buscar input').press('Enter')
  await pagina.waitForFunction(() => {
    const aviso = document.getElementById('buscar-aviso')
    return window.lab.buscador.resultado || (!aviso.hidden && !aviso.textContent.startsWith('Buscando'))
  })
}

const pagina = await abrir({ width: 1440, height: 900 })
await pagina.evaluate(() => window.lab.cam.jump({ x: 0, z: 0, dist: 1500, yaw: 0, pitch: 0.9 }))
await foto(pagina, '1-vacio')
await pagina.locator('#buscar input').click()
await pagina.locator('#buscar input').pressSequentially('la to', { delay: 30 })
await pagina.keyboard.press('ArrowDown')
await foto(pagina, '2-sugerencias')
await pagina.locator('#buscar input').fill('')
await pagina.locator('#buscar input').pressSequentially('de la torre a ', { delay: 30 })
await foto(pagina, '3-sugerencias-cuadras')
await epoca(pagina, 1772)
await buscar(pagina, 'De La Torre a Veroes')
await foto(pagina, '4-la-torre-a-veroes-1772')
await epoca(pagina, 1936)
await foto(pagina, '5-la-torre-a-veroes-1936')
await buscar(pagina, 'Esquina de Gradillas')
await foto(pagina, '6-esquina-gradillas-1936')
await buscar(pagina, 'De La Torre a Sociedad')
await foto(pagina, '7-no-vecinas')
await buscar(pagina, 'Avenida Urdaneta')
await foto(pagina, '8-moderna-urdaneta-1936')
await epoca(pagina, 1772)
await buscar(pagina, 'Plaza Venezuela')
await foto(pagina, '9-moderna-plaza-venezuela-1772')
await buscar(pagina, 'Petare')
await foto(pagina, '10-fuera-del-plano')
await buscar(pagina, 'De La Torre a Xanadú')
await foto(pagina, '11-no-encontrado')
await buscar(pagina, 'sin red')
await foto(pagina, '12-sin-red')
await pagina.context().close()

const telefono = await abrir({ width: 390, height: 780 }, { hasTouch: true, deviceScaleFactor: 2 }) // sin isMobile: con él, la captura del canvas sale en blanco
await foto(telefono, '13-telefono-vacio')
await telefono.locator('#buscar input').tap()
await telefono.locator('#buscar input').pressSequentially('gradi', { delay: 30 })
await foto(telefono, '14-telefono-sugerencias')
await buscar(telefono, 'De La Torre a Veroes')
await foto(telefono, '15-telefono-la-torre-a-veroes')
await buscar(telefono, 'Avenida Urdaneta')
await foto(telefono, '16-telefono-moderna')
await buscar(telefono, 'zzzz')
await foto(telefono, '17-telefono-no-encontrado')
await navegador.close()
