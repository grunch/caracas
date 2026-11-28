import { test, expect } from '@playwright/test'
import { casaNatal, FACHADA_LEIDA_PX, SOLAR } from '../../src/hitos/datos/casa-natal.js'

// La Casa Natal del Libertador (#247): está en pie en las seis épocas y su ficha cuenta cada etapa.
const CENTRO = { x: 118, z: 158 } // el medio del solar, en metros del mundo

test.use({ viewport: { width: 400, height: 300 } })

/** Píxeles que cambian en la vista del hito al esconder su geometría (0: no se dibuja en esa época). */
const pixelesDelHito = (page, id, centro, epoca) => page.evaluate(([id, centro, epoca]) => {
  const l = window.lab
  const U = l.ciudad.U
  l.levantar(true)
  U.uOla.value = 1e5
  U.uEpocaDe.value = U.uEpocaA.value = epoca
  U.uOlaEpoca.value = 9000
  l.cam.jump({ ...centro, dist: 120, yaw: 1.0, pitch: 0.7 })
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
}, [id, centro, epoca])

test('la Casa Natal se dibuja en las seis épocas, con una fachada distinta por fase y sin errores de shader', async ({ page }) => {
  test.setTimeout(300_000)
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && /shader|relieve|WebGLProgram/i.test(m.text())) errores.push(m.text()) })
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready && window.lab?.lineaDeTiempo && window.lab?.hitos?.userData?.rangos)

  // los vértices en pie en cada época: los cuerpos más la fachada de su fase
  const vivos = await page.evaluate(() => {
    const r = window.lab.hitos.userData.rangos.find((x) => x.id === 'casa-natal')
    if (!r) return null
    const vida = window.lab.hitos.geometry.attributes.aVida.array
    return [1, 2, 3, 4, 5, 6].map((e) => {
      let n = 0
      for (let i = r.desde; i < r.hasta; i++) if (vida[i * 2] <= e && (!vida[i * 2 + 1] || vida[i * 2 + 1] > e)) n++
      return n
    })
  })
  expect(vivos, 'casa-natal tiene geometría').not.toBeNull()
  for (const n of vivos) expect(n).toBeGreaterThan(100)
  expect(vivos[0]).toBeGreaterThan(vivos[1]) // 1772: las rejas voladas de madera
  expect(vivos[1]).toBe(vivos[2]) // 1843 y 1889: la misma fachada
  expect(vivos[4]).toBeGreaterThan(vivos[3]) // 1936: el forro de piedra y el marco de la portada
  expect(vivos[5]).toBe(vivos[4])

  for (const epoca of [1, 4, 5]) {
    await page.evaluate((e) => window.lab.lineaDeTiempo.elegir(e), epoca)
    await page.waitForFunction((e) => window.lab.ciudad.U.uEpocaA.value === e, epoca)
    expect(await pixelesDelHito(page, 'casa-natal', CENTRO, epoca), `la casa se ve en la época ${epoca}`).toBeGreaterThan(10)
  }
  expect(errores).toEqual([])
})

test('la marca sale del hito y la ficha dice qué se dibuja en cada etapa', async ({ page }) => {
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready && window.lab?.marcasDelMapa && window.lab?.fichas && window.lab?.lineaDeTiempo)
  const marca = await page.evaluate(() => { const m = window.lab.marcasDelMapa.find((x) => x.id === 'casa-natal'); return [m.hito, m.nace] })
  expect(marca).toEqual(['casa-natal', 1])

  await page.evaluate(() => window.lab.lineaDeTiempo.elegir(1))
  await page.waitForFunction(() => window.lab.ciudad.U.uEpocaA.value === 1)
  await page.evaluate(() => window.lab.fichas.abrir('casa-natal'))
  await expect(page.locator('#ficha h2')).toHaveText('Casa de los Bolívar')
  await expect(page.locator('#ficha .texto p.epoca.rige')).toContainText('piso alto «interiormente» que no se dibuja')

  await page.evaluate(() => window.lab.lineaDeTiempo.elegir(4))
  await page.waitForFunction(() => window.lab.ciudad.U.uEpocaA.value === 4)
  await expect(page.locator('#ficha h2')).toHaveText('Casa natal del Libertador')
  await expect(page.locator('#ficha .texto p.epoca.rige')).toContainText('le pusieron puertas')

  await page.evaluate(() => window.lab.lineaDeTiempo.elegir(5))
  await page.waitForFunction(() => window.lab.ciudad.U.uEpocaA.value === 5)
  await expect(page.locator('#ficha .texto p.epoca.rige')).toContainText('5 de julio de 1921')
})

test('el frente de la casa no pisa la calle: cae en el borde de su manzana en el campo de manzanas del sitio', async ({ page }) => {
  // Arrange: el medio y las dos esquinas del frente, 1 m hacia adentro (el campo tiene 2 m por píxel), y la fachada
  // donde la ponen los planos, que en el tejido del modelo cae en la calle
  const [ux, uy] = casaNatal.eje.map((c) => c / Math.hypot(...casaNatal.eje))
  const METRO = 0.5
  const enPx = (a, b) => [casaNatal.x + (a * ux - b * uy) / METRO, casaNatal.y + (a * uy + b * ux) / METRO]
  const frente = [-SOLAR.frente / 2 + 1, 0, SOLAR.frente / 2 - 1].map((b) => enPx(1, b))
  await page.goto('/?sinintro&capture&sinsw')

  // Act: metros hasta el borde de manzana (positivo adentro) en 1772, 1843 y 1889, con interpolación bilineal
  const distancias = await page.evaluate(async ([puntos, DIST_MAX_M]) => {
    const campo = await (await fetch('datos/suelo-manzanas.json')).json()
    const img = new Image()
    img.src = campo.imagen
    await img.decode()
    const lienzo = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height })
    const ctx = lienzo.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)
    const [x0, y0, x1, y1] = campo.caja
    return puntos.map(([x, y]) => {
      const [u, v] = [((x - x0) / (x1 - x0)) * img.width - 0.5, ((y - y0) / (y1 - y0)) * img.height - 0.5]
      const [i, j, fu, fv] = [Math.floor(u), Math.floor(v), u - Math.floor(u), v - Math.floor(v)]
      const d = ctx.getImageData(i, j, 2, 2).data
      return [0, 1, 2].map((canal) => {
        const t = (k) => d[k * 4 + canal]
        const valor = (t(0) * (1 - fu) + t(1) * fu) * (1 - fv) + (t(2) * (1 - fu) + t(3) * fu) * fv
        return (valor / 255 - 0.5) * 2 * DIST_MAX_M
      })
    })
  }, [[...frente, FACHADA_LEIDA_PX], 16])

  // Assert: el frente queda dentro de la manzana o a menos de 1 m de su borde; sin el corrimiento, 6 m o más en la calle
  for (const porEpoca of distancias.slice(0, 3)) for (const d of porEpoca) expect(d).toBeGreaterThan(-1)
  for (const d of distancias[3]) expect(d).toBeLessThan(-6)
})
