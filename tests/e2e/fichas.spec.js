import { test, expect } from '@playwright/test'
import { hayDato } from './datos.js'

// Las fichas cuelgan de las marcas, que no dependen de los datos pesados: corren igual sobre la ciudad de
// demostración de CI. Las fotos se sirven de mentira (un manifiesto y una imagen de un píxel) salvo en el
// último test, que usa las de verdad si están (public/datos/fotos.json, tools/fotos.mjs).
test.use({ viewport: { width: 1100, height: 720 } })

const COMMONS = 'https://commons.wikimedia.org/wiki/File:'
const foto = (id, titulo, autor, fecha, año, epocas, marcas) => ({
  id, titulo, autor, fecha, año, licencia: 'Dominio público', fuente: `${COMMONS}${id}.jpg`, institucion: 'Archivo de prueba',
  epocas, marcas, w: 1600, h: 1000, mw: 640, mh: 400,
})
const FOTOS = [
  foto('mercado', 'El mercado en la plaza mayor.', 'Camille Pissarro', '1852–1854', 1853, [2], ['plaza-bolivar']),
  foto('estatua', 'La plaza con la estatua.', 'Autor desconocido', 'hacia 1880', 1880, [3], ['plaza-bolivar', 'catedral']),
  foto('damero', 'La plaza con el piso en damero.', 'Autor desconocido', '1910', 1910, [4, 5], ['plaza-bolivar']),
]
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

// Las fichas no necesitan la ciudad ni el plano: sin ellos (como si no hubiera datos pesados) la página carga
// en un instante también donde sí están, y el render por software no se pasa de tiempo.
const PESADOS = /\/(datos\/(ciudad\.pak|arboles\.bin|relieve\.bin)|plano\/[^?]*\.(webp|png))(\?.*)?$/

/** Sin línea de tiempo (la época se fija con los uniforms, como en marcas.spec.js) ni datos pesados. */
async function sinDatos(page) {
  await page.route('**/datos/crece.json', (ruta) => ruta.fulfill({ status: 404 }))
  await page.route(PESADOS, (ruta) => ruta.fulfill({ status: 404 }))
}

/** `fotos`: null = sin manifiesto (como la demo de CI); una lista = ese manifiesto, con imágenes de un píxel. */
async function listo(page, fotos = null) {
  await sinDatos(page)
  await page.route('**/datos/fotos.json', (ruta) => (fotos ? ruta.fulfill({ json: { fotos } }) : ruta.fulfill({ status: 404 })))
  await page.route(/\/fotos\/.*\.webp$/, (ruta) => ruta.fulfill({ contentType: 'image/png', body: PIXEL }))
  await page.goto('/?sinintro&capture')
  await page.waitForFunction(() => window.lab?.ready === true)
  if (fotos) await page.waitForFunction((n) => window.lab.fichas.fotos.length === n, fotos.length)
}

async function ver(page, epoca, vista = { x: 0, z: 40, dist: 800, yaw: 0, pitch: 0.9 }) {
  await page.evaluate(({ epoca, vista }) => {
    const { ciudad: { U }, cam, pedirCuadro } = window.lab
    U.uEpocaDe.value = U.uEpocaA.value = epoca
    U.uOlaEpoca.value = 9000
    if (vista) cam.jump(vista)
    window.__cuadro = false
    requestAnimationFrame(() => { pedirCuadro(3); requestAnimationFrame(() => requestAnimationFrame(() => { window.__cuadro = true })) })
  }, { epoca, vista })
  await page.waitForFunction(() => window.__cuadro === true)
}
const cartel = (page, nombre) => page.locator('#marcas .marca.ver .tag', { hasText: nombre })

