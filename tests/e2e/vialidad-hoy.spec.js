import { test, expect } from '@playwright/test'

// #277, #278: los nombres de las calles de hoy (avenida Urdaneta, autopistas, Cota Mil…) viven solo en «lo de hoy».
// En las épocas históricas ni se bajan: datos/calles.bin se pide recién al prender H.
test('los nombres de las vías de hoy no se bajan ni se dibujan hasta prender «lo de hoy»', async ({ page }) => {
  const pedidos = []
  page.on('request', (r) => { if (/datos\/calles\.(bin|json)/.test(r.url())) pedidos.push(r.url()) })
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready)

  await expect(page.locator('#hoy')).toHaveAttribute('aria-pressed', 'false')
  expect(await page.evaluate(() => window.lab.calles)).toBeNull()
  await expect(page.locator('canvas#calles')).toHaveCount(0)
  expect(pedidos).toEqual([])

  await page.locator('#hoy').click()
  await expect(page.locator('#hoy')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('canvas#calles')).toHaveCount(1)
  expect(pedidos.length).toBeGreaterThan(0)
})
