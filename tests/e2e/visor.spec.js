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

test('al prender el color se pide la máscara de rótulos del plano, y sin ella el color anda igual', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  // hasta entonces no se baja: en tinta el plano se ve entero
  const pedido = page.waitForRequest((r) => /\/plano\/rotulos(-2k)?\.webp$/.test(new URL(r.url()).pathname))
  await page.keyboard.press('KeyC')
  await pedido
  // la ciudad de demostración de CI no trae la máscara: queda la de respaldo o la real, nunca nada
  await page.waitForFunction(() => window.lab.ciudad.U.uColor.value === 1)
  expect(await page.evaluate(() => window.lab.ciudad.U.uRotulos.value?.isTexture === true)).toBe(true)
})

test('Espacio sobre un botón con foco activa ese botón, no levanta la ciudad', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.locator('#color').focus()
  await page.keyboard.press('Space')
  await expect(page.locator('#color')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#alzar')).toHaveText('Levantar la ciudad')
})

test('la H prende y apaga lo de hoy: botón, leyenda y estampa', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  const boton = page.locator('#hoy')
  const leyenda = page.locator('#leyenda')
  await expect(boton).toHaveAttribute('aria-pressed', 'false')
  await expect(leyenda).toBeHidden()
  await page.keyboard.press('KeyH')
  await expect(boton).toHaveAttribute('aria-pressed', 'true')
  await expect(leyenda).toBeVisible()
  await expect(leyenda.getByRole('link', { name: /OpenStreetMap/ })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
  await page.waitForFunction(() => window.lab.ciudad.U.uHoy.value === 1)
  await boton.click()
  await expect(boton).toHaveAttribute('aria-pressed', 'false')
  await expect(leyenda).toBeHidden()
  await page.waitForFunction(() => window.lab.ciudad.U.uHoy.value === 0)
})

test('la H no hace nada con el foco en un botón', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.locator('#color').focus()
  await page.keyboard.press('KeyH')
  await expect(page.locator('#hoy')).toHaveAttribute('aria-pressed', 'false')
})

test('lo de hoy baja su textura de lejos la primera vez que se prende', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  const hay = await hayDato(page, 'plano/hoy-lejos.webp', 'image/webp')
  test.skip(!hay, 'sin plano/hoy-lejos.webp (dato pesado fuera de git)')
  await page.keyboard.press('KeyH')
  await page.waitForFunction(() => window.lab.ciudad.U.tHoyLejos.value.image?.width === 2048, null, { timeout: 30000 })
})

test('de cerca carga las teselas finas que rodean lo que se mira', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  // laminas.json está en el repo, las teselas no (datos fuera de git): sin la primera, no hay qué probar
  const hay = await hayDato(page, 'plano/f/0-0.webp', 'image/webp')
  test.skip(!hay, 'sin teselas en plano/f/ (datos fuera del repo)')
  await page.evaluate(() => window.lab.cam.jump({ x: 0, z: 0, dist: 600 }))
  await page.waitForFunction(() => window.lab.teselas?.cargadas.length >= 4, null, { timeout: 30000 })
  await page.waitForFunction(() => window.lab.ciudad.U.uFinoOn.value.some((v) => v === 1), null, { timeout: 30000 })
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
  // la época de destino se fija y la ola arranca (cuánto tarda en llegar depende de la velocidad del render)
  // (los botones llevan el índice de época de crece.json: la 0, 1578, no se muestra)
  const ultima = Number(await botones.nth(n - 1).getAttribute('data-indice'))
  expect(await botones.first().textContent()).toBe('1772')
  await page.waitForFunction((k) => window.lab.ciudad.U.uEpocaA.value === k && window.lab.ciudad.U.uOlaEpoca.value > 0, ultima, { timeout: 20000 })
})