test('tocar una marca abre su ficha: nombre, época, texto y fuente; sin fotos, lo dice', async ({ page }) => {
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  await listo(page)
  await ver(page, 5)
  await expect(page.locator('#ficha')).toBeHidden()

  await cartel(page, 'Plaza Bolívar').click()
  const panel = page.getByRole('dialog', { name: 'Plaza Bolívar' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'Plaza Bolívar' })).toBeFocused()
  await expect(panel.locator('.era')).toHaveText('Hacia 1936')
  await expect(panel.locator('.nombres li')).toHaveText(['1772–1843Plaza Mayor', 'desde 1889Plaza Bolívar'])
  await expect(panel.locator('.nombres li.rige')).toHaveText(/Plaza Bolívar/)
  await expect(panel.locator('.texto p.epoca.rige')).toContainText('damero')
  await expect(panel.locator('.sinfoto')).toHaveText('Sin imagen de época confiable de este lugar.')
  await expect(panel.locator('.fuente')).toContainText('plano DCN de 1936')
  await expect(panel.locator('figure')).toHaveCount(0)
  await expect(page.locator('body')).toHaveClass(/ficha/)
  expect(await page.evaluate(() => window.lab.fichas.abierta)).toBe('plaza-bolivar')
  expect(errores).toEqual([])
})

test('con la ficha abierta, al cambiar la época cambian el nombre y el texto que rige', async ({ page }) => {
  await listo(page)
  await ver(page, 5)
  await cartel(page, 'Plaza Bolívar').click()
  const panel = page.locator('#ficha')
  await expect(panel.locator('h2')).toHaveText('Plaza Bolívar')

  await ver(page, 1, null)
  await expect(panel.locator('h2')).toHaveText('Plaza Mayor')
  await expect(panel.locator('.era')).toHaveText('Hacia 1772')
  await expect(panel.locator('.texto p.epoca.rige')).toContainText('mercado')
  await expect(panel.locator('.nombres li.rige')).toHaveText(/Plaza Mayor/)
  expect(await page.evaluate(() => window.lab.fichas.epoca)).toBe(1)
})

test('un lugar que todavía no existe en la época elegida lo dice', async ({ page }) => {
  await listo(page)
  await ver(page, 5)
  await page.evaluate(() => window.lab.fichas.abrir('justicia'))
  await ver(page, 1, null)
  await expect(page.locator('#ficha h2')).toHaveText('Palacio de Justicia')
  await expect(page.locator('#ficha .era')).toHaveText('Todavía no figura en 1772: aparece en 1936')
})

