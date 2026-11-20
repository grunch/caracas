import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// «Caracas, edificio por edificio» (T71): la lista de edificios y la ciudad al lado, que vuela a cada uno.
test.use({ viewport: { width: 1000, height: 640 } })

test('la lista tiene los edificios modelados; al leer uno, la vitrina va a su año y vuela hasta él', async ({ page }) => {
  test.setTimeout(150000)
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  await page.goto('/edificios.html')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Caracas, edificio por edificio')
  await expect(page.getByRole('link', { name: 'Abrir el visor entero' })).toHaveAttribute('href', './')
  const secciones = await page.evaluate(() => window.lab.secciones)
  expect(secciones.length).toBeGreaterThanOrEqual(8)
  await expect(page.locator('#edificios li')).toHaveCount(secciones.length)
  // la página (sin el visor, que tiene su propio E2E de accesibilidad) no tiene violaciones de WCAG 2.2 AA
  const { violations } = await new AxeBuilder({ page }).exclude('#vitrina').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])

  // el visor embebido, en modo vitrina: sin botones ni buscador
  const visor = page.frameLocator('#vitrina')
  await page.waitForFunction(() => window.lab.visorListo === true, null, { timeout: 120000 })
  await expect(visor.locator('body')).toHaveClass(/vitrina/)
  await expect(visor.locator('#botones')).toBeHidden()

  // al bajar hasta el tercer edificio, la cámara del visor va hacia él
  const marco = page.frames().find((f) => f.url().includes('vitrina'))
  const tercero = secciones[2]
  await page.locator(`#edificios li[data-id="${tercero.id}"]`).scrollIntoViewIfNeeded()
  await expect(page.locator(`#edificios li[data-id="${tercero.id}"]`)).toHaveClass(/activo/)
  await expect.poll(() => marco.evaluate((id) => {
    const m = window.lab.marcasDelMapa.find((x) => x.id === id)
    return Math.hypot(window.lab.cam.goal.x - m.x, window.lab.cam.goal.z - m.z)
  }, tercero.id), { timeout: 20000 }).toBeLessThan(5)
  expect(errores).toEqual([])
})

// los márgenes del observador en % se resuelven contra el ANCHO (W3C): en una ventana apaisada la franja del
// medio quedaba vacía y, al bajar, el edificio activo no cambiaba
test('al bajar por la lista en una ventana apaisada, el edificio activo va cambiando', async ({ page }) => {
  await page.route(/\?vitrina/, (ruta) => ruta.fulfill({ body: '<!doctype html><title>vitrina</title>', contentType: 'text/html' }))
  await page.goto('/edificios.html')
  const secciones = await page.evaluate(() => window.lab.secciones)
  for (const s of secciones.slice(1, 5)) {
    // el edificio, en el medio de la ventana (como al leerlo)
    await page.evaluate((id) => document.querySelector(`#edificios li[data-id="${id}"]`).scrollIntoView({ block: 'center' }), s.id)
    await expect(page.locator(`#edificios li[data-id="${s.id}"]`)).toHaveClass(/activo/)
  }
})

// el visor puede avisar «lista» antes de que llegue datos/crece.json: la época pedida no se pierde
test('la época pedida antes de que cargue la línea de tiempo se aplica cuando llega', async ({ page }) => {
  test.setTimeout(150000)
  const AÑOS = [1578, 1772, 1843, 1889, 1911, 1936]
  const epocas = AÑOS.map((año) => ({ año, plano: `${año}-prueba`, titulo: `Plano de prueba de ${año}`, corto: `plano de ${año}`, casas: 1 }))
  let soltar
  const suelta = new Promise((ok) => { soltar = ok })
  await page.route('**/datos/crece.json', async (ruta) => { await suelta; await ruta.fulfill({ json: { celda_m: 8, epocas } }) })
  await page.route(/\/plano\/(crece\.png|epocas\.json)$/, (ruta) => ruta.abort())
  await page.goto('/edificios.html')
  const secciones = await page.evaluate(() => window.lab.secciones)
  await page.waitForFunction(() => window.lab.visorListo === true, null, { timeout: 120000 })
  // un edificio de una época que no es la del arranque (1772)
  const otro = secciones.find((s) => s.epoca !== 1)
  await page.evaluate((id) => document.querySelector(`#edificios li[data-id="${id}"]`).scrollIntoView({ block: 'center' }), otro.id)
  await expect(page.locator(`#edificios li[data-id="${otro.id}"]`)).toHaveClass(/activo/)
  const marco = page.frames().find((f) => f.url().includes('vitrina'))
  expect(await marco.evaluate(() => window.lab.lineaDeTiempo)).toBeNull()
  soltar()
  await expect.poll(() => marco.evaluate(() => window.lab.lineaDeTiempo?.actual ?? null), { timeout: 20000 }).toBe(otro.epoca)
})

// postMessage no guarda mensajes: si el «lista» del visor llega antes de que edificios.js escuche, la página
// pregunta al instalar su oyente y el visor contesta
test('si el visor avisa «lista» antes de que la página escuche, la página igual se entera', async ({ page }) => {
  test.setTimeout(150000)
  let soltar
  const suelta = new Promise((ok) => { soltar = ok })
  await page.route('**/src/edificios.js*', async (ruta) => { await suelta; await ruta.continue() })
  await page.goto('/edificios.html', { waitUntil: 'commit' })
  // el visor arranca y avisa mientras el módulo de la página sigue retenido
  await expect.poll(async () => {
    const marco = page.frames().find((f) => f.url().includes('vitrina'))
    return marco ? marco.evaluate(() => window.lab?.ready === true).catch(() => false) : false
  }, { timeout: 120000 }).toBe(true)
  soltar()
  await page.waitForFunction(() => window.lab?.visorListo === true, null, { timeout: 20000 })
})