test('al elegir 1843 la hoja recibe el plano de Jesurún calzado: la ola va hacia su textura', async ({ page }) => {
  await page.goto('/?sinintro&planos')
  await page.waitForFunction(() => window.lab?.ready === true)
  const hay = (await hayDato(page, 'datos/crece.json', 'json')) && (await hayDato(page, 'plano/1843/chico.webp', 'image/webp'))
  test.skip(!hay, 'sin crece.json o sin los planos de época (datos fuera del repo)')
  await page.locator('#epocas .años button', { hasText: '1843' }).click()
  // la ola arranca cuando llegó el plano (o a los 2,5 s, con 1936): la ranura "a" apunta a la textura de 1843
  await page.waitForFunction(() => {
    const { uPlanoA, uEpocaA } = window.lab.ciudad.U
    return uEpocaA.value === 2 && /plano\/1843\//.test(uPlanoA.value.image?.src ?? '')
  }, null, { timeout: 30000 })
  expect(await page.evaluate(() => window.lab.planos.cargados)).toContain(1843)
  const rect = await page.evaluate(() => window.lab.ciudad.U.uPlanoARect.value.toArray())
  expect(rect[0]).toBeGreaterThan(0)
  expect(rect[2]).toBeLessThan(1)
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
  // la ola tarda 5 s en un equipo normal; con render por software y la máquina cargada, bastante más
  await page.waitForFunction(({ x, z }) => window.lab.sueloEn(x, z) > 300, AVILA, { timeout: 60000 })
  // la cámara mira al suelo: su objetivo va a la altura del terreno
  await page.waitForTimeout(1500)
  const { y, suelo } = await page.evaluate(() => {
    const { cam, sueloEn } = window.lab
    return { y: cam.goal.y, suelo: sueloEn(cam.goal.x, cam.goal.z) }
  })
  expect(Math.abs(y - suelo)).toBeLessThan(1)
})

test('los árboles llegan después de la ciudad: una malla instanciada con un árbol por registro', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  const hay = await hayDato(page, 'datos/arboles.bin', 'octet-stream')
  test.skip(!hay, 'sin datos/arboles.bin (dato pesado fuera del repo)')
  const bytes = await page.evaluate(async () => (await (await fetch('datos/arboles.bin')).arrayBuffer()).byteLength)
  await page.waitForFunction(() => window.lab.arboles, null, { timeout: 60000 })
  const malla = await page.evaluate(() => {
    const m = window.lab.arboles
    return {
      instanciada: m.isInstancedMesh, count: m.count, enEscena: m.parent === window.lab.scene,
      mismoColor: m.material.uniforms.uColor === window.lab.ciudad.U.uColor,
    }
  })
  expect(malla).toEqual({ instanciada: true, count: bytes / 8, enEscena: true, mismoColor: true })
})

test('el material de la ciudad compila con las fachadas, en tinta y en color', async ({ page }) => {
  const errores = []
  page.on('console', (m) => { if (m.type() === 'error' && /shader|WebGLProgram|GLSL/i.test(m.text())) errores.push(m.text()) })
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  const dosCuadros = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  if (await hayDato(page, 'datos/ciudad.pak', 'octet-stream')) {
    // con la ciudad: sus paredes traen dónde está cada punto de la pared (aPared) y sus techos, el faldón (aTecho)
    await page.waitForFunction(() => window.lab.scene.children.some((m) => m.geometry?.attributes?.aPared?.itemSize === 3
      && m.geometry.attributes.aTecho?.itemSize === 4), null, { timeout: 60000 })
  }
  await page.evaluate(() => window.lab.pedirCuadro(4))
  await dosCuadros()
  await page.evaluate(() => window.lab.alternarColor(true))
  await page.waitForFunction(() => window.lab.ciudad.U.uColor.value === 1)
  await dosCuadros()
  expect(errores).toEqual([])
})

test('con lo de hoy, los nombres de las calles se dibujan sobre la vista y se borran al apagarlo', async ({ page }) => {
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  const hay = await hayDato(page, 'datos/calles.bin', 'octet-stream')
  test.skip(!hay, 'sin datos/calles.bin (dato pesado fuera de git)')
  await page.evaluate(() => window.lab.cam.jump({ x: 0, z: 0, dist: 1200, yaw: 0, pitch: 1.3 }))
  await page.keyboard.press('KeyH')
  await page.waitForFunction(() => window.lab.calles?.cuantas > 0, null, { timeout: 60000 })
  await expect(page.locator('#calles')).toHaveCSS('pointer-events', 'none')
  await page.keyboard.press('KeyH')
  await page.waitForFunction(() => window.lab.calles.cuantas === 0, null, { timeout: 60000 })
})

test('sin ?planos, la hoja muestra siempre el plano de 1936 (no se pega el plano viejo encima)', async ({ page }) => {
  const pedidos = []
  page.on('request', (r) => pedidos.push(r.url()))
  await page.goto('/?sinintro')
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.waitForTimeout(1500)
  expect(pedidos.filter((u) => u.includes('plano/epocas.json'))).toEqual([])
})
