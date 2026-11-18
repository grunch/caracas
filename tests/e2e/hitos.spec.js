import { test, expect } from '@playwright/test'
import { hayDato } from './datos.js'

const listo = async (page) => {
  await page.goto('/?sinintro&capture')
  await page.waitForFunction(() => window.lab?.ready === true)
}

/**
 * Dibuja la plaza desde arriba en una época (fijando los uniforms: no depende de crece.json ni de la ola) y
 * devuelve el color medio de un recuadro de `lado` píxeles en el centro de la vista, que mira a (x, z).
 */
function colorDeLaPlaza(page, epoca, { x = 4, z = 2.5, lado = 40 } = {}) {
  return page.evaluate(({ epoca, x, z, lado }) => {
    const { ciudad: { U }, cam, camera, renderer, scene } = window.lab
    U.uOla.value = 1e5
    U.uColor.value = 1
    U.uEpocaDe.value = U.uEpocaA.value = epoca
    U.uOlaEpoca.value = 9000
    cam.jump({ x, z, dist: 60, yaw: 0, pitch: 1.5 })
    cam.update(0)
    renderer.render(scene, camera)
    const gl = renderer.getContext()
    const px = new Uint8Array(lado * lado * 4)
    gl.readPixels(Math.round(gl.drawingBufferWidth / 2 - lado / 2), Math.round(gl.drawingBufferHeight / 2 - lado / 2), lado, lado, gl.RGBA, gl.UNSIGNED_BYTE, px)
    const suma = [0, 0, 0]
    for (let i = 0; i < px.length; i += 4) for (let c = 0; c < 3; c++) suma[c] += px[i + c]
    return suma.map((s) => s / (lado * lado))
  }, { epoca, x, z, lado })
}
const distancia = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

test('los hitos son una sola malla con los atributos de su material y los uniforms de la ciudad', async ({ page }) => {
  const errores = []
  page.on('console', (m) => { if (m.type() === 'error' && /shader|WebGLProgram|GLSL/i.test(m.text())) errores.push(m.text()) })
  await listo(page)
  const hitos = await page.evaluate(() => {
    const { hitos, scene, ciudad } = window.lab
    return hitos && {
      nombre: hitos.name,
      enEscena: scene.children.filter((m) => m.name === 'hitos').length,
      atributos: Object.keys(hitos.geometry.attributes).sort(),
      triangulos: hitos.geometry.index.count / 3,
      comparte: ['uOla', 'uColor', 'uEpocaDe', 'uEpocaA', 'uOlaEpoca', 'tRelieve'].every((k) => hitos.material.uniforms[k] === ciudad.U[k]),
      ids: hitos.userData.rangos.map((r) => r.id),
    }
  })
  expect(hitos).not.toBeNull()
  expect(hitos.nombre).toBe('hitos')
  expect(hitos.enEscena).toBe(1)
  expect(hitos.atributos).toEqual(['aAncla', 'aColor', 'aHito', 'aUv', 'aVida', 'normal', 'position'])
  expect(hitos.triangulos).toBeGreaterThan(1000)
  expect(hitos.comparte).toBe(true)
  expect(hitos.ids).toContain('plaza-bolivar')
  // el shader compila y dibuja, en color y en tinta
  await colorDeLaPlaza(page, 3)
  await page.evaluate(() => { window.lab.ciudad.U.uColor.value = 0; window.lab.renderer.render(window.lab.scene, window.lab.camera) })
  expect(errores).toEqual([])
})

test('al cambiar de época cambia lo que se ve en la Plaza Bolívar: vacía, mercado, jardín con estatua', async ({ page }) => {
  await listo(page)
  const [vacia, mercado, mercado43, jardin, damero] = [
    await colorDeLaPlaza(page, 0), await colorDeLaPlaza(page, 1), await colorDeLaPlaza(page, 2),
    await colorDeLaPlaza(page, 3), await colorDeLaPlaza(page, 5),
  ]
  // 1578: sin hito, se ve la hoja; 1772 y 1843: el piso de tierra del mercado; desde 1889, la estatua en el centro
  expect(distancia(vacia, mercado)).toBeGreaterThan(12)
  expect(distancia(mercado, mercado43)).toBeLessThan(3)
  expect(distancia(mercado43, jardin)).toBeGreaterThan(12)
  expect(distancia(jardin, damero)).toBeLessThan(25)
  // la estatua de bronce sobre piedra oscura: el centro es más oscuro que la tierra del mercado
  expect(jardin[0] + jardin[1] + jardin[2]).toBeLessThan(mercado[0] + mercado[1] + mercado[2])
})

test('acostada la ciudad, los hitos no se dibujan (la hoja queda limpia)', async ({ page }) => {
  await listo(page)
  const levantada = await colorDeLaPlaza(page, 3)
  const acostada = await page.evaluate(() => {
    const { ciudad: { U }, renderer, scene, camera } = window.lab
    U.uOla.value = 0
    U.uColor.value = 0
    renderer.render(scene, camera)
    const gl = renderer.getContext()
    const px = new Uint8Array(4)
    gl.readPixels(Math.round(gl.drawingBufferWidth / 2), Math.round(gl.drawingBufferHeight / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    return [...px.slice(0, 3)]
  })
  // en tinta y acostada, el centro de la vista es el papel del plano (claro), no el bronce de la estatua
  expect(acostada[0] + acostada[1] + acostada[2]).toBeGreaterThan(levantada[0] + levantada[1] + levantada[2] + 60)
})

test('con la ciudad real, las casas genéricas no pisan la Plaza Bolívar', async ({ page }) => {
  await listo(page)
  // la ciudad real viene con su línea de tiempo (el .pak se sirve sin tipo de contenido: no sirve de señal)
  const hay = await hayDato(page, 'datos/crece.json', 'json')
  test.skip(!hay, 'sin la ciudad real (datos fuera del repo)')
  await page.waitForFunction(() => window.lab.scene.children.some((m) => m.geometry?.attributes?.aPared), null, { timeout: 60000 })
  const pisan = await page.evaluate(() => {
    const g = window.lab.scene.children.find((m) => m.geometry?.attributes?.aPared).geometry
    const { aAncla, aVida } = g.attributes
    let n = 0
    // el recuadro de la plaza (86 × 82 m) alrededor de su centro, con margen: ningún techo que viva con ella tiene el ancla ahí
    for (let i = 0; i < aAncla.count; i++) {
      // la plaza es hito desde la época 1: cuenta el techo que vive en alguna época de 1 a 5
      const [nace, muere] = [aVida.getX(i), aVida.getY(i)]
      const viveConLaPlaza = nace < 6 && (muere === 0 || muere > 1)
      if (Math.abs(aAncla.getX(i) - 4) < 36 && Math.abs(aAncla.getY(i) - 2.5) < 34 && viveConLaPlaza) n++
    }
    return n
  })
  expect(pisan).toBe(0)
})
