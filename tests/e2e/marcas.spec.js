import { test, expect } from '@playwright/test'

// Las marcas no dependen de los datos pesados: sus posiciones están en el código y la época se fija con los
// uniforms (como en hitos.spec.js), así que corren igual sobre la ciudad de demostración de CI.
test.use({ viewport: { width: 900, height: 640 } })

const listo = async (page) => {
  await page.goto('/?sinintro&capture')
  await page.waitForFunction(() => window.lab?.ready === true)
}

/** Fija la época (sin ola) y la cámara, y espera a que el bucle dibuje las marcas de ese cuadro. */
async function ver(page, epoca, vista = { x: 0, z: 40, dist: 800, yaw: 0, pitch: 0.9 }) {
  await page.evaluate(({ epoca, vista }) => {
    const { ciudad: { U }, cam, pedirCuadro } = window.lab
    U.uEpocaDe.value = U.uEpocaA.value = epoca
    U.uOlaEpoca.value = 9000
    cam.jump(vista)
    window.__cuadro = false
    requestAnimationFrame(() => { pedirCuadro(3); requestAnimationFrame(() => requestAnimationFrame(() => { window.__cuadro = true })) })
  }, { epoca, vista })
  await page.waitForFunction(() => window.__cuadro === true)
  return page.evaluate(() => window.lab.marcas.visibles)
}
const nombres = (visibles) => visibles.map((v) => v.nombre)

test('las marcas cambian con la época: Plaza Mayor en 1772, Plaza Bolívar y Capitolio en 1889', async ({ page }) => {
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  await listo(page)

  const en1772 = nombres(await ver(page, 1))
  expect(en1772).toContain('Plaza Mayor')
  expect(en1772).not.toContain('Plaza Bolívar')
  expect(en1772).not.toContain('Capitolio')
  await expect(page.locator('#marcas .marca.ver .tag', { hasText: 'Plaza Mayor' })).toBeVisible()

  const en1889 = nombres(await ver(page, 3))
  expect(en1889).toContain('Plaza Bolívar')
  expect(en1889).toContain('Capitolio')
  expect(en1889).not.toContain('Plaza Mayor')
  await expect(page.locator('#marcas .marca.ver .tag', { hasText: 'Plaza Bolívar' })).toBeVisible()
  await expect(page.locator('#marcas .marca.ver .tag', { hasText: 'Plaza Mayor' })).toHaveCount(0)
  expect(errores).toEqual([])
})

test('de lejos solo se ven las marcas de nivel 1; al acercarse aparecen las demás, sin pisarse', async ({ page }) => {
  await listo(page)
  const lejos = await ver(page, 5, { x: 0, z: 0, dist: 7000, yaw: 0, pitch: 1 })
  expect(lejos.length).toBeGreaterThan(0)
  expect(lejos.every((v) => v.nivel === 1)).toBe(true)

  const cerca = await ver(page, 5)
  expect(cerca.some((v) => v.nivel === 3)).toBe(true)
  expect(cerca.length).toBeGreaterThan(lejos.length)
  // los carteles que se ven no se tocan entre sí
  const cajas = await page.locator('#marcas .marca.ver .tag').evaluateAll((tags) => tags.map((t) => t.getBoundingClientRect().toJSON()))
  expect(cajas.length).toBe(cerca.length)
  for (const [i, a] of cajas.entries()) {
    for (const b of cajas.slice(i + 1)) {
      expect(a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom, `${JSON.stringify(a)} con ${JSON.stringify(b)}`).toBe(false)
    }
  }
})

test('la M y el botón «Nombres» muestran y ocultan las marcas', async ({ page }) => {
  await listo(page)
  await ver(page, 5)
  const boton = page.getByRole('button', { name: 'Nombres' })
  await expect(boton).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#marcas .marca.ver .tag').first()).toBeVisible()

  await page.keyboard.press('KeyM')
  await expect(boton).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('#marcas')).toBeHidden()
  expect(await page.evaluate(() => window.lab.marcas.visibles.length)).toBe(0)

  await boton.click()
  await expect(boton).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#marcas .marca.ver .tag').first()).toBeVisible()
})

test('pasar el mouse por una marca vela las demás; al tocarla la cámara vuela al lugar y avisa', async ({ page }) => {
  await listo(page)
  await ver(page, 5)
  await page.evaluate(() => {
    window.__abiertas = []
    window.lab.marcas.alAbrirMarca = (m) => window.__abiertas.push(`callback:${m.id}`)
    addEventListener('abrirmarca', (e) => window.__abiertas.push(`evento:${e.detail.id}`))
  })
  const cartel = page.locator('#marcas .marca.ver .tag', { hasText: 'Capitolio' })
  await cartel.hover()
  await expect(page.locator('#marcas')).toHaveClass(/velo/)
  expect(await page.evaluate(() => window.lab.marcas.sobre)).toBe('capitolio')

  await cartel.click()
  expect(await page.evaluate(() => window.__abiertas)).toEqual(['callback:capitolio', 'evento:capitolio'])
  const { destino, marca } = await page.evaluate(() => {
    const { cam, marcas } = window.lab
    return { destino: { x: cam.goal.x, z: cam.goal.z, dist: cam.goal.dist }, marca: marcas.marcas.find((m) => m.id === 'capitolio') }
  })
  expect(destino.x).toBeCloseTo(marca.x, 3)
  expect(destino.z).toBeCloseTo(marca.z, 3)
  expect(destino.dist).toBeLessThanOrEqual(800)
  expect(await page.evaluate(() => window.lab.marcas.abierta)).toBe('capitolio')
})

test('las marcas son botones con nombre: se llega con el teclado', async ({ page }) => {
  await listo(page)
  await ver(page, 5)
  await expect(page.getByRole('group', { name: 'Lugares de la ciudad' })).toBeVisible()
  const plaza = page.getByRole('button', { name: /Plaza Bolívar/ })
  await plaza.focus()
  await expect(plaza).toBeFocused()
  expect(await page.evaluate(() => window.lab.marcas.sobre)).toBe('plaza-bolivar')
})
