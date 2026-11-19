import { test, expect } from '@playwright/test'
import sharp from 'sharp'

// El papel antes de la ciudad y el visor del plano de cada época (T25b). No dependen de los datos pesados:
// la línea de tiempo, crece.png y el plano de la época se sirven de mentira, así corren igual en CI.
test.use({ viewport: { width: 900, height: 640 } })

const AÑOS = [1578, 1772, 1843, 1889, 1911, 1936]
const EPOCAS = AÑOS.map((año) => ({
  año, plano: `${año}-prueba`, titulo: `Plano de prueba de ${año}`, autor: 'Autora de prueba',
  fuente: `Archivo de prueba · https://example.org/plano-${año}`, licencia: 'Dominio público (prueba)', corto: `plano de ${año}`, casas: 1,
}))

const png = (ancho, alto, [r, g, b]) => sharp({ create: { width: ancho, height: alto, channels: 4, background: { r, g, b, alpha: 1 } } }).png().toBuffer()

/** La página con una línea de tiempo de prueba; `urbano`: crece.png entero urbanizado desde la primera época, o nunca. */
async function abrir(page, { urbano }) {
  const crece = await png(4, 4, urbano ? [255, 255, 0] : [0, 0, 0])
  const plano = await png(64, 32, [200, 60, 50])
  await page.route('**/datos/crece.json', (ruta) => ruta.fulfill({ json: { celda_m: 8, epocas: EPOCAS } }))
  await page.route('**/plano/crece.png', (ruta) => ruta.fulfill({ body: crece, contentType: 'image/png' }))
  await page.route('**/plano/epocas.json', (ruta) => ruta.fulfill({
    json: { planos: [{ año: 1772, plano: '1772-prueba', recorte: [0, 0, 10, 10], niveles: [{ url: 'plano/1772/chico.webp', lado: 64 }] }] },
  }))
  await page.route('**/plano/1772/chico.webp', (ruta) => ruta.fulfill({ body: plano, contentType: 'image/png' }))
  await page.goto('/?sinintro&capture&sinmarcas')
  await page.waitForFunction(() => window.lab?.ready === true && window.lab.lineaDeTiempo && window.lab.ciudad.U.uCrece.value.image?.width === 4)
}

/** Elige la época sin esperar la ola y cuenta la tinta (píxeles oscuros) en el centro de la vista. */
async function tintaEn(page, epoca) {
  await page.evaluate((k) => window.lab.lineaDeTiempo.elegir(k), epoca)
  await page.waitForFunction((k) => window.lab.ciudad.U.uEpocaA.value === k, epoca)
  // casi al final: el bucle la termina en el cuadro que sigue y avisa a la secuencia (si no, la próxima época esperaría)
  await page.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 8999; window.lab.pedirCuadro(3) })
  await page.waitForFunction(() => window.lab.ciudad.U.uOlaEpoca.value >= 9000)
  return page.evaluate(async () => {
    const { cam, coords: { hoja }, pedirCuadro, renderer, acabado } = window.lab
    // el centro de la hoja: ahí la cuadrícula provisoria lleva su leyenda, y cualquier plano, dibujo
    cam.jump({ x: hoja.x0 + hoja.ancho / 2, z: hoja.z0 + hoja.alto / 2, dist: 700, yaw: 0, pitch: 1.5 })
    pedirCuadro(4)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))
    acabado.dibujar() // el búfer no se conserva entre cuadros: se dibuja y se lee en la misma tarea
    const gl = renderer.getContext()
    const lado = 240
    const px = new Uint8Array(lado * lado * 4)
    gl.readPixels(Math.round(gl.drawingBufferWidth / 2 - lado / 2), Math.round(gl.drawingBufferHeight / 2 - lado / 2), lado, lado, gl.RGBA, gl.UNSIGNED_BYTE, px)
    let oscuros = 0
    let suma = 0
    for (let i = 0; i < px.length; i += 4) {
      const luz = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
      suma += luz
      if (luz < 130) oscuros++
    }
    return { oscuros, media: suma / (lado * lado) }
  })
}

