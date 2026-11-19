import { test, expect } from '@playwright/test'

// La bienvenida y el «Acerca» no necesitan la ciudad ni el plano: sin ellos (como en la demo de CI) la página
// carga en un instante. Un solo test con dos cargas de página (la primera visita y la vuelta), para no alargar
// el CI; y con el render por software cada cuadro cuesta, así que va sin sombras, contorno ni grano, en una
// ventana chica, y se corta la ola de época del arranque (sin línea de tiempo dura decenas de cuadros).
test.use({ viewport: { width: 900, height: 640 } })

const LIVIANO = '/?sombras=0&contorno=0&grano=0' // sin ?sinintro ni ?capture: es la primera visita de verdad
/** La página arrancó (con o sin la bienvenida puesta) y ya no tiene nada que dibujar. */
async function quieta(page) {
  await page.waitForFunction(() => window.lab?.ready === true)
  await page.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 9000 })
}

const PESADOS = /\/(datos\/(ciudad\.pak|arboles\.bin|relieve\.bin)|plano\/[^?]*\.(webp|png))(\?.*)?$/
const CREDITOS = {
  mapas: [
    { id: 'viejo', año: 1889, titulo: 'Plano de prueba de 1889', hojas: 1, autor: 'Un agrimensor', institucion: 'Archivo de prueba', url: 'https://commons.wikimedia.org/wiki/File:Prueba.jpg', licencia: 'Dominio público (Wikimedia Commons)', porVerificar: false, base: false, epocas: [1889] },
    { id: 'base', año: 1936, titulo: 'Plano base de prueba', hojas: 2, autor: 'Cartografía de prueba', institucion: 'Biblioteca de prueba', url: 'https://archive.org/details/prueba', licencia: 'Sin licencia declarada en la fuente; derechos por verificar.', porVerificar: true, base: true, epocas: [1936] },
  ],
  datos: [{ id: 'osm', titulo: 'Calles de hoy', autor: 'Colaboradores de OpenStreetMap', url: 'https://www.openstreetmap.org/copyright', licencia: 'Open Database License (ODbL) 1.0', porVerificar: false, atribucion: '© colaboradores de OpenStreetMap' }],
  fotos: [{ id: 'f', titulo: 'La plaza, de prueba.', autor: 'Autor desconocido', fecha: '1910', licencia: 'Dominio público', url: 'https://commons.wikimedia.org/wiki/File:F.jpg' }],
  programas: [{ nombre: 'three', version: '0.0.0', licencia: 'MIT', url: 'https://threejs.org/' }],
}

test('la bienvenida sale una vez y se cierra con el teclado; «?» abre el Acerca con sus fuentes, y sin la lista lo dice', async ({ page }) => {
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  let hayCreditos = true
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/datos/crece.json', (ruta) => ruta.fulfill({ status: 404 }))
  await page.route(PESADOS, (ruta) => ruta.fulfill({ status: 404 }))
  await page.route('**/datos/creditos.json', (ruta) => (hayCreditos ? ruta.fulfill({ json: CREDITOS }) : ruta.fulfill({ status: 404 })))

  // --- primera visita: la bienvenida, sin frenar la carga ---
  await page.goto(LIVIANO)
  const intro = page.getByRole('dialog', { name: 'Caracas, de 1772 a 1936' })
  await expect(intro).toBeVisible()
  await expect(intro.getByRole('button', { name: 'Ver crecer la ciudad' })).toBeFocused()
  await expect(intro).toContainText('son una reconstrucción')
  await quieta(page) // la página arranca igual con la bienvenida puesta
  // es modal: las teclas no llegan a los atajos de atrás
  const nombres = page.locator('#nombres') // «M» muestra u oculta los nombres: el atajo más liviano de probar
  await page.keyboard.press('Tab')
  await page.keyboard.press('m')
  await expect(nombres).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(intro).toBeHidden()
  expect(await page.evaluate(() => localStorage.getItem('caracas:intro-vista'))).toBe('1')

  // --- «?» abre el panel: secciones, controles de la tabla y fuentes con su licencia ---
  await page.keyboard.press('?')
  const panel = page.getByRole('dialog', { name: 'Caracas, de 1772 a 1936' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('heading', { level: 3 })).toHaveText(['Qué estás viendo', 'Cómo moverte', 'Las épocas', 'Fuentes y licencias', 'Créditos'])
  await expect(panel.locator('kbd')).toHaveText(['Espacio', 'C', 'H', 'M', 'P', '/', '? o F1'])
  await expect(panel.getByText('no trae la línea de tiempo')).toBeVisible() // crece.json no está, como en la demo
  await panel.getByRole('navigation').getByRole('button', { name: 'Fuentes y licencias' }).click()
  const fuentes = panel.locator('section', { has: page.getByRole('heading', { name: 'Fuentes y licencias' }) })
  await expect(fuentes.getByRole('heading', { name: 'Fuentes y licencias' })).toBeFocused()
  await expect(fuentes.locator('.fuentes').first().locator('li')).toHaveCount(2)
  await expect(fuentes.locator('.lic.verificar')).toHaveText('por verificar Sin licencia declarada en la fuente; derechos por verificar.')
  await expect(fuentes.getByRole('link', { name: 'Ver en archive.org ↗' })).toHaveAttribute('rel', 'noopener')
  await expect(fuentes.getByText('© colaboradores de OpenStreetMap')).toBeVisible()
  await expect(panel.getByRole('link', { name: 'baires.mormon.garden' })).toHaveAttribute('href', 'https://baires.mormon.garden/')
  // modal también: «M» no llega al visor; Escape lo cierra y el foco vuelve al «?»
  await page.keyboard.press('m')
  await expect(nombres).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(page.locator('#ayuda')).toBeFocused()
  // cerrado, los atajos vuelven (con el foco en un botón las letras son del botón: se lo quitamos)
  await page.keyboard.press('m')
  await expect(nombres).toHaveAttribute('aria-pressed', 'true')
  await page.locator('#ayuda').blur()
  await page.keyboard.press('m')
  await expect(nombres).toHaveAttribute('aria-pressed', 'false')

  // --- la vuelta: ya no hay bienvenida; sin la lista de fuentes (la demo de CI) el panel lo dice ---
  hayCreditos = false
  await page.reload()
  await quieta(page)
  await expect(page.locator('#intro')).toBeHidden()
  await page.locator('#ayuda').click()
  await expect(panel).toBeVisible()
  await expect(panel.getByText('no trae la lista de fuentes')).toBeVisible()
  await expect(panel.getByRole('link', { name: 'el repositorio' })).toHaveAttribute('href', 'https://github.com/grunch/caracas')
  await panel.getByRole('button', { name: 'Cerrar' }).click()
  await expect(panel).toBeHidden()
  expect(errores).toEqual([])
})
