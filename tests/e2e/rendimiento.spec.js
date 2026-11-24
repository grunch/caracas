import { test, expect } from '@playwright/test'
import { hayDato } from './datos.js'

test('las casas se levantan en workers y llegan por baldosas: la página no hace ese trabajo', async ({ page }) => {
  const trabajadores = []
  page.on('worker', (w) => trabajadores.push(w.url()))
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.waitForFunction(() => window.lab.casasListas === true, null, { timeout: 60000 })
  // los de las casas, y uno más que construye los hitos
  expect(trabajadores.some((url) => url.includes('ciudad-trabajador'))).toBe(true)
  expect(trabajadores.some((url) => url.includes('hitos-trabajador'))).toBe(true)
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
  test.setTimeout(240_000) // carga la ciudad dos veces, y la segunda la levanta el hilo que además dibuja
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
  await page.waitForFunction(() => window.lab?.casasListas === true, null, { timeout: 180000 })
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

test('el plano grande no se baja al abrir: cada nivel se pide cuando la vista lo necesita', async ({ page }) => {
  const pedidos = []
  page.on('request', (r) => { const m = r.url().match(/plano\/[a-z0-9-]+\.webp/); if (m) pedidos.push(m[0]) })
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  test.skip(!(await hayDato(page, 'plano/chico.webp', 'webp')), 'sin el plano procesado no hay niveles que pedir')
  await page.waitForFunction(() => window.lab.planoBase.puesto >= 1 && window.lab.lineaDeTiempo, null, { timeout: 60000 })
  const cuadros = () => page.evaluate(() => new Promise((ok) => { window.lab.pedirCuadro(3); requestAnimationFrame(() => requestAnimationFrame(ok)) }))
  await cuadros()
  // con la hoja entera a la vista alcanza el plano chico, y las máscaras van en su tamaño chico
  expect(await page.evaluate(() => window.lab.planoBase.pedido)).toBe(1)
  expect(pedidos).toContain('plano/primero.webp')
  expect(pedidos).toContain('plano/chico.webp')
  expect(pedidos).toContain('plano/suelo-2k.webp')
  expect(pedidos.filter((u) => /medio|suelo\.webp|rotulos\.webp/.test(u))).toEqual([])
  // al acercarse (la vista de destino, no las intermedias de un vuelo) pide un nivel más alto y las máscaras
  // completas: el de 4096 si las teselas finas cubren lo que se mira o el equipo es liviano; si no, el de 8192
  const { liviano, conTeselas } = await page.evaluate(() => ({ liviano: window.lab.liviano, conTeselas: Boolean(window.lab.teselas) }))
  const [nivel, plano] = liviano || conTeselas ? [2, 'plano/medio-4k.webp'] : [3, 'plano/medio.webp']
  await page.evaluate(() => window.lab.cam.jump({ x: 0, z: 0, dist: 1200, yaw: 0, pitch: 0.8 }))
  await cuadros()
  await page.waitForFunction((n) => window.lab.planoBase.pedido === n, nivel)
  await expect.poll(() => pedidos).toContain(plano)
  // (en un equipo liviano las máscaras se quedan en su tamaño chico)
  if (!liviano) await expect.poll(() => pedidos).toContain('plano/suelo.webp')
  // más cerca que las teselas finas, el de 8192 no hace falta
  if (liviano || conTeselas) expect(pedidos).not.toContain('plano/medio.webp')
})
