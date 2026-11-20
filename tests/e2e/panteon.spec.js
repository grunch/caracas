import { test, expect } from '@playwright/test'

test('Trinidad y Panteón se dibujan distintos en sus cuatro épocas y comparten tinta y relieve', async ({ page }) => {
  const errores = []
  page.on('pageerror', e => errores.push(e.message))
  page.on('console', m => { if (/shader|WebGLProgram|GLSL/i.test(m.text()) && m.type() === 'error') errores.push(m.text()) })
  await page.goto('/?sinintro&capture')
  await page.waitForFunction(() => window.lab?.ready === true)
  const resultado = await page.evaluate(async () => {
    const { Scene, Mesh, OrthographicCamera, Color } = await import('/node_modules/three/build/three.module.js')
    const { hitos, renderer, ciudad: { U } } = window.lab
    const rango = hitos.userData.rangos.find(r => r.id === 'panteon')
    const g = hitos.geometry.clone(), indices = g.index.array
    let desde = 0
    while (indices[desde] < rango.desde) desde++
    let hasta = desde
    while (hasta < indices.length && indices[hasta] < rango.hasta) hasta++
    g.setDrawRange(desde, hasta - desde)
    const escena = new Scene(); escena.background = new Color(0xcccccc)
    const m = new Mesh(g, hitos.material); m.frustumCulled = false; escena.add(m)
    const camara = new OrthographicCamera(-26, 26, 52, -3, .1, 300)
    // Frente al sur del ancla del plano, mirando al norte; cota cero para aislar la fachada.
    camara.position.set(213.4 - .118 * 110, 0, -767 + .993 * 110)
    camara.lookAt(213.4, 0, -767)
    const claves = ['uEpocaDe', 'uEpocaA', 'uOlaEpoca', 'uOla', 'uColor', 'uExageracion']
    const anteriores = Object.fromEntries(claves.map(k => [k, U[k].value]))
    const tomas = []
    try {
      U.uOla.value = 1e5; U.uOlaEpoca.value = 9000; U.uExageracion.value = 0
      for (const [epoca, color] of [[1,1],[2,1],[3,1],[4,1],[5,1],[5,0]]) {
        U.uEpocaDe.value = U.uEpocaA.value = epoca; U.uColor.value = color
        renderer.render(escena, camara)
        const gl = renderer.getContext(), pixeles = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4)
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixeles)
        tomas.push(pixeles)
      }
      const diferencias = tomas.slice(1).map((p, j) => {
        let n = 0
        for (let i = 0; i < p.length; i += 4) if (Math.abs(p[i] - tomas[j][i]) + Math.abs(p[i+1] - tomas[j][i+1]) + Math.abs(p[i+2] - tomas[j][i+2]) > 12) n++
        return n
      })
      return { diferencias, relieveCompartido: hitos.material.uniforms.tRelieve === U.tRelieve }
    } finally {
      for (const k of claves) U[k].value = anteriores[k]
      g.dispose()
    }
  })
  expect(resultado.relieveCompartido).toBe(true)
  for (const diferencia of resultado.diferencias) expect(diferencia).toBeGreaterThan(100)
  expect(errores).toEqual([])
})
