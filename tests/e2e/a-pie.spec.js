import { test, expect } from '@playwright/test'

// A pie (T60): baja a la calle, camina con el teclado, no tapa los años y vuelve al mapa con Esc.
test.use({ viewport: { width: 900, height: 560 } })

test('«Caminar» baja a la calle; W camina, las flechas no mueven el mapa y Esc vuelve a la vista de antes', async ({ page }) => {
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  await page.goto('/?sinintro&sombras=0&contorno=0&grano=0')
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 9000 })
  const boton = page.locator('#caminar')
  await expect(boton).toBeVisible()
  // las casas llegan después de ready: el botón entra cuando están
  await expect.poll(async () => { await boton.click(); return page.evaluate(() => window.lab.aPie.activo) }, { timeout: 60000 }).toBe(true)

  await expect(page.locator('body')).toHaveClass(/modo-caminar/)
  await expect(boton).toHaveText('Volver al mapa')
  await expect(page.locator('#modo')).toBeVisible()
  await expect(page.locator('#buscar')).toBeHidden()
  expect(await page.evaluate(() => window.lab.camera.near)).toBeLessThan(1)

  // el cartel del modo no se encima con los años
  const cartel = await page.locator('#modo').boundingBox()
  const años = await page.locator('#epocas').boundingBox()
  if (años) expect(cartel.y + cartel.height <= años.y || años.y + años.height <= cartel.y || cartel.x + cartel.width <= años.x).toBe(true)

  const mapa = await page.evaluate(() => ({ ...window.lab.cam.goal }))
  const antes = await page.evaluate(() => window.lab.aPie.estado)
  await page.keyboard.down('KeyW')
  await expect.poll(() => page.evaluate(() => window.lab.aPie.estado.z), { timeout: 20000 }).not.toBe(antes.z)
  await page.keyboard.up('KeyW')
  await page.keyboard.press('ArrowRight')
  expect(await page.evaluate(() => ({ ...window.lab.cam.goal }))).toEqual(mapa) // el mapa no se movió

  await page.keyboard.press('Escape')
  await expect(page.locator('body')).not.toHaveClass(/modo-caminar/)
  await expect(boton).toHaveText('Caminar')
  expect(await page.evaluate(() => window.lab.camera.near)).toBe(5)
  expect(errores).toEqual([])
})
