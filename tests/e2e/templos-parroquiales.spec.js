import { test, expect } from '@playwright/test'

// Santa Rosalía, San Juan y San José (#259) y La Candelaria (#243): cada uno se dibuja desde su época y no antes.
// [id, centro en metros del mundo, época en que nace]
const TEMPLOS = [
  ['santa-rosalia', { x: 74, z: 853 }, 2],
  ['san-juan', { x: -1020, z: 762 }, 3],
  ['san-jose', { x: 831, z: -758 }, 4],
  ['candelaria', { x: 1133, z: 79 }, 1], // en pie en los seis planos
]

test.use({ viewport: { width: 400, height: 300 } })

/** Píxeles que cambian en la vista del templo al esconder su geometría (0: no se dibuja en esa época). */
const pixelesDelTemplo = (page, id, centro, epoca) => page.evaluate(([id, centro, epoca]) => {
  const l = window.lab
  const U = l.ciudad.U
  l.levantar(true)
  U.uOla.value = 1e5
  U.uEpocaDe.value = U.uEpocaA.value = epoca
  U.uOlaEpoca.value = 9000
  l.cam.jump({ ...centro, dist: 150, yaw: -0.6, pitch: 0.85 })
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
  const conTemplo = leer()
  try {
    for (let i = r.desde; i < r.hasta; i++) { vida.array[i * 2] = 99; vida.array[i * 2 + 1] = 0 }
    vida.needsUpdate = true
    const sinTemplo = leer()
    let n = 0
    for (let i = 0; i < conTemplo.length; i += 4) {
      if (conTemplo[i] !== sinTemplo[i] || conTemplo[i + 1] !== sinTemplo[i + 1] || conTemplo[i + 2] !== sinTemplo[i + 2]) n++
    }
    return n
  } finally {
    vida.array.set(original, r.desde * 2)
    vida.needsUpdate = true
    l.renderer.render(l.scene, l.camera)
    U.uOlaEpoca.value = 8999
    l.pedirCuadro(3)
  }
}, [id, centro, epoca])

test('los templos se dibujan desde su época, no antes, y sin errores de shader', async ({ page }) => {
  test.setTimeout(300_000)
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && /shader|relieve|WebGLProgram/i.test(m.text())) errores.push(m.text()) })
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready && window.lab?.lineaDeTiempo && window.lab?.hitos?.userData?.rangos)

  for (const [id] of TEMPLOS) {
    const vertices = await page.evaluate((id) => { const r = window.lab.hitos.userData.rangos.find((x) => x.id === id); return r ? r.hasta - r.desde : 0 }, id)
    expect(vertices, `${id} tiene geometría`).toBeGreaterThan(0)
  }
  for (const epoca of [1, 2, 3, 4, 5]) {
    await page.evaluate((e) => window.lab.lineaDeTiempo.elegir(e), epoca)
    await page.waitForFunction((e) => window.lab.ciudad.U.uEpocaA.value === e, epoca)
    // cada templo se mira la época anterior a la suya, la suya y 1936 (la continuidad): leer la pantalla es lento
    for (const [id, centro, nace] of TEMPLOS.filter(([, , nace]) => epoca === 5 || epoca === nace || epoca === nace - 1)) {
      const cambiados = await pixelesDelTemplo(page, id, centro, epoca)
      if (epoca < nace) expect(cambiados, `${id} no existe en la época ${epoca}`).toBe(0)
      else expect(cambiados, `${id} se ve en la época ${epoca}`).toBeGreaterThan(10)
    }
  }
  expect(errores).toEqual([])
})

test('las marcas de los tres templos salen de su hito y San José tiene ficha propia', async ({ page }) => {
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready && window.lab?.marcasDelMapa && window.lab?.fichas)
  const marcas = await page.evaluate(() => window.lab.marcasDelMapa
    .filter((m) => ['santa-rosalia', 'san-juan', 'san-jose'].includes(m.id)).map((m) => [m.id, m.hito, m.nace]))
  expect(marcas.sort()).toEqual([['san-jose', 'san-jose', 4], ['san-juan', 'san-juan', 3], ['santa-rosalia', 'santa-rosalia', 2]])
  await page.evaluate(() => window.lab.fichas.abrir('san-jose'))
  await expect(page.locator('#ficha h2')).toHaveText('San José')
  await expect(page.locator('#ficha')).toContainText('dos torres gemelas')
})

test('la marca de La Candelaria sale de su hito desde 1772 y su ficha cuenta la torre de tres cuerpos', async ({ page }) => {
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready && window.lab?.marcasDelMapa && window.lab?.fichas)
  const marca = await page.evaluate(() => { const m = window.lab.marcasDelMapa.find((x) => x.id === 'candelaria'); return [m.hito, m.nace] })
  expect(marca).toEqual(['candelaria', 1])
  await page.evaluate(() => window.lab.fichas.abrir('candelaria'))
  await expect(page.locator('#ficha h2')).toHaveText('Candelaria')
  await expect(page.locator('#ficha')).toContainText('torre de tres cuerpos')
})
