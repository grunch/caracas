import { test, expect } from '@playwright/test'
import { hayDato } from './datos.js'

test('el visor arranca y expone window.lab', async ({ page }) => {
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  await expect(page.locator('body')).toHaveClass(/listo/)
  expect(errores).toEqual([])
})

test('la ciudad se levanta con la ola y vuelve a acostarse', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  const boton = page.locator('#alzar')
  await expect(boton).toBeVisible()
  await boton.click()
  await expect(boton).toHaveText('Acostar la ciudad')
  await page.waitForFunction(() => window.lab.ciudad.U.uOla.value > 0)
  await page.keyboard.press('Space')
  await expect(boton).toHaveText('Levantar la ciudad')
})

test('la C alterna entre tinta y color', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  const boton = page.locator('#color')
  await page.keyboard.press('KeyC')
  await expect(boton).toHaveAttribute('aria-pressed', 'true')
  await page.waitForFunction(() => window.lab.ciudad.U.uColor.value === 1)
  await boton.click()
  await expect(boton).toHaveAttribute('aria-pressed', 'false')
  await page.waitForFunction(() => window.lab.ciudad.U.uColor.value === 0)
})

test('Espacio sobre un botón con foco activa ese botón, no levanta la ciudad', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.locator('#color').focus()
  await page.keyboard.press('Space')
  await expect(page.locator('#color')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#alzar')).toHaveText('Levantar la ciudad')
})

test('la línea de tiempo arranca en la primera época y lleva la ciudad a la elegida', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  const hay = await hayDato(page, 'datos/crece.json', 'json')
  test.skip(!hay, 'sin datos/crece.json (datos fuera del repo)')
  const botones = page.locator('#epocas .años button:not(.andar)')
  await expect(botones.first()).toHaveAttribute('aria-pressed', 'true')
  const n = await botones.count()
  await botones.nth(n - 1).click()
  await expect(botones.nth(n - 1)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#epocas .pie')).toContainText(await botones.nth(n - 1).textContent())
  await page.waitForFunction((k) => window.lab.ciudad.U.uEpocaA.value === k && window.lab.ciudad.U.uOlaEpoca.value >= 9000, n - 1, { timeout: 20000 })
})

test('el relieve se hincha con la ola: acostado es liso, levantado aparece el Ávila', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  const hay = await page.waitForFunction(() => window.lab.relieve, null, { timeout: 10000 }).then(() => true, () => false)
  test.skip(!hay, 'sin datos/relieve.bin (dato pesado fuera de git)')
  const AVILA = { x: 1500, z: -2800 } // ladera sur del Ávila, al norte de la plaza
  expect(await page.evaluate(({ x, z }) => window.lab.sueloEn(x, z), AVILA)).toBe(0)
  expect(await page.evaluate(({ x, z }) => window.lab.relieve.alturaEn(x, z), AVILA)).toBeGreaterThan(300)
  await page.evaluate(() => window.lab.levantar(true))
  await page.waitForFunction(({ x, z }) => window.lab.sueloEn(x, z) > 300, AVILA, { timeout: 15000 })
  // la cámara mira al suelo: su objetivo va a la altura del terreno
  await page.waitForTimeout(1500)
  const { y, suelo } = await page.evaluate(() => {
    const { cam, sueloEn } = window.lab
    return { y: cam.goal.y, suelo: sueloEn(cam.goal.x, cam.goal.z) }
  })
  expect(Math.abs(y - suelo)).toBeLessThan(1)
})
