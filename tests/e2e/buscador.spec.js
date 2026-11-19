import { test, expect as esperarBase } from '@playwright/test'
import { hayDato } from './datos.js'

// El diccionario de esquinas está en git (tools/geo/esquinas): estos tests corren también sobre la ciudad de
// demostración de CI. Lo que depende de los datos pesados (las épocas) se salta si no están. Nominatim va
// siempre simulado: de acá no sale ningún pedido a la red.
//
// Una sola página para todo el archivo, en serie: con los datos reales y el render por software, cargar el
// visor cuesta mucho más que todo lo que se le hace después.
test.describe.configure({ mode: 'serial', timeout: 240_000 })
const expect = esperarBase.configure({ timeout: 20_000 })
const NOMINATIM = 'https://nominatim.openstreetmap.org/**'
const URDANETA = { lat: '10.5074', lon: '-66.9128', name: 'Avenida Urdaneta', display_name: 'Avenida Urdaneta, Parroquia Altagracia, Caracas, Venezuela' }

let page
let pedidos = []
let responder = () => []

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000)
  // vista chica: cada cuadro cuesta menos; a este ancho la caja va arriba y los años debajo
  page = await browser.newPage({ viewport: { width: 640, height: 480 } })
  await page.route(NOMINATIM, (ruta) => {
    const url = new URL(ruta.request().url())
    pedidos.push(url)
    const r = responder(url.searchParams.get('q'))
    return r === null ? ruta.abort('internetdisconnected') : ruta.fulfill({ contentType: 'application/json', body: JSON.stringify(r) })
  })
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true, null, { timeout: 200_000 })
  await page.evaluate(() => window.lab.buscador.listo)
})

test.beforeEach(async () => {
  pedidos = []
  responder = () => []
  await page.emulateMedia({ reducedMotion: 'reduce' }) // la cámara salta: los tests no esperan vuelos (salvo el que lo prueba)
  await page.evaluate(() => { window.lab.buscador.limpiar(); document.activeElement?.blur() })
  await campo().fill('')
  await campo().blur()
})

test.afterAll(() => page?.close())

const campo = () => page.getByRole('combobox')
const cartel = () => page.locator('#hallazgo .cartel')
const aviso = () => page.locator('#buscar-aviso')
const buscar = async (texto) => {
  await campo().fill(texto)
  await campo().press('Enter')
}
/** A cuántos píxeles del centro de la vista está el alfiler. */
const alfilerAlCentro = async () => {
  const caja = await page.locator('#hallazgo .punto').boundingBox()
  const { width, height } = page.viewportSize()
  return caja ? Math.hypot(caja.x + caja.width / 2 - width / 2, caja.y + caja.height / 2 - height / 2) : Infinity
}

test('"De La Torre a Veroes" ubica la cuadra en el plano: cartel en prosa, alfiler y cámara', async () => {
  await buscar('De La Torre a Veroes')
  await expect(cartel()).toBeVisible()
  await expect(cartel().locator('.titulo')).toHaveText('De La Torre a Veroes')
  await expect(cartel().locator('.texto')).toContainText('La cuadra al norte de la Catedral. Va hacia el norte, unos 135 m.')
  await expect(cartel().locator('.fuente')).toBeHidden()
  // el punto medio de las dos esquinas del diccionario, en metros desde la plaza
  const { mundo, objetivo, esperado } = await page.evaluate(() => {
    const { buscador, cam, coords } = window.lab
    const px = (nombre) => buscador.indice.esquinas.find((e) => e.nombre === nombre).px
    const [a, b] = [px('La Torre'), px('Veroes')]
    return { mundo: buscador.resultado.mundo, objetivo: { x: cam.goal.x, z: cam.goal.z }, esperado: coords.aMundo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) }
  })
  expect(Math.hypot(mundo.x - esperado.x, mundo.z - esperado.z)).toBeLessThan(0.01)
  expect(Math.hypot(objetivo.x - esperado.x, objetivo.z - esperado.z)).toBeLessThan(0.01)
  expect(esperado.z).toBeLessThan(-50) // al norte de la plaza
  // el alfiler queda donde mira la cámara (en el centro de la vista), con el tramo de la cuadra
  await expect.poll(alfilerAlCentro).toBeLessThan(4)
  await expect(page.locator('#hallazgo .tramo')).toBeVisible()
  expect(pedidos).toHaveLength(0) // una cuadra del diccionario no sale a la red
})

