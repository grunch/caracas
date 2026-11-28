import { expect, test } from '@playwright/test'

test('el Hospital Vargas aparece desde 1889 y conserva fases hasta 1946', async ({ page }) => {
  const errores = []
  page.on('pageerror', e => errores.push(e.message))
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready)
  const datos = await page.evaluate(() => {
    const rango = window.lab.hitos.userData.rangos.find(r => r.id === 'hospital-vargas')
    if (!rango) return null
    const vida = window.lab.hitos.geometry.getAttribute('aVida')
    const fases = new Set()
    for (let i = rango.desde; i < rango.hasta; i++) fases.add(`${vida.getX(i)}/${vida.getY(i)}`)
    return { vertices: rango.hasta - rango.desde, fases: [...fases] }
  })
  expect(datos?.vertices).toBeGreaterThan(1000)
  expect(datos?.fases).toEqual(expect.arrayContaining(['3/4', '4/5', '5/0']))
  // ningún vértice nace antes de 1889 (época 3): en 1772 y 1843 el hospital no se dibuja
  expect(datos.fases.filter(f => Number(f.split('/')[0]) < 3)).toEqual([])
  for (const epoca of [1, 2, 3, 4, 5, 6]) {
    await page.evaluate(e => window.lab.lineaDeTiempo.elegir(e), epoca)
    await page.waitForFunction(e => Math.round(window.lab.ciudad.U.uEpocaA.value) === e, epoca)
    await page.evaluate(() => { window.lab.levantar(true); window.lab.renderer.render(window.lab.scene, window.lab.camera) })
  }
  expect(errores).toEqual([])
})
