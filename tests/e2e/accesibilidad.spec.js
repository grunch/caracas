import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Accesibilidad (T72): axe en cada estado de la interfaz, con las reglas de WCAG 2.2 A y AA, y la vista con el
// teclado. Ventana chica y sin lo que más cuesta dibujar por software, para no alargar el CI.
test.use({ viewport: { width: 900, height: 640 } })
const REGLAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function sinViolaciones(page, estado) {
  // los paneles aparecen con un fundido: a mitad de camino, axe mediría el contraste de un texto medio transparente
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))
  const { violations } = await new AxeBuilder({ page }).withTags(REGLAS).analyze()
  const resumen = violations.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`)
  expect(resumen, estado).toEqual([])
}

async function quieta(page) {
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 9000 })
}

test('sin violaciones de WCAG 2.2 AA: la bienvenida, la vista, el Acerca y el buscador', async ({ page }) => {
  // ?quieto: sin la entrada. Al cerrar la bienvenida la cámara baja volando al centro, y a mitad del vuelo los
  // carteles de las marcas se enciman y se cortan en el borde: axe mediría un cuadro de paso, distinto cada vez
  await page.goto('/?intro&quieto&sombras=0&contorno=0&grano=0')
  await quieta(page)
  await sinViolaciones(page, 'la bienvenida')
  await page.keyboard.press('Escape')
  await sinViolaciones(page, 'la vista')
  await page.keyboard.press('F1')
  await expect(page.locator('#acerca')).toHaveClass(/ver/)
  await sinViolaciones(page, 'el Acerca')
  await page.keyboard.press('Escape')
  await page.locator('#buscar input').fill('la torre')
  await sinViolaciones(page, 'el buscador con sugerencias')
})

test('la vista se mueve con el teclado: flechas, Mayús y flechas, + y −; dentro del Acerca, no', async ({ page }) => {
  await page.goto('/?sinintro&sombras=0&contorno=0&grano=0')
  await quieta(page)
  const destino = () => page.evaluate(() => ({ ...window.lab.cam.goal }))
  const antes = await destino()

  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowRight')
  const movida = await destino()
  expect(Math.hypot(movida.x - antes.x, movida.z - antes.z)).toBeGreaterThan(1)

  await page.keyboard.press('Shift+ArrowLeft')
  expect((await destino()).yaw).toBeLessThan(antes.yaw)

  await page.keyboard.press('+')
  await page.keyboard.press('+')
  expect((await destino()).dist).toBeLessThan(antes.dist)

  // con el Acerca abierto, las flechas desplazan su texto y la vista queda quieta
  await page.keyboard.press('F1')
  await expect(page.locator('#acerca')).toHaveClass(/ver/)
  const quieto = await destino()
  await page.keyboard.press('ArrowDown')
  expect(await destino()).toEqual(quieto)

  // y el lienzo dice qué es
  await expect(page.locator('#view canvas')).toHaveAttribute('role', 'img')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Caracas, de 1772 a 1936')
})