test('Escape cierra la ficha, cierra el cartel y devuelve el foco a la marca; la × también la cierra', async ({ page }) => {
  await listo(page)
  await ver(page, 5)
  const plaza = cartel(page, 'Plaza Bolívar')
  await plaza.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#ficha')).toBeVisible()
  await expect(page.locator('#ficha h2')).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(page.locator('#ficha')).toBeHidden()
  await expect(plaza).toBeFocused()
  await expect(page.locator('body')).not.toHaveClass(/ficha/)
  expect(await page.evaluate(() => [window.lab.fichas.abierta, window.lab.marcas.abierta])).toEqual([null, null])

  await plaza.click()
  await expect(page.locator('#ficha')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar la ficha' }).click()
  await expect(page.locator('#ficha')).toBeHidden()
  // tocar otra marca cambia la ficha; tocar de nuevo la misma, la cierra
  await cartel(page, 'Capitolio').click()
  await expect(page.locator('#ficha h2')).toHaveText('Capitolio')
  await cartel(page, 'Capitolio').click()
  await expect(page.locator('#ficha')).toBeHidden()
})

test('las fotos llevan autor, fecha, licencia y fuente, con medidas y carga diferida; las de la época van primero', async ({ page }) => {
  await listo(page, FOTOS)
  await ver(page, 3)
  await cartel(page, 'Plaza Bolívar').click()
  const figuras = page.locator('#ficha figure')
  await expect(figuras).toHaveCount(3)
  // en 1889 la de la época es la de la estatua
  await expect(figuras.first().locator('figcaption')).toContainText('La plaza con la estatua.')
  await expect(figuras.first().locator('figcaption')).toContainText('Autor desconocido, hacia 1880.')
  await expect(figuras.first().locator('figcaption')).toContainText('Dominio público')
  await expect(figuras.first().locator('.de-epoca')).toHaveText('de esta época')
  await expect(page.locator('#ficha .de-epoca')).toHaveCount(1)
  await expect(figuras.first().getByRole('link', { name: /Wikimedia Commons/ })).toHaveAttribute('href', `${COMMONS}estatua.jpg`)
  const atributos = await page.locator('#ficha figure img').evaluateAll((imgs) => imgs.map((i) => [i.getAttribute('loading'), i.getAttribute('width'), i.getAttribute('height'), i.getAttribute('src'), i.alt]))
  expect(atributos[0]).toEqual(['lazy', '640', '400', 'fotos/m/estatua.webp', 'La plaza con la estatua.'])
  expect(atributos.every(([carga, w, h]) => carga === 'lazy' && Number(w) > 0 && Number(h) > 0)).toBe(true)

  // en 1936, la del damero
  await ver(page, 5, null)
  await expect(figuras.first().locator('figcaption')).toContainText('damero')
  // en 1772 no hay ninguna de esa época: se avisa y van todas, en orden
  await ver(page, 1, null)
  await expect(page.locator('#ficha .aviso')).toHaveText(/No hay imagen de esta época/)
  await expect(page.locator('#ficha .de-epoca')).toHaveCount(0)
  await expect(figuras.first().locator('figcaption')).toContainText('mercado')
})

test('el visor de fotos: imagen grande con su crédito, flechas y Escape', async ({ page }) => {
  await listo(page, FOTOS)
  await ver(page, 3)
  await cartel(page, 'Plaza Bolívar').click()
  const miniatura = page.getByRole('button', { name: 'Agrandar la imagen: La plaza con la estatua.' })
  await miniatura.click()

  const visor = page.getByRole('dialog', { name: 'Foto ampliada' })
  await expect(visor).toBeVisible()
  await expect(visor.locator('img')).toHaveAttribute('src', 'fotos/estatua.webp')
  await expect(visor.locator('img')).toHaveAttribute('width', '1600')
  await expect(visor.locator('.pie')).toContainText('1 de 3')
  await expect(visor.locator('.pie')).toContainText('La plaza con la estatua. Autor desconocido, hacia 1880.')
  await expect(visor.locator('.pie')).toContainText('Dominio público · Archivo de prueba')
  await expect(visor.getByRole('link', { name: 'Ver en Wikimedia Commons ↗' })).toHaveAttribute('href', `${COMMONS}estatua.jpg`)
  await expect(visor.getByRole('button', { name: 'Cerrar la foto' })).toBeFocused()

  await page.keyboard.press('ArrowRight')
  await expect(visor.locator('.pie')).toContainText('2 de 3')
  await expect(visor.locator('img')).toHaveAttribute('src', 'fotos/mercado.webp')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(visor.locator('.pie')).toContainText('3 de 3')
  await visor.getByRole('button', { name: 'Foto siguiente' }).click()
  await expect(visor.locator('.pie')).toContainText('1 de 3')
  // Tab no sale del visor
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.getElementById('visor').contains(document.activeElement))).toBe(true)

  // Escape cierra primero el visor (el foco vuelve a la miniatura) y después la ficha
  await page.keyboard.press('Escape')
  await expect(visor).toBeHidden()
  await expect(page.locator('#ficha')).toBeVisible()
  await expect(miniatura).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('#ficha')).toBeHidden()
})

