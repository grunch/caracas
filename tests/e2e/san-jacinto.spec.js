import { test, expect } from '@playwright/test'

// San Jacinto (#245): tres hitos en el mismo solar, uno por etapa. Cada uno se dibuja en sus épocas y en ninguna otra.
// [id, épocas en que está en pie]
const ETAPAS = [
  ['san-jacinto', [1, 2]],
  ['solar-mercado-san-jacinto', [3]],
  ['mercado-san-jacinto', [4, 5]],
]
const CENTRO = { x: 236, z: 140 } // metros del mundo: el medio del solar (docs/san-jacinto-georreferencia.json)

test.use({ viewport: { width: 400, height: 300 } })

/** Píxeles que cambian en la vista del solar al esconder la geometría de un hito (0: no se dibuja en esa época). */
const pixelesDelHito = (page, id, epoca) => page.evaluate(([id, centro, epoca]) => {
  const l = window.lab
  const U = l.ciudad.U
  l.levantar(true)
  U.uOla.value = 1e5
  U.uEpocaDe.value = U.uEpocaA.value = epoca
  U.uOlaEpoca.value = 9000
  l.cam.jump({ ...centro, dist: 170, yaw: -0.6, pitch: 0.85 })
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
  const conHito = leer()
  try {
    for (let i = r.desde; i < r.hasta; i++) { vida.array[i * 2] = 99; vida.array[i * 2 + 1] = 0 }
    vida.needsUpdate = true
    const sinHito = leer()
    let n = 0
    for (let i = 0; i < conHito.length; i += 4) {
      if (conHito[i] !== sinHito[i] || conHito[i + 1] !== sinHito[i + 1] || conHito[i + 2] !== sinHito[i + 2]) n++
    }
    return n
  } finally {
    vida.array.set(original, r.desde * 2)
    vida.needsUpdate = true
    l.renderer.render(l.scene, l.camera)
    U.uOlaEpoca.value = 8999
    l.pedirCuadro(3)
  }
}, [id, CENTRO, epoca])

test('el convento, el solar y el mercado se relevan en el mismo lugar, sin errores de shader', async ({ page }) => {
  test.setTimeout(300_000)
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && /shader|relieve|WebGLProgram/i.test(m.text())) errores.push(m.text()) })
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready && window.lab?.lineaDeTiempo && window.lab?.hitos?.userData?.rangos)

  for (const epoca of [1, 2, 3, 4, 5]) {
    await page.evaluate((e) => window.lab.lineaDeTiempo.elegir(e), epoca)
    await page.waitForFunction((e) => window.lab.ciudad.U.uEpocaA.value === e, epoca)
    for (const [id, enPie] of ETAPAS) {
      // leer la pantalla es lento: cada hito se mira en sus épocas y en las dos que lo rodean
      if (!enPie.includes(epoca) && !enPie.includes(epoca - 1) && !enPie.includes(epoca + 1)) continue
      const cambiados = await pixelesDelHito(page, id, epoca)
      if (enPie.includes(epoca)) expect(cambiados, `${id} se ve en la época ${epoca}`).toBeGreaterThan(10)
      else expect(cambiados, `${id} no existe en la época ${epoca}`).toBe(0)
    }
  }
  expect(errores).toEqual([])
})

test('la marca sale del hito y la ficha de 1889 dice que no se dibuja ningún edificio', async ({ page }) => {
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready && window.lab?.marcasDelMapa && window.lab?.fichas && window.lab?.lineaDeTiempo)
  const marca = await page.evaluate(() => { const m = window.lab.marcasDelMapa.find((x) => x.id === 'san-jacinto'); return [m.hito, m.nace] })
  expect(marca).toEqual(['san-jacinto', 1])
  await page.evaluate(() => window.lab.lineaDeTiempo.elegir(3))
  await page.waitForFunction(() => window.lab.ciudad.U.uEpocaA.value === 3)
  await page.evaluate(() => window.lab.fichas.abrir('san-jacinto'))
  await expect(page.locator('#ficha h2')).toHaveText('Mercado de San Jacinto')
  await expect(page.locator('#ficha .texto p.epoca.rige')).toContainText('no se dibuja ningún edificio')
})
