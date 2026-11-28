import { test, expect } from '@playwright/test'

// Cuartel San Carlos (#248): se dibuja desde 1889 (restaurado en 1884) y no antes; en 1843 solo hay nombre y ficha.
const CENTRO = { x: 110, z: -929 }
const NACE = 3

test.use({ viewport: { width: 400, height: 300 } })

/** Píxeles que cambian en la vista del cuartel al esconder su geometría (0: no se dibuja en esa época). */
const pixelesDelCuartel = (page, epoca) => page.evaluate(([centro, epoca]) => {
  const l = window.lab
  const U = l.ciudad.U
  l.levantar(true)
  U.uOla.value = 1e5
  U.uEpocaDe.value = U.uEpocaA.value = epoca
  U.uOlaEpoca.value = 9000
  l.cam.jump({ ...centro, dist: 220, yaw: -0.6, pitch: 0.85 })
  l.cam.update(0)
  const r = l.hitos.userData.rangos.find((x) => x.id === 'san-carlos')
  const vida = l.hitos.geometry.attributes.aVida
  const original = vida.array.slice(r.desde * 2, r.hasta * 2)
  const gl = l.renderer.getContext()
  const leer = () => {
    l.renderer.render(l.scene, l.camera)
    const p = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4)
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, p)
    return p
  }
  const conCuartel = leer()
  try {
    for (let i = r.desde; i < r.hasta; i++) { vida.array[i * 2] = 99; vida.array[i * 2 + 1] = 0 }
    vida.needsUpdate = true
    const sinCuartel = leer()
    let n = 0
    for (let i = 0; i < conCuartel.length; i += 4) {
      if (conCuartel[i] !== sinCuartel[i] || conCuartel[i + 1] !== sinCuartel[i + 1] || conCuartel[i + 2] !== sinCuartel[i + 2]) n++
    }
    return n
  } finally {
    vida.array.set(original, r.desde * 2)
    vida.needsUpdate = true
    l.renderer.render(l.scene, l.camera)
    U.uOlaEpoca.value = 8999
    l.pedirCuadro(3)
  }
}, [CENTRO, epoca])

test('el cuartel se dibuja desde 1889, crece en 1911 y no existe en 1772 ni en 1843', async ({ page }) => {
  test.setTimeout(300_000)
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && /shader|relieve|WebGLProgram/i.test(m.text())) errores.push(m.text()) })
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready && window.lab?.lineaDeTiempo && window.lab?.hitos?.userData?.rangos)

  const cambiados = {}
  for (const epoca of [1, 2, 3, 4, 5]) {
    await page.evaluate((e) => window.lab.lineaDeTiempo.elegir(e), epoca)
    await page.waitForFunction((e) => window.lab.ciudad.U.uEpocaA.value === e, epoca)
    cambiados[epoca] = await pixelesDelCuartel(page, epoca)
    if (epoca < NACE) expect(cambiados[epoca], `no existe en la época ${epoca}`).toBe(0)
    else expect(cambiados[epoca], `se ve en la época ${epoca}`).toBeGreaterThan(100)
  }
  // las naves prolongadas tras el terremoto de 1900 suman edificio al norte
  expect(cambiados[4]).toBeGreaterThan(cambiados[3])
  expect(errores).toEqual([])
})

test('la marca sale del hito desde 1843 y la ficha de cada época dice lo que el mapa muestra', async ({ page }) => {
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready && window.lab?.marcasDelMapa && window.lab?.fichas)
  const marca = await page.evaluate(() => window.lab.marcasDelMapa.filter((m) => m.id === 'san-carlos').map((m) => [m.hito, m.nace, m.naceHito]))
  expect(marca).toEqual([['san-carlos', 2, 3]])
  const enEpoca = (e) => page.evaluate((e) => { const l = window.lab; l.ciudad.U.uEpocaDe.value = l.ciudad.U.uEpocaA.value = e; l.pedirCuadro(3) }, e)
  await enEpoca(2)
  await page.evaluate(() => window.lab.fichas.abrir('san-carlos'))
  await expect(page.locator('#ficha h2')).toHaveText('Cuartel Veterano')
  await expect(page.locator('#ficha .texto p.epoca.rige')).toContainText('el cuartel no se dibuja')
  await enEpoca(4)
  await expect(page.locator('#ficha h2')).toHaveText('Cuartel San Carlos')
  await expect(page.locator('#ficha .texto p.epoca.rige')).toContainText('garitas')
  await enEpoca(6)
  await expect(page.locator('#ficha .texto p.epoca.rige')).toContainText('Comandancia')
})