test('una marca sin fotos en el manifiesto muestra solo texto; una fila sin crédito completo no se muestra', async ({ page }) => {
  const { autor, ...sinAutor } = FOTOS[0]
  await sinDatos(page)
  await page.route('**/datos/fotos.json', (ruta) => ruta.fulfill({ json: { fotos: [sinAutor, FOTOS[1]] } }))
  await page.route(/\/fotos\/.*\.webp$/, (ruta) => ruta.fulfill({ contentType: 'image/png', body: PIXEL }))
  await page.goto('/?sinintro&capture')
  await page.waitForFunction(() => window.lab?.ready === true && window.lab.fichas.fotos.length === 1)
  await ver(page, 5)
  await cartel(page, 'Plaza Bolívar').click()
  await expect(page.locator('#ficha figure')).toHaveCount(1)
  await cartel(page, 'Capitolio').click()
  await expect(page.locator('#ficha h2')).toHaveText('Capitolio')
  await expect(page.locator('#ficha figure')).toHaveCount(0)
  await expect(page.locator('#ficha .sinfoto')).toBeVisible()
})

test.describe('en un teléfono', () => {
  test.use({ viewport: { width: 390, height: 780 } })

  test('la ficha es una hoja desde abajo, a todo el ancho, y no se sale de la pantalla', async ({ page }) => {
    await listo(page, FOTOS)
    await ver(page, 5, { x: 0, z: 40, dist: 700, yaw: 0, pitch: 0.9 })
    await cartel(page, 'Plaza Bolívar').click()
    const panel = page.locator('#ficha')
    await expect(panel).toBeVisible()
    await expect(panel).toHaveCSS('opacity', '1')
    const caja = await panel.boundingBox()
    expect(caja.x).toBeGreaterThanOrEqual(0)
    expect(caja.x + caja.width).toBeLessThanOrEqual(390)
    expect(caja.width).toBeGreaterThan(340)
    expect(caja.y).toBeGreaterThan(780 * 0.4)
    expect(caja.y + caja.height).toBeLessThanOrEqual(780)
    await expect(page.locator('#botones')).toBeHidden()
    await page.getByRole('button', { name: 'Cerrar la ficha' }).click()
    await expect(page.locator('#botones')).toBeVisible()
  })
})

test('con las fotos de verdad: la Plaza Bolívar tiene fotos acreditadas que cargan', async ({ page }) => {
  await sinDatos(page)
  await page.goto('/?sinintro&capture')
  await page.waitForFunction(() => window.lab?.ready === true)
  test.skip(!(await hayDato(page, 'datos/fotos.json', 'json')), 'sin public/datos/fotos.json (se genera con node tools/fotos.mjs)')
  await page.waitForFunction(() => window.lab.fichas.fotos.length > 0)
  const fotos = await page.evaluate(() => window.lab.fichas.fotos)
  for (const f of fotos) {
    expect(f.autor, f.id).toBeTruthy()
    expect(f.fecha, f.id).toBeTruthy()
    expect(f.licencia, f.id).toMatch(/^(Dominio público|CC0|CC BY)/)
    expect(f.fuente, f.id).toMatch(/^https:\/\//)
  }
  await ver(page, 3)
  await cartel(page, 'Plaza Bolívar').click()
  const figuras = page.locator('#ficha figure')
  expect(await figuras.count()).toBeGreaterThan(0)
  await expect(figuras.first().locator('figcaption .lic a')).toHaveAttribute('href', /^https:\/\//)
  // la miniatura principal carga, y también la grande del visor
  await expect.poll(() => figuras.first().locator('img').evaluate((i) => i.complete && i.naturalWidth > 100), { timeout: 30_000 }).toBe(true)
  await figuras.first().locator('button').click()
  await expect.poll(() => page.locator('#visor img').evaluate((i) => i.complete && i.naturalWidth > 100), { timeout: 30_000 }).toBe(true)
  // y cada archivo del manifiesto está servido, grande y miniatura
  for (const f of fotos) {
    expect(await hayDato(page, `fotos/${f.id}.webp`, 'image/webp'), f.id).toBe(true)
    expect(await hayDato(page, `fotos/m/${f.id}.webp`, 'image/webp'), `m/${f.id}`).toBe(true)
  }
})
