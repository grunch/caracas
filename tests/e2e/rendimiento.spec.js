import { test, expect } from '@playwright/test'

test('las casas se levantan en workers y llegan por baldosas: la página no hace ese trabajo', async ({ page }) => {
  const trabajadores = []
  page.on('worker', (w) => trabajadores.push(w.url()))
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.waitForFunction(() => window.lab.casasListas === true, null, { timeout: 60000 })
  expect(trabajadores.length).toBeGreaterThan(0)
  expect(trabajadores.every((url) => url.includes('ciudad-trabajador'))).toBe(true)
  const { baldosas, enEscena, tiranSombra } = await page.evaluate(() => {
    const { casas, scene, ciudad } = window.lab
    return {
      baldosas: casas.baldosas.length,
      enEscena: scene.children.includes(casas.grupo) && casas.grupo.children.length,
      tiranSombra: casas.grupo.children.every((m) => m.castShadow && m.customDepthMaterial && m.material[0] === ciudad.material),
    }
  })
  expect(baldosas).toBeGreaterThan(0)
  expect(enEscena).toBe(baldosas)
  expect(tiranSombra).toBe(true)
})

test('con ?sintrabajador las casas se levantan en el hilo de la página y son las mismas', async ({ page }) => {
  const trabajadores = []
  page.on('worker', (w) => trabajadores.push(w.url()))
  const cuenta = () => {
    const { casas } = window.lab
    return { ...casas.cuenta, ids: casas.baldosas.map((b) => `${b.id}|${b.pase}`).sort() }
  }
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.casasListas === true, null, { timeout: 60000 })
  const conWorkers = await page.evaluate(cuenta)
  const antes = trabajadores.length
  await page.goto('/?sinintro&sintrabajador')
  await page.waitForFunction(() => window.lab?.casasListas === true, null, { timeout: 60000 })
  expect(trabajadores.length).toBe(antes)
  expect(await page.evaluate(cuenta)).toEqual(conWorkers)
})

test('de las casas solo se manda a dibujar lo que vive en la época que se mira', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.casasListas === true && window.lab.lineaDeTiempo, null, { timeout: 60000 })
  const cuadro = () => page.evaluate(() => new Promise((ok) => { window.lab.pedirCuadro(2); requestAnimationFrame(() => requestAnimationFrame(ok)) }))
  await cuadro()
  const alAbrir = await page.evaluate(() => window.lab.casas.cuenta)
  // al abrir (1772) vive una parte de la ciudad; el resto de los índices no se dibuja
  expect(alAbrir.vivos).toBeGreaterThan(0)
  expect(alAbrir.vivos).toBeLessThan(alAbrir.indices)
  // en la última época vive más, y mientras pasa su ola se dibuja lo de las dos
  await page.evaluate(() => window.lab.lineaDeTiempo.elegir(5))
  await page.waitForFunction(() => window.lab.ciudad.U.uEpocaA.value === 5)
  await cuadro()
  const enLaOla = await page.evaluate(() => window.lab.casas.cuenta.vivos)
  expect(enLaOla).toBeGreaterThan(alAbrir.vivos)
  await page.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 1e5 })
  await cuadro()
  const alFinal = await page.evaluate(() => window.lab.casas.cuenta.vivos)
  expect(alFinal).toBeLessThanOrEqual(enLaOla)
  expect(alFinal).toBeGreaterThan(alAbrir.vivos)
})
