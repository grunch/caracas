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
