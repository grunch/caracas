import { test, expect } from '@playwright/test'

// La entrada (src/arranque.js), como la de baires: la hoja desde arriba se pone en color, la ciudad se levanta
// y la cámara baja volando al centro. Los demás E2E empiezan quietos (?sinintro o ?capture).
test.use({ viewport: { width: 900, height: 560 } })
const LIGERO = 'sombras=0&contorno=0&grano=0'

test('sin bienvenida: se pone en color, la ciudad se levanta y la cámara vuela al centro', async ({ page }) => {
  // Arrange: la bienvenida ya se vio
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  await page.addInitScript(() => localStorage.setItem('caracas:intro-vista', '1'))

  // Act
  await page.goto(`/?${LIGERO}`)
  await page.waitForFunction(() => window.lab?.ready === true)

  // Assert: arranca desde arriba y en color
  expect(await page.evaluate(() => window.lab.cam.goal.pitch)).toBeGreaterThan(1.4)
  await expect.poll(() => page.evaluate(() => window.lab.ciudad.U.uColor.value), { timeout: 60000 }).toBe(1)
  await expect(page.locator('#color')).toHaveAttribute('aria-pressed', 'true')
  // …la ciudad se levanta y la cámara llega inclinada, cerca de la plaza
  await expect.poll(() => page.evaluate(() => window.lab.ciudad.U.uOla.value), { timeout: 60000 }).toBeGreaterThan(0)
  await expect(page.locator('#alzar')).toHaveText('Acostar la ciudad')
  await expect.poll(() => page.evaluate(() => window.lab.cam.volando), { timeout: 60000 }).toBe(false)
  const vista = await page.evaluate(() => ({ ...window.lab.cam.goal }))
  expect(vista.pitch).toBeLessThan(0.8)
  expect(Math.hypot(vista.x, vista.z)).toBeLessThan(600)
  expect(errores).toEqual([])
})

test('con la bienvenida abierta, la ciudad espera a que se cierre para levantarse', async ({ page }) => {
  await page.goto(`/?intro&${LIGERO}`)
  await page.waitForFunction(() => window.lab?.ready === true && window.lab.acerca.intro)
  await page.waitForTimeout(3000)
  expect(await page.evaluate(() => window.lab.ciudad.U.uOla.value)).toBe(0)

  await page.keyboard.press('Escape')
  await expect.poll(() => page.evaluate(() => window.lab.ciudad.U.uOla.value), { timeout: 60000 }).toBeGreaterThan(0)
})

test('?quieto empieza quieto: en tinta, acostada y sin vuelo', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('caracas:intro-vista', '1'))
  await page.goto(`/?quieto&${LIGERO}`)
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.waitForTimeout(3000)
  const estado = await page.evaluate(() => ({ ola: window.lab.ciudad.U.uOla.value, color: window.lab.ciudad.U.uColor.value, volando: window.lab.cam.volando }))
  expect(estado).toEqual({ ola: 0, color: 0, volando: false })
})
