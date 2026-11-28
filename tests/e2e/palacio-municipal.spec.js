import { test, expect } from '@playwright/test'

// Palacio Municipal (#252): el edificio se dibuja desde 1911 y no antes; la marca es una sola, con el nombre de cada plano.
const ID = 'palacio-municipal'
const CENTRO = { x: -42, z: 88 } // el centro del recuadro del plano de 1936, en metros del mundo
const NACE = 4

/** Píxeles que cambian en la vista del edificio al esconder su geometría (0: no se dibuja en esa época). */
const pixelesDelHito = (page, epoca) => page.evaluate(([id, centro, epoca]) => {
  const l = window.lab
  const U = l.ciudad.U
  l.levantar(true)
  U.uOla.value = 1e5
  U.uEpocaDe.value = U.uEpocaA.value = epoca
  U.uOlaEpoca.value = 9000
  l.cam.jump({ ...centro, dist: 150, yaw: 0.5, pitch: 0.85 })
  l.cam.update(0)
  const r = l.hitos.userData.rangos.find((x) => x.id === id)
  const vida = l.hitos.geometry.attributes.aVida
  const original = vida.array.slice(r.desde * 2, r.hasta * 2)
  const gl = l.renderer.getContext()
  const leer = () => {
    l.renderer.render(l.scene, l.camera)
    const p = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4)
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, p)
    return p
  }
  const con = leer()
  try {
    for (let i = r.desde; i < r.hasta; i++) { vida.array[i * 2] = 99; vida.array[i * 2 + 1] = 0 }
    vida.needsUpdate = true
    const sin = leer()
    let n = 0
    for (let i = 0; i < con.length; i += 4) if (con[i] !== sin[i] || con[i + 1] !== sin[i + 1] || con[i + 2] !== sin[i + 2]) n++
    return n
  } finally {
    vida.array.set(original, r.desde * 2)
    vida.needsUpdate = true
    l.renderer.render(l.scene, l.camera)
    U.uOlaEpoca.value = 8999
    l.pedirCuadro(3)
  }
}, [ID, CENTRO, epoca])

test('el Palacio Municipal se dibuja desde 1911, no antes, y sin errores de shader', async ({ page }) => {
  test.setTimeout(300_000)
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && /shader|relieve|WebGLProgram/i.test(m.text())) errores.push(m.text()) })
  await page.setViewportSize({ width: 400, height: 300 }) // leer la pantalla es lento: ventana chica
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready && window.lab?.lineaDeTiempo && window.lab?.hitos?.userData?.rangos)
  const vertices = await page.evaluate((id) => { const r = window.lab.hitos.userData.rangos.find((x) => x.id === id); return r ? r.hasta - r.desde : 0 }, ID)
  expect(vertices, 'el hito tiene geometría').toBeGreaterThan(0)
  for (const epoca of [NACE - 1, NACE, 5]) {
    await page.evaluate((e) => window.lab.lineaDeTiempo.elegir(e), epoca)
    await page.waitForFunction((e) => window.lab.ciudad.U.uEpocaA.value === e, epoca)
    const cambiados = await pixelesDelHito(page, epoca)
    if (epoca < NACE) expect(cambiados, `no se dibuja en la época ${epoca}`).toBe(0)
    else expect(cambiados, `se ve en la época ${epoca}`).toBeGreaterThan(10)
  }
  expect(errores).toEqual([])
})

test('una sola marca para el conjunto: cambia de nombre con la época y la ficha dice cuándo no se dibuja', async ({ page }) => {
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready && window.lab?.marcasDelMapa && window.lab?.fichas)
  const marcas = await page.evaluate(() => window.lab.marcasDelMapa
    .filter((m) => ['palacio-municipal', 'seminario', 'concejo', 'justicia'].includes(m.id)).map((m) => [m.id, m.hito, m.nace]))
  expect(marcas).toEqual([[ID, ID, 1]])
  // la época se fija con los uniforms, como en fichas.spec.js: la ficha abierta la sigue
  const ver = async (epoca) => {
    await page.evaluate((e) => {
      const { ciudad: { U }, pedirCuadro } = window.lab
      U.uEpocaDe.value = U.uEpocaA.value = e
      U.uOlaEpoca.value = 9000
      window.__cuadro = false
      requestAnimationFrame(() => { pedirCuadro(3); requestAnimationFrame(() => requestAnimationFrame(() => { window.__cuadro = true })) })
    }, epoca)
    await page.waitForFunction(() => window.__cuadro === true)
  }
  await ver(5)
  await page.evaluate((id) => window.lab.fichas.abrir(id), ID)
  await expect(page.locator('#ficha h2')).toHaveText('Palacio de Justicia')
  await ver(4)
  await expect(page.locator('#ficha h2')).toHaveText('Concejo Municipal y Palacio de Justicia')
  await expect(page.locator('#ficha .texto p.epoca.rige')).toContainText('Chataing')
  await ver(2)
  await expect(page.locator('#ficha h2')).toHaveText('Universidad y su capilla')
  await expect(page.locator('#ficha .texto p.epoca.rige')).toContainText('aquí no se dibuja')
  await ver(1)
  await expect(page.locator('#ficha h2')).toHaveText('Seminario de Santa Rosa y Universidad')
  await expect(page.locator('#ficha .texto p.epoca.rige')).toContainText('aquí no se dibuja')
})
