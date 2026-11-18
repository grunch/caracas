import { test, expect } from '@playwright/test'

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

test('de cerca carga las teselas finas que rodean lo que se mira', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  // laminas.json está en el repo, las teselas no (datos fuera de git): sin la primera, no hay qué probar
  const hay = await page.evaluate(async () => (await fetch('plano/f/0-0.webp', { method: 'HEAD' })).ok)
  test.skip(!hay, 'sin teselas en plano/f/ (datos fuera del repo)')
  await page.evaluate(() => window.lab.cam.jump({ x: 0, z: 0, dist: 600 }))
  await page.waitForFunction(() => window.lab.teselas?.cargadas.length >= 4, null, { timeout: 30000 })
  await page.waitForFunction(() => window.lab.ciudad.U.uFinoOn.value.some((v) => v === 1), null, { timeout: 30000 })
})
