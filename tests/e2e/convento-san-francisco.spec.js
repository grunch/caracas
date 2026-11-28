import { test, expect } from '@playwright/test'

// El convento de San Francisco (#254): se dibuja solo su tramo de la malla de hitos, desde arriba, época por época.
test('convento de San Francisco: claustro del norte en 1772, los tres patios en 1843 y nada desde 1889', async ({ page }, testInfo) => {
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && /shader|WebGLProgram|GLSL/i.test(m.text())) errores.push(m.text()) })
  await page.goto('/?sinintro&capture')
  await page.waitForFunction(() => window.lab?.ready === true && window.lab?.hitos)
  const resultado = await page.evaluate(async () => {
    const { Scene, Mesh, OrthographicCamera, Color } = await import('/node_modules/three/build/three.module.js')
    const { HITOS } = await import('/src/hitos.js')
    const { COLUMNA } = await import('/src/hitos/datos/convento-san-francisco.js')
    const { hitos, renderer, ciudad: { U }, coords } = window.lab
    const h = HITOS.find((x) => x.id === 'convento-san-francisco'), r = hitos.userData.rangos.find((x) => x.id === h.id)
    const g = hitos.geometry.clone(), indices = g.index.array
    let desde = 0; while (indices[desde] < r.desde) desde++
    let hasta = desde; while (hasta < indices.length && indices[hasta] < r.hasta) hasta++
    g.setDrawRange(desde, hasta - desde)
    const escena = new Scene(); escena.background = new Color(0xcccccc)
    const m = new Mesh(g, hitos.material); m.frustumCulled = false; escena.add(m)
    const origen = coords.aMundo(h.x, h.y), [ex, ez] = h.eje.map((v) => v / Math.hypot(...h.eje))
    // el centro de la columna de claustros: a metros al este y b metros al sur del origen
    const [a, b] = [(COLUMNA.a0 + COLUMNA.a1) / 2, (COLUMNA.b0 + COLUMNA.b1) / 2]
    const centro = { x: origen.x + ex * a - ez * b, z: origen.z + ez * a + ex * b }
    const camara = new OrthographicCamera(-60, 60, 60, -60, 0.1, 900)
    camara.position.set(centro.x - ex * 40, 300, centro.z - ez * 40)
    camara.lookAt(centro.x, 0, centro.z)
    const claves = ['uEpocaDe', 'uEpocaA', 'uOlaEpoca', 'uOla', 'uColor', 'uExageracion']
    const previos = Object.fromEntries(claves.map((k) => [k, U[k].value])), tomas = [], capturas = []
    try {
      U.uOla.value = 1e5; U.uOlaEpoca.value = 9000; U.uExageracion.value = 0; U.uColor.value = 1
      for (const epoca of [0, 1, 2, 3, 4, 5, 6]) {
        U.uEpocaDe.value = U.uEpocaA.value = epoca; renderer.render(escena, camara)
        const gl = renderer.getContext(), p = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4)
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, p); tomas.push(p)
        if (epoca > 0 && epoca < 4) capturas.push({ epoca, png: renderer.domElement.toDataURL('image/png') })
      }
      const distintos = (p, q) => { let n = 0; for (let i = 0; i < p.length; i += 4) if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 12) n++; return n }
      return { diferencias: tomas.slice(1).map((p, j) => distintos(p, tomas[j])), vacioDesde1889: distintos(tomas[3], tomas[0]), capturas }
    } finally { for (const k of claves) U[k].value = previos[k]; g.dispose() }
  })
  for (const c of resultado.capturas) await testInfo.attach(`convento-epoca-${c.epoca}`, { body: Buffer.from(c.png.split(',')[1], 'base64'), contentType: 'image/png' })
  // aparece en 1772, crece hacia el sur en 1843 y desaparece en 1889; después, nada cambia
  const [aparece, crece, desaparece, a1911, a1936, a1946] = resultado.diferencias
  for (const n of [aparece, crece, desaparece]) expect(n, `${resultado.diferencias}`).toBeGreaterThan(100)
  for (const n of [a1911, a1936, a1946]) expect(n, `${resultado.diferencias}`).toBe(0)
  expect(resultado.vacioDesde1889, 'en 1889 no queda nada del convento').toBe(0)
  expect(errores).toEqual([])
})