test('en tinta, antes de 1936, donde todavía no hay ciudad la hoja es papel en blanco; en 1936 es el plano', async ({ page }) => {
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && /shader|program|WebGL/i.test(m.text())) errores.push(m.text()) })
  await abrir(page, { urbano: false })

  const en1936 = await tintaEn(page, 5)
  const en1772 = await tintaEn(page, 1)
  expect(en1936.oscuros).toBeGreaterThan(150) // el dibujo del plano
  expect(en1772.oscuros).toBeLessThan(en1936.oscuros / 5) // casi nada: a lo sumo, unas matas de pasto
  expect(en1772.media).toBeGreaterThan(200) // papel claro, no un hueco negro
  expect(errores).toEqual([])
})

// una sola página para todo lo que pide la ciudad urbanizada desde siempre: en CI cada carga cuesta medio minuto
test('«Ver el plano de {año}» (o P) abre el plano de la época aparte, con su crédito; y donde ya es ciudad la hoja sigue siendo el plano', async ({ page }) => {
  await abrir(page, { urbano: true })
  const boton = page.locator('#ver-plano')
  await expect(boton).toHaveText('Ver el plano de 1772')
  await boton.click()

  const visor = page.locator('#visor-plano')
  await expect(visor).toBeVisible()
  await expect(visor).toHaveJSProperty('open', true)
  await expect(page.getByRole('dialog', { name: 'Plano de prueba de 1772' })).toBeVisible()
  await expect(visor.locator('.autor')).toHaveText('Autora de prueba · 1772')
  await expect(visor.locator('.fuente a')).toHaveAttribute('href', 'https://example.org/plano-1772')
  await expect(visor.locator('.fuente')).toContainText('Licencia: Dominio público (prueba)')
  await expect(visor.locator('.nota')).toContainText('calzado sobre la hoja de 1936')
  const img = visor.locator('img')
  await expect(img).toBeVisible()
  await expect(img).toHaveJSProperty('naturalWidth', 64)

  // la rueda acerca; las teclas de la ciudad (C: color) no la tocan mientras el visor está abierto
  const k0 = await page.evaluate(() => window.lab.visorPlano.estado.k)
  await visor.locator('.lienzo').hover()
  await page.mouse.wheel(0, -400)
  await expect.poll(() => page.evaluate(() => window.lab.visorPlano.estado.k)).toBeGreaterThan(k0)
  await page.keyboard.press('c')
  await expect(page.locator('#color')).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('0')
  await expect.poll(() => page.evaluate(() => window.lab.visorPlano.estado.k)).toBe(k0)

  await page.keyboard.press('Escape')
  await expect(visor).toBeHidden()
  await expect(boton).toBeFocused()

  // donde ya es ciudad, la hoja de 1772 sigue siendo el plano (aquí no hay rótulos que quitar)
  const en1936 = await tintaEn(page, 5)
  expect(en1936.oscuros).toBeGreaterThan(150)

  // la tecla P abre el de la época elegida; el de 1936 es la hoja base
  await expect(boton).toHaveText('Ver el plano de 1936')
  await page.locator('#view canvas').first().click({ position: { x: 20, y: 300 } })
  await page.keyboard.press('p')
  await expect(visor).toBeVisible()
  await expect(visor.locator('h2')).toHaveText('Plano de prueba de 1936')
  await expect(visor.locator('.nota')).toHaveText('Es la hoja sobre la que está levantada la ciudad.')
  await visor.locator('.cerrar').click()
  await expect(visor).toBeHidden()

  const en1772 = await tintaEn(page, 1)
  expect(Math.abs(en1772.oscuros - en1936.oscuros)).toBeLessThan(en1936.oscuros * 0.15)
})
