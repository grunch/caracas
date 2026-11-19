import { test, expect } from '@playwright/test'

/** Abre el visor y junta los errores de la página y los de compilación de shaders (three.js los manda a la consola). */
async function abrir(page, consulta = '') {
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && /shader|program|webgl/i.test(m.text())) errores.push(m.text().slice(0, 400)) })
  await page.goto(`/?sinintro${consulta}`)
  await page.waitForFunction(() => window.lab?.ready === true)
  return errores
}

/** Dibuja un cuadro entero ahora y dice si WebGL quedó sin errores y con todos sus programas enlazados. */
const dibujarYRevisar = (page) => page.evaluate(() => {
  const { renderer, acabado } = window.lab
  acabado.dibujar()
  const gl = renderer.getContext()
  return {
    error: gl.getError(),
    programas: renderer.info.programs.length,
    rotos: renderer.info.programs.filter((p) => p.diagnostics && !p.diagnostics.runnable).length,
  }
})

/** Acostada en la hoja nada tira sombra y el mapa ni se dibuja: se levanta la ciudad y se espera el primer mapa. */
async function conSombras(page) {
  await page.evaluate(() => window.lab.levantar(true))
  await page.waitForFunction(() => window.lab.acabado.estado.cuadrosDeSombra > 0)
}

const esSoftware = (page) => page.evaluate(() => {
  const gl = window.lab.renderer.getContext()
  const nombre = gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER)
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(String(nombre))
})

// Cada test abre la página una sola vez: con render por software (CI) cargarla es lo que más tarda.

