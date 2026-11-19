import { test, expect } from '@playwright/test'

// Manejar (T62): sube al vehículo de la época, anda, cambia la vista y de vehículo, y se baja con Esc.
test.use({ viewport: { width: 900, height: 560 } })

test('«Manejar» sube al vehículo de la época; anda, V cambia la vista, N cambia de vehículo y Esc se baja', async ({ page }) => {
  test.setTimeout(150000) // espera a que lleguen las casas y maneja unos segundos: más que el límite de 90 s
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  await page.goto('/?sinintro&sombras=0&contorno=0&grano=0')
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 9000 })
  const boton = page.locator('#manejar')
  // las casas llegan después de ready: se sube cuando están
  await expect.poll(async () => { await boton.click(); return page.evaluate(() => window.lab.enCoche.activo) }, { timeout: 60000 }).toBe(true)

  await expect(page.locator('body')).toHaveClass(/modo-manejar/)
  await expect(boton).toHaveText('Volver al mapa')
  await expect(page.locator('#caminar')).toBeHidden()
  const vehiculo = await page.evaluate(() => window.lab.enCoche.vehiculo.nombre)
  await expect(page.locator('#modo .titulo')).toHaveText(new RegExp(`^${vehiculo} · \\d+ km/h$`))

  // anda: hacia adelante o, si arrancó contra una pared, marcha atrás
  const antes = await page.evaluate(() => window.lab.enCoche.estado)
  const movido = () => page.evaluate(({ x, z }) => { const e = window.lab.enCoche.estado; return Math.hypot(e.x - x, e.z - z) }, antes)
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(2500)
  await page.keyboard.up('KeyW')
  if (await movido() < 0.1) { await page.keyboard.down('KeyS'); await page.waitForTimeout(2500); await page.keyboard.up('KeyS') }
  expect(await movido()).toBeGreaterThan(0.1)

  await page.keyboard.press('KeyV')
  expect(await page.evaluate(() => window.lab.enCoche.vista)).toBe('cabina')
  await page.keyboard.press('KeyN')
  await page.keyboard.press('KeyB') // la bocina no rompe nada

  await page.keyboard.press('Escape')
  await expect(page.locator('body')).not.toHaveClass(/modo-manejar/)
  await expect(boton).toHaveText('Manejar')
  expect(await page.evaluate(() => window.lab.camera.near)).toBe(5)
  expect(errores).toEqual([])
})
