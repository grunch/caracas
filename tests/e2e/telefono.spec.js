import { test, expect } from '@playwright/test'

// El teléfono (T70): pantalla táctil, sin la bienvenida y sin lo que más cuesta dibujar por software.
const LIVIANO = '/?sinintro&sombras=0&contorno=0&grano=0'
test.use({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true })

async function quieta(page) {
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 9000 })
}

/** Dos dedos de verdad (eventos táctiles de Chromium por CDP): de `desde` a `hasta`, en pasos. Los dedos
 * se apoyan sobre la vista, no sobre un nombre ni un botón. */
async function dosDedos(page, desde, hasta, pasos = 6) {
  for (const d of desde) expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, d)).toBe('CANVAS')
  const cdp = await page.context().newCDPSession(page)
  const punto = (t) => desde.map((d, i) => ({ id: i + 1, x: d.x + (hasta[i].x - d.x) * t, y: d.y + (hasta[i].y - d.y) * t }))
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: punto(0) })
  for (let k = 1; k <= pasos; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: punto(k / pasos) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

test('acostado, el buscador y los botones caben sin pisarse; separar dos dedos acerca y girarlos gira', async ({ page }) => {
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  await page.goto(LIVIANO)
  await quieta(page)

  // los paneles: la caja arriba a la izquierda, los botones abajo, sin encimarse
  const caja = await page.locator('#buscar').boundingBox()
  const botones = await page.locator('#botones').boundingBox()
  expect(caja.y + caja.height).toBeLessThan(botones.y)
  expect(caja.width).toBeLessThan(740 * 0.45)

  // pellizcar hacia afuera: la cámara se acerca
  const lejos = await page.evaluate(() => window.lab.cam.goal.dist)
  await dosDedos(page, [{ x: 180, y: 240 }, { x: 220, y: 240 }], [{ x: 120, y: 240 }, { x: 280, y: 240 }])
  expect(await page.evaluate(() => window.lab.cam.goal.dist)).toBeLessThan(lejos * 0.6)

  // girar los dedos en el sentido del reloj: la vista gira
  const yaw = await page.evaluate(() => window.lab.cam.goal.yaw)
  await dosDedos(page, [{ x: 160, y: 240 }, { x: 240, y: 240 }], [{ x: 172, y: 212 }, { x: 228, y: 268 }])
  expect(await page.evaluate(() => window.lab.cam.goal.yaw)).toBeGreaterThan(yaw + 0.3)
  expect(errores).toEqual([])
})

test('de pie, en un teléfono angosto, los años y los botones quedan dentro de la pantalla', async ({ page }) => {
  await page.setViewportSize({ width: 340, height: 640 })
  await page.goto(LIVIANO)
  await quieta(page)
  for (const id of ['#buscar', '#botones']) {
    const caja = await page.locator(id).boundingBox()
    expect(caja.x, id).toBeGreaterThanOrEqual(0)
    expect(caja.x + caja.width, id).toBeLessThanOrEqual(340)
  }
  // cada botón es un blanco de al menos 44 px de alto
  for (const alto of await page.locator('#botones .panel:visible').evaluateAll((bs) => bs.map((b) => b.getBoundingClientRect().height))) {
    expect(alto).toBeGreaterThanOrEqual(44)
  }
})