test('el acabado está prendido: la escena pasa por su textura y llega a la pantalla; el sol es uno solo', async ({ page }) => {
  const errores = await abrir(page)
  const estado = await page.evaluate(() => window.lab.acabado.estado)
  expect(estado).toMatchObject({ pasada: true, contorno: true, grano: true })
  // con render por software (CI) las sombras no se pagan; con GPU, el mapa entero (o 2048 en liviano)
  if (await esSoftware(page)) expect(estado.sombras).toBe(0)
  else expect(estado.sombras).toBeGreaterThanOrEqual(2048)
  expect(await dibujarYRevisar(page)).toMatchObject({ error: 0, rotos: 0 })

  // la textura intermedia mide lo que la pantalla y trae su profundidad (de ahí sale el contorno)
  const medidas = await page.evaluate(() => {
    const { renderer, acabado } = window.lab
    const gl = renderer.getContext()
    const px = new Uint8Array(4)
    acabado.dibujar()
    gl.readPixels(gl.drawingBufferWidth >> 1, gl.drawingBufferHeight >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    return {
      ancho: acabado.destino.width, alto: acabado.destino.height, x: gl.drawingBufferWidth, y: gl.drawingBufferHeight,
      profundidad: acabado.destino.depthTexture?.isDepthTexture === true, claro: px[0] + px[1] + px[2],
    }
  })
  expect(medidas.ancho).toBe(medidas.x)
  expect(medidas.alto).toBe(medidas.y)
  expect(medidas.profundidad).toBe(true)
  expect(medidas.claro).toBeGreaterThan(150) // la pantalla no queda en negro: el papel del plano llega al canvas

  // la luz de la escena y el uniform de los shaders apuntan igual, entre 35° y 40° sobre el horizonte
  const sol = await page.evaluate(() => {
    const { scene, ciudad } = window.lab
    const luz = scene.children.find((o) => o.isDirectionalLight)
    return { luz: luz.position.clone().normalize().toArray(), uniforme: ciudad.U.uSol.value.toArray() }
  })
  for (let i = 0; i < 3; i++) expect(sol.luz[i]).toBeCloseTo(sol.uniforme[i], 6)
  expect(sol.uniforme[1]).toBeGreaterThan(0.55)
  expect(sol.uniforme[1]).toBeLessThan(0.65)
  expect(errores).toEqual([])
})

test('con ?sombras=512 el mapa de sombras se dibuja (también por software), sus shaders compilan y no se rehace de más', async ({ page }) => {
  const errores = await abrir(page, '&sombras=512')
  expect((await page.evaluate(() => window.lab.acabado.estado)).sombras).toBe(512)
  // con la ciudad acostada no hay sombras: ni mapa ni lectura, y WebGL no se queja del mapa vacío
  expect(await page.evaluate(() => { window.lab.acabado.dibujar(); return [window.lab.acabado.estado.cuadrosDeSombra, window.lab.ciudad.U.uSombra.value.x] })).toEqual([0, 0])
  expect(await dibujarYRevisar(page)).toMatchObject({ error: 0, rotos: 0 })
  await conSombras(page)
  expect(await dibujarYRevisar(page)).toMatchObject({ error: 0, rotos: 0 })
  const luz = await page.evaluate(() => {
    const { ciudad, acabado, scene } = window.lab
    return {
      prendida: ciudad.U.uSombra.value.x,
      texel: ciudad.U.uSombra.value.z,
      mapa: ciudad.U.tSombra.value === acabado.mapaDeSombras.depthTexture,
      lado: acabado.mapaDeSombras.width,
      tiran: scene.children.filter((o) => o.castShadow && o.customDepthMaterial).map((o) => o.name || 'ciudad'),
    }
  })
  expect(luz.prendida).toBe(1)
  expect(luz.texel).toBeGreaterThan(0)
  expect(luz.mapa).toBe(true)
  expect(luz.lado).toBe(512)
  expect(luz.tiran).toContain('hitos')

  // el mapa no se rehace si nada cambió, y sí cuando la cámara se mueve
  const cuenta = await page.evaluate(() => {
    const { acabado, cam } = window.lab
    acabado.dibujar()
    const a = acabado.estado.cuadrosDeSombra
    acabado.dibujar()
    acabado.dibujar()
    const b = acabado.estado.cuadrosDeSombra
    cam.jump({ x: cam.goal.x + 800, dist: 900 })
    acabado.dibujar()
    return { a, b, c: acabado.estado.cuadrosDeSombra }
  })
  expect(cuenta.b).toBe(cuenta.a)
  expect(cuenta.c).toBe(cuenta.a + 1)
  expect(errores).toEqual([])
})

test('con ?sombras=0&contorno=0&grano=0 no hay ni mapa ni pasada: el render de siempre', async ({ page }) => {
  const errores = await abrir(page, '&sombras=0&contorno=0&grano=0')
  const estado = await page.evaluate(() => window.lab.acabado.estado)
  expect(estado).toMatchObject({ sombras: 0, contorno: false, grano: false, pasada: false })
  expect(await page.evaluate(() => window.lab.acabado.destino)).toBeNull()
  expect(await page.evaluate(() => window.lab.ciudad.U.uSombra.value.x)).toBe(0)
  expect(await dibujarYRevisar(page)).toMatchObject({ error: 0, rotos: 0 })
  expect(errores).toEqual([])
})

test('cada techo deja el id de su casa en el alfa del cuadro (de ahí el contorno sabe qué es un mismo tejado); el piso, cero', async ({ page }) => {
  const errores = await abrir(page)
  const alfa = await page.evaluate(() => {
    const { renderer, acabado, cam, ciudad } = window.lab
    window.lab.levantar(true)
    ciudad.U.uOla.value = 1e5 // la ciudad en pie de una vez, sin esperar la ola
    cam.jump({ x: 0, z: 0, dist: 900, yaw: 0.3, pitch: 0.9 })
    acabado.dibujar()
    const { width, height } = acabado.destino
    const px = new Uint8Array(width * height * 4)
    renderer.readRenderTargetPixels(acabado.destino, 0, 0, width, height, px)
    const cuenta = { piso: 0, techo: 0, otro: 0, ids: new Set() }
    for (let i = 3; i < px.length; i += 4) {
      if (px[i] === 0) cuenta.piso++
      else if (px[i] === 255) cuenta.otro++
      else { cuenta.techo++; cuenta.ids.add(px[i]) }
    }
    return { piso: cuenta.piso, techo: cuenta.techo, ids: cuenta.ids.size, maximo: Math.max(...cuenta.ids), total: width * height }
  })
  expect(alfa.piso).toBeGreaterThan(0.02 * alfa.total) // las calles, los patios, las paredes
  expect(alfa.techo).toBeGreaterThan(0.02 * alfa.total) // los tejados
  expect(alfa.ids).toBeGreaterThan(10) // un id por casa (1…253)
  expect(alfa.maximo).toBeLessThanOrEqual(253)
  expect(await dibujarYRevisar(page)).toMatchObject({ error: 0, rotos: 0 })
  expect(errores).toEqual([])
})
