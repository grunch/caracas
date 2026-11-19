import { test, expect } from '@playwright/test'
import { hayDato } from './datos.js'

// Vista chica: estos tests dibujan la ciudad levantada varias veces y en CI el render es por software
// (SwiftShader); a tamaño completo le quitan la CPU a los tests del visor, que corren en paralelo.
test.use({ viewport: { width: 400, height: 300 } })

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
/** ¿Esta copia sirve el relieve? (la demo no lo trae; la muestra de datos, sí). */
async function hayRelieve(page) {
  await page.goto('/?sinintro&capture')
  return hayDato(page, 'datos/relieve.bin', 'octet-stream')
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
  expect(hitos.ids).toEqual(expect.arrayContaining(['plaza-bolivar', 'catedral', 'santa-capilla', 'panteon']))
  // el shader compila y dibuja, en color y en tinta
  await colorDeLaPlaza(page, 3)
  await page.evaluate(() => { window.lab.ciudad.U.uColor.value = 0; window.lab.renderer.render(window.lab.scene, window.lab.camera) })
  expect(errores).toEqual([])
})

/** Las cinco épocas de la plaza, dibujadas desde arriba: vacía, mercado, mercado de 1843, jardín, damero. */
async function verLaPlaza(page) {
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
}

test('al cambiar de época cambia lo que se ve en la Plaza Bolívar: vacía, mercado, jardín con estatua', async ({ page }) => {
  // sin las épocas de la hoja ni el relieve: con crece.json, antes de 1936 el piso es papel o plano según la
  // época, y con el relieve la cámara (a 60 m de la cota 0) queda bajo el terreno levantado; lo que se mide
  // aquí es el hito (el mismo test con o sin datos pesados)
  await page.route(/\/(datos\/(crece\.json|relieve\.bin)|plano\/crece\.png)$/, (ruta) => ruta.abort())
  await verLaPlaza(page)
})

test('con el relieve real, el piso del mercado de la plaza se ve entero (falla conocida T41b)', async ({ page }) => {
  // Solo con el relieve (la muestra de datos del CI; la demo no lo trae). Falla conocida (T41b): el terreno sube
  // hacia el norte de la plaza y tapa la mitad del piso de tierra del mercado, que queda plano a la altura de sus
  // anclas. Cuando se arregle, Playwright avisa que este test ya pasa y hay que sacar esta marca.
  test.skip(!(await hayRelieve(page)), 'sin relieve no hay nada que medir')
  test.fail(true, 'T41b: el piso de los hitos no sigue el relieve donde sube')
  await verLaPlaza(page)
})

test('la Catedral aparece en 1772 y Santa Capilla recién en 1889', async ({ page }) => {
  await listo(page)
  // el tejado de la nave de la Catedral (al este de la plaza) y el de Santa Capilla (al norte), desde arriba
  const catedral = { x: 80, z: -12, lado: 20 }
  const capilla = { x: 0, z: -175, lado: 12 }
  const [c0, c1, c5] = [await colorDeLaPlaza(page, 0, catedral), await colorDeLaPlaza(page, 1, catedral), await colorDeLaPlaza(page, 5, catedral)]
  expect(distancia(c0, c1)).toBeGreaterThan(12)
  expect(distancia(c1, c5)).toBeLessThan(6)
  const [s2, s3] = [await colorDeLaPlaza(page, 2, capilla), await colorDeLaPlaza(page, 3, capilla)]
  expect(distancia(s2, s3)).toBeGreaterThan(12)
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

test('Miraflores aparece en 1911 y conserva el modelo en 1936', async ({ page }) => {
  await listo(page)
  // Mansarda frontal, al sur del centro (7958, 6360), siguiendo el eje del damero.
  const cubierta = { x: -508, z: -222, lado: 12 }
  const antes = await colorDeLaPlaza(page, 3, cubierta)
  const desde1911 = await colorDeLaPlaza(page, 4, cubierta)
  const en1936 = await colorDeLaPlaza(page, 5, cubierta)
  expect(distancia(antes, desde1911)).toBeGreaterThan(12)
  expect(distancia(desde1911, en1936)).toBeLessThan(6)
})
