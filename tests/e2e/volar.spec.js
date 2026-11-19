import { test, expect } from '@playwright/test'

// En avión (T61): despega, vuela solo, muestra la altura y aterriza con Esc en la vista de antes.
test.use({ viewport: { width: 900, height: 560 } })

test('«Volar» despega con el avión a la vista; vuela solo, gira con D y Esc aterriza', async ({ page }) => {
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  await page.goto('/?sinintro&sombras=0&contorno=0&grano=0')
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 9000 })
  // la vista del mapa (sin goal.y: al despegar se levanta la ciudad y cambia la altura del suelo bajo la cámara)
  const vista = () => page.evaluate(() => { const { x, z, dist, yaw, pitch } = window.lab.cam.goal; return { x, z, dist, yaw, pitch } })
  const mapa = await vista()

  await page.locator('#volar').click()
  await expect(page.locator('body')).toHaveClass(/modo-volar/)
  await expect(page.locator('#volar')).toHaveText('Volver al mapa')
  await expect(page.locator('#caminar')).toBeHidden()
  await expect(page.locator('#modo .titulo')).toHaveText(/^En avión · \d+ m sobre el suelo$/)
  expect(await page.evaluate(() => window.lab.enAvion.avion.visible)).toBe(true)

  const antes = await page.evaluate(() => window.lab.enAvion.estado)
  await expect.poll(() => page.evaluate(() => window.lab.enAvion.estado.z), { timeout: 20000 }).toBeLessThan(antes.z - 1)
  await page.keyboard.down('KeyD')
  await expect.poll(() => page.evaluate(() => window.lab.enAvion.estado.rumbo), { timeout: 20000 }).toBeGreaterThan(antes.rumbo)
  await page.keyboard.up('KeyD')

  await page.keyboard.press('Escape')
  await expect(page.locator('body')).not.toHaveClass(/modo-volar/)
  expect(await page.evaluate(() => window.lab.enAvion.avion.visible)).toBe(false)
  expect(await vista()).toEqual(mapa)
  expect(errores).toEqual([])
})
