import { test, expect } from '@playwright/test'

// La entrada (src/arranque.js), como la de baires: la hoja desde arriba se pone en color, la ciudad se levanta
// y la cámara baja volando al centro. Los demás E2E empiezan quietos (?sinintro o ?capture).
test.use({ viewport: { width: 900, height: 560 } })
const LIGERO = 'sombras=0&contorno=0&grano=0'

test('sin bienvenida: se pone en color, la ciudad se levanta y la cámara vuela al centro', async ({ page }) => {
  // Arrange: la bienvenida ya se vio
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  await page.addInitScript(() => localStorage.setItem('caracas:intro-vista', '1'))
  // La inclinación de partida se anota dentro de la página, cuadro a cuadro: leerla desde afuera después de
  // `lab.ready` llega tarde en una máquina lenta, con la cámara ya bajando (daba 1,25–1,39 en vez de > 1,4).
  await page.addInitScript(() => {
    const mirar = () => {
      const cam = window.lab?.cam
      if (cam) window.__pitchDePartida = Math.max(window.__pitchDePartida ?? -Infinity, cam.goal.pitch)
      if (window.lab?.ready !== true) requestAnimationFrame(mirar)
    }
    requestAnimationFrame(mirar)
  })

  // Act
  await page.goto(`/?${LIGERO}`)
  await page.waitForFunction(() => window.lab?.ready === true)

  // Assert: arranca desde arriba y en color
  expect(await page.evaluate(() => window.__pitchDePartida)).toBeGreaterThan(1.4)
  await expect.poll(() => page.evaluate(() => window.lab.ciudad.U.uColor.value), { timeout: 60000 }).toBe(1)
  await expect(page.locator('#color')).toHaveAttribute('aria-pressed', 'true')
  // …la ciudad se levanta y la cámara llega inclinada, cerca de la plaza
  await expect.poll(() => page.evaluate(() => window.lab.ciudad.U.uOla.value), { timeout: 60000 }).toBeGreaterThan(0)
  await expect.poll(() => page.evaluate(() => window.lab.cam.volando), { timeout: 60000 }).toBe(false)
  const vista = await page.evaluate(() => ({ ...window.lab.cam.goal }))
  expect(vista.pitch).toBeLessThan(0.8)
  expect(Math.hypot(vista.x, vista.z)).toBeLessThan(600)
  expect(errores).toEqual([])
})

test('con la bienvenida abierta, la ciudad espera a que se cierre para levantarse', async ({ page }) => {
  await page.goto(`/?intro&${LIGERO}`)
  await page.waitForFunction(() => window.lab?.ready === true && window.lab.acerca.intro)
  await page.waitForTimeout(3000)
  expect(await page.evaluate(() => window.lab.ciudad.U.uOla.value)).toBe(0)

  await page.keyboard.press('Escape')
  await expect.poll(() => page.evaluate(() => window.lab.ciudad.U.uOla.value), { timeout: 60000 }).toBeGreaterThan(0)
})

test('?quieto empieza quieto: en tinta, acostada y sin vuelo', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('caracas:intro-vista', '1'))
  await page.goto(`/?quieto&${LIGERO}`)
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.waitForTimeout(3000)
  const estado = await page.evaluate(() => ({ ola: window.lab.ciudad.U.uOla.value, color: window.lab.ciudad.U.uColor.value, volando: window.lab.cam.volando }))
  expect(estado).toEqual({ ola: 0, color: 0, volando: false })
})

test('con «reducir movimiento» llega directo al final: en color, levantada y en el centro, sin animar', async ({ browser }) => {
  // Arrange: en cada cuadro se anotan el color y la ola, para ver que nunca pasan por valores intermedios
  const contexto = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 900, height: 560 } })
  const page = await contexto.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('caracas:intro-vista', '1')
    window.vistos = []
    const anotar = () => {
      const U = window.lab?.ciudad?.U
      if (U) window.vistos.push({ color: U.uColor.value, ola: U.uOla.value })
      requestAnimationFrame(anotar)
    }
    requestAnimationFrame(anotar)
  })

  // Act
  await page.goto(`/?${LIGERO}`)
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.waitForTimeout(3000)

  // Assert
  const { vistos, volando, pitch, olaFinal } = await page.evaluate(() => ({
    vistos: window.vistos, volando: window.lab.cam.volando, pitch: window.lab.cam.goal.pitch, olaFinal: window.lab.ciudad.U.uOla.value,
  }))
  expect(vistos.length).toBeGreaterThan(0)
  expect(vistos.filter((v) => v.color > 0 && v.color < 1)).toEqual([])
  expect(vistos.filter((v) => v.ola > 0 && v.ola < olaFinal)).toEqual([])
  expect(olaFinal).toBeGreaterThan(0)
  expect(volando).toBe(false)
  expect(pitch).toBeLessThan(0.8)
  await contexto.close()
})

test('si la persona levanta y vuelve a acostar la ciudad durante la bienvenida, la entrada no se la levanta', async ({ page }) => {
  await page.goto(`/?intro&${LIGERO}`)
  await page.waitForFunction(() => window.lab?.ready === true && window.lab.acerca.intro)
  // (los botones quedan detrás de la bienvenida: se usa la misma función que el botón)
  await page.evaluate(() => { window.lab.levantar(true); window.lab.levantar(false) })

  await page.keyboard.press('Escape')
  await page.waitForTimeout(4000)
  expect(await page.evaluate(() => window.lab.ciudad.U.uOla.value)).toBe(0)
})
