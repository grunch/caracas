import { test, expect } from '@playwright/test'

// Los botones de abajo a la derecha, compactos: «Recorrer ▲» despliega Caminar, Volar y Manejar hacia arriba, y el
// color es un botón de ícono (la gota). Durante un modo queda solo su «Volver al mapa».
test('«Recorrer» despliega los modos, se cierra con Esc o tocando afuera, y el color es un ícono', async ({ page }) => {
  await page.goto('/?sinintro&capture')
  await page.waitForFunction(() => window.lab?.ready === true, null, { timeout: 60_000 })
  const recorrer = page.locator('#recorrer')
  await expect(recorrer).toBeVisible()
  await expect(recorrer).toHaveAttribute('aria-expanded', 'false')
  for (const id of ['#caminar', '#volar', '#manejar']) await expect(page.locator(id)).toBeHidden()

  // el color: un ícono con su nombre accesible, sin texto a la vista
  const color = page.locator('#color')
  await expect(color).toHaveText('')
  await expect(color).toHaveAttribute('aria-label', /color/i)
  await color.click()
  await expect(color).toHaveAttribute('aria-pressed', 'true')
  await expect(color).toHaveAttribute('aria-label', /tinta/i)

  await recorrer.click()
  await expect(recorrer).toHaveAttribute('aria-expanded', 'true')
  for (const [id, texto] of [['#caminar', 'Caminar'], ['#volar', 'Volar'], ['#manejar', 'Manejar']]) {
    await expect(page.locator(id)).toBeVisible()
    await expect(page.locator(id)).toHaveText(texto)
  }
  // los modos quedan encima del botón
  const [menu, boton] = [await page.locator('#manejar').boundingBox(), await recorrer.boundingBox()]
  expect(menu.y + menu.height).toBeLessThanOrEqual(boton.y)
  await page.keyboard.press('Escape')
  await expect(recorrer).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#caminar')).toBeHidden()

  await recorrer.click()
  await page.mouse.click(40, 300)   // afuera, sobre la ciudad
  await expect(page.locator('#caminar')).toBeHidden()

  // dentro de un modo: «Recorrer» se esconde y queda el botón del modo, «Volver al mapa»
  await recorrer.click()
  await page.locator('#volar').click()
  await expect(page.locator('#volar')).toHaveText('Volver al mapa')
  await expect(recorrer).toBeHidden()
  await expect(page.locator('#caminar')).toBeHidden()
  await page.locator('#volar').click()
  await expect(recorrer).toBeVisible()
  await expect(page.locator('#volar')).toBeHidden()
})

test('con el teclado, abrir «Recorrer» y apretar Tab lleva a los modos, en orden', async ({ page }) => {
  // revisión de #167: el menú iba antes del botón en el DOM y Tab saltaba de «Recorrer» a la gota
  await page.goto('/?sinintro&capture')
  await page.waitForFunction(() => window.lab?.ready === true, null, { timeout: 60_000 })
  await page.locator('#recorrer').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#recorrer')).toHaveAttribute('aria-expanded', 'true')
  const enfocado = () => page.evaluate(() => document.activeElement?.id)
  for (const id of ['caminar', 'volar', 'manejar']) {
    await page.keyboard.press('Tab')
    expect(await enfocado()).toBe(id)
  }
})
