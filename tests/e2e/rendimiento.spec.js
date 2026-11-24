import { test, expect } from '@playwright/test'

/** La malla de las casas: la del material de la ciudad que trae el atributo de los techos. */
const hayCasas = () => window.lab.scene.children.some((m) => m.isMesh && m.geometry.hasAttribute('aTecho'))

test('las casas se levantan en un worker: la página no hace ese trabajo', async ({ page }) => {
  const trabajadores = []
  page.on('worker', (w) => trabajadores.push(w.url()))
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.waitForFunction(() => window.lab.casasListas === true, null, { timeout: 60000 })
  expect(trabajadores.some((url) => url.includes('ciudad-trabajador'))).toBe(true)
  expect(await page.evaluate(hayCasas)).toBe(true)
})

test('con ?sintrabajador las casas se levantan en el hilo de la página y llegan igual', async ({ page }) => {
  const trabajadores = []
  page.on('worker', (w) => trabajadores.push(w.url()))
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.casasListas === true, null, { timeout: 60000 })
  const conWorker = await page.evaluate(() => {
    const casas = window.lab.scene.children.find((m) => m.isMesh && m.geometry.hasAttribute('aTecho'))
    return { vertices: casas.geometry.attributes.position.count, indices: casas.geometry.index.count, radio: casas.geometry.boundingSphere.radius }
  })
  const antes = trabajadores.length
  await page.goto('/?sinintro&sintrabajador')
  await page.waitForFunction(() => window.lab?.casasListas === true, null, { timeout: 60000 })
  expect(trabajadores.length).toBe(antes)
  const sinWorker = await page.evaluate(() => {
    const casas = window.lab.scene.children.find((m) => m.isMesh && m.geometry.hasAttribute('aTecho'))
    return { vertices: casas.geometry.attributes.position.count, indices: casas.geometry.index.count, radio: casas.geometry.boundingSphere.radius }
  })
  expect(sinWorker).toEqual(conWorker)
})