test('la respuesta habla de la época elegida y cambia con ella', async () => {
  test.skip(!(await hayDato(page, 'datos/crece.json', 'json')) || !(await hayDato(page, 'plano/crece.png', 'image')), 'sin las épocas (datos pesados, fuera de git)')
  await page.waitForFunction(() => window.lab.lineaDeTiempo)
  await page.locator('#epocas button', { hasText: /^1772$/ }).click()
  await buscar('De La Torre a Veroes')
  await expect(cartel().locator('.texto')).toHaveText('La cuadra al norte de la Catedral. Va hacia el norte, unos 135 m. En 1772 ya estaba edificada.')
  await page.locator('#epocas button', { hasText: '1936' }).click()
  await expect(cartel().locator('.texto')).toContainText('En 1936 ya estaba edificada. Es ciudad desde el plano de 1772.')
  await page.locator('#epocas button', { hasText: /^1772$/ }).click()
})

test('las sugerencias se manejan con el teclado y Escape quita el alfiler', async () => {
  await page.keyboard.press('/')
  await expect(campo()).toBeFocused()
  await expect(campo()).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.type('la to')
  const lista = page.getByRole('listbox')
  const primera = lista.getByRole('option').first()
  await expect(lista).toBeVisible()
  await expect(campo()).toHaveAttribute('aria-expanded', 'true')
  await expect(primera).toContainText('La Torre')
  await expect(primera).toContainText('esquina, a media cuadra al noreste de la plaza')
  await page.keyboard.press('ArrowDown')
  await expect(primera).toHaveAttribute('aria-selected', 'true')
  await expect(campo()).toHaveAttribute('aria-activedescendant', await primera.getAttribute('id'))
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowUp')
  await expect(primera).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Enter')
  await expect(lista).toBeHidden()
  await expect(campo()).toHaveValue('La Torre')
  await expect(cartel().locator('.titulo')).toHaveText('Esquina de La Torre')
  await expect(cartel().locator('.texto')).toContainText('De aquí salen cuadras a')
  // la C y la H se escriben en la caja: no prenden el color ni lo de hoy
  await campo().fill('')
  await page.keyboard.type('ch')
  await expect(campo()).toHaveValue('ch')
  await expect(page.locator('#color')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('#hoy')).toHaveAttribute('aria-pressed', 'false')
  // Escape: primero cierra la lista; después quita el alfiler
  await campo().fill('la torre a')
  await expect(lista.getByRole('option')).toHaveCount(4)
  await page.keyboard.press('Escape')
  await expect(lista).toBeHidden()
  await expect(cartel()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(cartel()).toBeHidden()
  expect(await page.evaluate(() => window.lab.buscador.resultado)).toBeNull()
  expect(pedidos).toHaveLength(0) // escribir no consulta a Nominatim: solo al mandar a buscar
})

test('una dirección de hoy va a Nominatim (simulado) solo al mandarla, y se muestra con su atribución', async () => {
  responder = (q) => (q === 'Avenida Urdaneta' ? [URDANETA] : [])
  await campo().pressSequentially('Avenida Urdaneta')
  expect(pedidos).toHaveLength(0)
  await campo().press('Enter')
  await expect(cartel().locator('.titulo')).toHaveText('Avenida Urdaneta')
  await expect(page.locator('#hallazgo')).toHaveClass(/moderna/)
  await expect(cartel().locator('.texto')).toContainText(/Hoy queda en la (esquina|cuadra) de /)
  await expect(cartel().getByRole('link', { name: '© OpenStreetMap' })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
  expect(pedidos).toHaveLength(1)
  const q = pedidos[0].searchParams
  expect([...q.keys()].sort()).toEqual(['accept-language', 'bounded', 'countrycodes', 'format', 'limit', 'q', 'viewbox'])
  expect(q.get('format')).toBe('jsonv2')
  // el punto cae donde el calce dice: al noreste de la plaza, a pocas cuadras
  const { x, z } = await page.evaluate(() => window.lab.buscador.resultado.mundo)
  expect(x).toBeGreaterThan(100)
  expect(x).toBeLessThan(400)
  expect(z).toBeGreaterThan(-300)
  expect(z).toBeLessThan(-50)
  // la misma búsqueda otra vez no vuelve a salir a la red
  await campo().press('Enter')
  await expect(cartel()).toBeVisible()
  expect(pedidos).toHaveLength(1)
})

test('lo que no existe, lo que queda fuera del plano y la red caída se dicen con amabilidad', async () => {
  const petare = { lat: '10.4767', lon: '-66.8078', name: 'Petare', display_name: 'Petare, Municipio Sucre, Miranda, Venezuela' }
  responder = (q) => (q === 'Petare' ? [petare] : q === 'sin red' ? null : [])
  await buscar('De La Torre a Xanadú')
  await expect(aviso()).toContainText('No encontré «De La Torre a Xanadú». Conozco la esquina de La Torre, pero no «xanadu». Prueba con dos esquinas')
  await expect(cartel()).toBeHidden()
  await buscar('Petare')
  await expect(aviso()).toContainText('Queda fuera del plano de 1936: a 12,1 km al este de la Plaza Bolívar.')
  await expect(aviso().getByRole('link', { name: '© OpenStreetMap' })).toBeVisible()
  await expect(cartel()).toBeHidden()
  await buscar('sin red')
  await expect(aviso()).toContainText('No pude consultar las direcciones de hoy')
  // una esquina del plano se sigue encontrando sin red, y × lo borra todo
  await buscar('Esquina de Gradillas')
  await expect(aviso()).toBeHidden()
  await expect(cartel().locator('.titulo')).toHaveText('Esquina de Las Gradillas')
  await page.getByRole('button', { name: 'Borrar la búsqueda' }).click()
  await expect(cartel()).toBeHidden()
  await expect(campo()).toHaveValue('')
  await expect(campo()).toBeFocused()
})

test('una respuesta que llega tarde no pisa lo que se buscó después', async () => {
  responder = () => [URDANETA]
  // la respuesta de la primera búsqueda queda retenida hasta que se suelte
  let soltar
  const retenida = new Promise((ok) => { soltar = ok })
  await page.route(NOMINATIM, async (ruta) => { await retenida; await ruta.fallback() }, { times: 1 })
  await buscar('Avenida Urdaneta tardía')
  await expect(aviso()).toContainText('Buscando')
  await buscar('zz') // muy corta para Nominatim: se responde acá mismo
  await expect(aviso()).toContainText('No encontré «zz»')
  soltar()
  await page.waitForTimeout(1500)
  await expect(aviso()).toContainText('No encontré «zz»')
  await expect(cartel()).toBeHidden()
})

test('lo que responde Nominatim se escribe como texto, nunca como HTML', async () => {
  const malo = { ...URDANETA, name: '<img src=x onerror="window.pwned=1"><b>Urdaneta</b>' }
  responder = () => [{ ...URDANETA, lat: 'NaN" onload="x' }, malo]
  await buscar('Avenida maliciosa')
  await expect(cartel().locator('.titulo')).toHaveText('<img src=x onerror="window.pwned=1"><b>Urdaneta</b>')
  expect(await cartel().locator('img, b').count()).toBe(0)
  expect(await page.evaluate(() => window.pwned)).toBeUndefined()
})

test('la cámara llega volando (salvo que se pida menos movimiento) y el alfiler la espera en su sitio', async () => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => window.lab.cam.jump({ x: 0, z: 0, dist: 4000 }))
  // justo después de buscar, antes de que se dibuje otro cuadro: el objetivo ya está en la esquina y la cámara no
  const { now, goal } = await page.evaluate(async () => {
    await window.lab.buscador.buscar('Veroes')
    return { now: { ...window.lab.cam.now }, goal: { ...window.lab.cam.goal } }
  })
  await expect(cartel()).toBeVisible()
  expect(goal.dist).toBeLessThan(600)
  expect(now.dist).toBeGreaterThan(goal.dist + 1000)
  await page.waitForFunction(() => Math.abs(window.lab.cam.now.dist - window.lab.cam.goal.dist) < 1, null, { timeout: 60_000 })
  await expect.poll(alfilerAlCentro).toBeLessThan(4)
})

test('en pantalla angosta la caja no se sale ni pisa los años', async () => {
  const caja = await page.locator('#buscar').boundingBox()
  expect(caja.x).toBeGreaterThanOrEqual(0)
  expect(caja.x + caja.width).toBeLessThanOrEqual(640)
  const años = page.locator('#epocas')
  if (await años.isVisible()) expect((await años.boundingBox()).y).toBeGreaterThanOrEqual(caja.y + caja.height)
})
