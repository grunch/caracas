import { test, expect } from '@playwright/test'

// El cielo de los recorridos (src/cielo.js): al caminar, manejar o volar, papel en tinta y celeste en color; en el
// mapa, la mesa (src/mesa.js).
test.use({ viewport: { width: 900, height: 560 } })

/**
 * El color promedio del centro del cuadro con la cámara mirando hacia arriba, al norte (en coche o en avión
 * la cámara mira abajo y el Ávila llena la parte de arriba): se dibuja un cuadro así y la cámara vuelve.
 */
const arriba = (page) => page.evaluate(() => {
  const { renderer, acabado, camera } = window.lab
  const gl = renderer.getContext()
  const antes = camera.quaternion.clone()
  const p = camera.position
  camera.lookAt(p.x, p.y + 1000, p.z - 600)
  camera.updateMatrixWorld()
  acabado.dibujar()
  const lado = 40
  const px = new Uint8Array(lado * lado * 4)
  gl.readPixels((gl.drawingBufferWidth - lado) >> 1, (gl.drawingBufferHeight - lado) >> 1, lado, lado, gl.RGBA, gl.UNSIGNED_BYTE, px)
  camera.quaternion.copy(antes)
  camera.updateMatrixWorld()
  const s = [0, 0, 0]
  for (let i = 0; i < px.length; i += 4) for (let k = 0; k < 3; k++) s[k] += px[i + k]
  return s.map((v) => v / (px.length / 4))
})

for (const modo of ['caminar', 'manejar', 'volar']) {
  test(`al ${modo} el cielo es papel en tinta, celeste en color, y al volver al mapa se va`, async ({ page }) => {
    const errores = []
    page.on('pageerror', (e) => errores.push(e.message))
    await page.goto('/?sinintro&sombras=0&contorno=0&grano=0')
    await page.waitForFunction(() => window.lab?.ready === true)
    await page.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 9000 })
    expect(await page.evaluate(() => window.lab.cielo.malla.visible)).toBe(false)

    await page.locator(`#${modo}`).click()
    await expect(page.locator('body')).toHaveClass(new RegExp(`modo-${modo}`))
    expect(await page.evaluate(() => window.lab.cielo.malla.visible)).toBe(true)
    // en tinta (el de entrada) el cielo es del papel: tibio y claro, sin azul
    await expect.poll(async () => { const [r, g, b] = await arriba(page); return r - b > 5 && g > 190 }, { timeout: 30000 }).toBe(true)
    // en color, celeste (con la misma transición que la ciudad)
    await page.evaluate(() => window.lab.alternarColor(true))
    await expect.poll(() => page.evaluate(() => window.lab.ciudad.U.uColor.value), { timeout: 30000 }).toBe(1)
    await expect.poll(async () => { const [r, , b] = await arriba(page); return b - r }, { timeout: 30000 }).toBeGreaterThan(20)

    await page.keyboard.press('Escape')
    await expect(page.locator('body')).not.toHaveClass(new RegExp(`modo-${modo}`))
    expect(await page.evaluate(() => window.lab.cielo.malla.visible)).toBe(false)
    expect(errores).toEqual([])
  })
}
