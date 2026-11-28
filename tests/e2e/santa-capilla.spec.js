import { test, expect } from '@playwright/test'

// La esquina de San Mauricio / Santa Capilla (#253): la marca y la ficha cambian con la época. La geometría de cada
// etapa la mide tests/e2e/hitos.spec.js («en la esquina de San Mauricio el edificio cambia con la época»).
test.use({ viewport: { width: 900, height: 600 } })

const listo = async (page) => {
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready && window.lab?.marcasDelMapa && window.lab?.fichas && window.lab?.lineaDeTiempo)
}

test('la marca sale del hito de la Santa Capilla desde 1772 y los dos hitos están en la malla', async ({ page }) => {
  await listo(page)
  const marca = await page.evaluate(() => { const m = window.lab.marcasDelMapa.find((x) => x.id === 'santa-capilla'); return [m.hito, m.nace, m.px, m.py] })
  expect(marca).toEqual(['santa-capilla', 1, 8949, 6487])
  const ids = await page.evaluate(() => window.lab.hitos.userData.rangos.map((r) => r.id))
  expect(ids).toEqual(expect.arrayContaining(['san-mauricio', 'santa-capilla']))
})

test('la ficha se llama San Mauricio hasta 1843 y Santa Capilla desde 1889, con el texto de cada etapa', async ({ page }) => {
  test.setTimeout(180_000) // seis épocas seguidas con el render por software del CI
  await listo(page)
  const ETAPAS = [
    [1, 'San Mauricio', 'tres puertas principales hacia el occidente'],
    [2, 'San Mauricio', 'quedó el primer cuerpo'],
    [3, 'Santa Capilla', 'una capilla neogótica de una sola nave'],
    [4, 'Santa Capilla', 'una torre con aguja'],
    [5, 'Santa Capilla', 'Luis B. Castillo'],
    [6, 'Santa Capilla', 'Luis B. Castillo'],
  ]
  for (const [epoca, titulo, frase] of ETAPAS) {
    // la ficha lee la época elegida, no la que el mapa terminó de dibujar: no hace falta esperar la ola
    await page.evaluate((e) => { window.lab.lineaDeTiempo.elegir(e); window.lab.fichas.abrir('santa-capilla') }, epoca)
    await expect(page.locator('#ficha h2'), `época ${epoca}`).toHaveText(titulo)
    await expect(page.locator('#ficha'), `época ${epoca}`).toContainText(frase)
  }
})
