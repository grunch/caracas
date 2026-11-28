import { expect, test } from '@playwright/test'

// El centro del tablero en metros del mundo (docs/puentes-guaire-calce.md)
const CRUCE = { x: 235, z: 1301 }

test('el Puente de Hierro se dibuja en 1889, 1911 y 1936, y no antes ni en 1946', async ({ page }) => {
  const errores = []
  page.on('pageerror', e => errores.push(e.message))
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready && window.lab?.lineaDeTiempo)

  // Arrange: los vértices del puente en la malla de los hitos, con su vida y su modo de apoyo
  const datos = await page.evaluate(() => {
    const rango = window.lab.hitos.userData.rangos.find(r => r.id === 'puente-hierro')
    if (!rango) return null
    const [vida, hito, ancla] = ['aVida', 'aHito', 'aAncla'].map(n => window.lab.hitos.geometry.getAttribute(n))
    const [fases, modos, cabezas] = [new Set(), new Set(), new Set()]
    const vivosEn = Array(7).fill(0)
    for (let i = rango.desde; i < rango.hasta; i++) {
      const [nace, muere] = [vida.getX(i), vida.getY(i)]
      fases.add(`${nace}/${muere}`)
      modos.add(hito.getW(i))
      if (hito.getW(i) === 2) cabezas.add([ancla.getX(i), ancla.getY(i), ancla.getZ(i), ancla.getW(i)].map(Math.round).join())
      for (let e = 1; e <= 6; e++) if (nace <= e && (muere === 0 || e < muere)) vivosEn[e]++
    }
    return {
      vertices: rango.hasta - rango.desde, fases: [...fases].sort(), modos: [...modos].sort(), cabezas: [...cabezas], vivosEn,
      malla: window.lab.hitos.material.uniforms.uMallaSuelo.value.toArray(),
    }
  })

  // Assert: una estructura de 1889 a 1936 y dos cauces; todo sobre una sola rasante entre las dos cabezas
  expect(datos?.vertices).toBeGreaterThan(10000)
  expect(datos.fases).toEqual(['3/5', '3/6', '5/6'])
  expect(datos.modos).toEqual([2, 3]) // rasante y suelo dibujado: ni un vértice anclado como una casa
  expect(datos.cabezas).toHaveLength(1)
  expect(datos.vivosEn[1]).toBe(0)
  expect(datos.vivosEn[2]).toBe(0)
  for (const epoca of [3, 4, 5]) expect(datos.vivosEn[epoca]).toBeGreaterThan(10000)
  expect(datos.vivosEn[6]).toBe(0)
  // el material sabe de qué tamaño son los cuadros del suelo que se dibuja: el lecho empalma con él
  expect(datos.malla[0]).toBeGreaterThan(20)
  expect(datos.malla[1]).toBeGreaterThan(20)

  // la marca que ya existía queda en el centro medido y sigue en 1946, cuando la estructura ya no está
  const marca = await page.evaluate(() => window.lab.marcasDelMapa.find(m => m.id === 'puente-hierro'))
  expect(Math.hypot(marca.x - CRUCE.x, marca.z - CRUCE.z)).toBeLessThan(2)
  expect([marca.nace, marca.muere, marca.hito]).toEqual([3, 0, 'puente-hierro'])

  // Act: se recorre la línea de tiempo con la cámara sobre el puente; ninguna época rompe el render
  await page.evaluate(c => { window.lab.levantar(true); window.lab.cam.jump({ ...c, dist: 160, yaw: 0, pitch: 0.9 }) }, CRUCE)
  for (const epoca of [1, 2, 3, 4, 5, 6]) {
    await page.evaluate(e => window.lab.lineaDeTiempo.elegir(e), epoca)
    await page.waitForFunction(e => Math.round(window.lab.ciudad.U.uEpocaA.value) === e, epoca)
    await page.evaluate(() => { window.lab.levantar(true); window.lab.renderer.render(window.lab.scene, window.lab.camera) })
  }
  expect(errores).toEqual([])
})

test('el puente no le cambia la vida a ninguna casa: solo reserva su cauce', async ({ page }) => {
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready)
  const cambiadas = await page.evaluate(async () => {
    const [{ cargarPak }, { HITOS }, { suprimirTechos, zonasDeSupresion }] = await Promise.all([
      import('/src/pak.js'), import('/src/hitos/datos/index.js'), import('/src/hitos/suprimir.js'),
    ])
    const casas = await cargarPak('datos/ciudad.pak', { vertices: Float32Array, techos: Uint32Array, vida: Uint32Array, historia: Uint8Array, marcos: Float32Array, alas: Float32Array, vuelos: Uint8Array, paletas: Uint8Array })
    const sin = suprimirTechos(casas, zonasDeSupresion(HITOS.filter(h => h.id !== 'puente-hierro')))
    const con = suprimirTechos(casas, zonasDeSupresion(HITOS))
    return [...con].filter((v, i) => v !== sin[i]).length
  })
  expect(cambiadas).toBe(0)
})
