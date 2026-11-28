import { expect, test } from '@playwright/test'
import { hayDato } from './datos.js'

// El centro del tablero en metros del mundo (docs/puente-sucre-integracion.md)
const CRUCE = { x: 369, z: 1299 }

test('en la calle Sur 7 se dibuja el Constitución en 1889 y el Sucre metálico en 1911, y nada más', async ({ page }) => {
  const errores = []
  page.on('pageerror', e => errores.push(e.message))
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready && window.lab?.lineaDeTiempo)

  // Arrange: los vértices del cruce en la malla de los hitos, con su vida y su modo de apoyo
  const datos = await page.evaluate(() => {
    const rango = window.lab.hitos.userData.rangos.find(r => r.id === 'puente-sucre')
    if (!rango) return null
    const [vida, hito, ancla, posicion] = ['aVida', 'aHito', 'aAncla', 'position'].map(n => window.lab.hitos.geometry.getAttribute(n))
    const [fases, modos] = [new Set(), new Set()]
    const vivosEn = Array(7).fill(0)
    const techo = Array(7).fill(-Infinity)
    let separacion = 0
    for (let i = rango.desde; i < rango.hasta; i++) {
      const [nace, muere] = [vida.getX(i), vida.getY(i)]
      fases.add(`${nace}/${muere}`)
      modos.add(hito.getW(i))
      if (hito.getW(i) === 2) separacion = Math.max(separacion, Math.hypot(ancla.getZ(i) - ancla.getX(i), ancla.getW(i) - ancla.getY(i)))
      for (let e = 1; e <= 6; e++) {
        if (!(nace <= e && (muere === 0 || e < muere))) continue
        vivosEn[e]++
        if (hito.getW(i) === 2) techo[e] = Math.max(techo[e], posicion.getY(i))
      }
    }
    return { vertices: rango.hasta - rango.desde, fases: [...fases].sort(), modos: [...modos].sort(), vivosEn, techo, separacion }
  })

  // Assert: dos estructuras, cada una en su época, sobre una rasante entre las dos cabezas (60 m)
  expect(datos?.vertices).toBeGreaterThan(5000)
  expect(datos.fases).toEqual(['3/4', '4/5'])
  expect(datos.modos).toEqual([2, 3]) // rasante y suelo dibujado: ni un vértice anclado como una casa
  expect(datos.separacion).toBeCloseTo(60, 0)
  for (const epoca of [1, 2, 5, 6]) expect(datos.vivosEn[epoca]).toBe(0)
  for (const epoca of [3, 4]) expect(datos.vivosEn[epoca]).toBeGreaterThan(2000)
  // el Constitución es de tablero bajo (lo más alto son sus faroles); el Sucre lleva la armadura por encima
  expect(datos.techo[3]).toBeLessThan(4)
  expect(datos.techo[4]).toBeGreaterThan(7)

  // la marca que ya existía queda en el centro medido y sigue en 1936 y 1946, cuando no hay estructura dibujada
  const marca = await page.evaluate(() => window.lab.marcasDelMapa.find(m => m.id === 'puente-sucre'))
  expect(Math.hypot(marca.x - CRUCE.x, marca.z - CRUCE.z)).toBeLessThan(2)
  expect([marca.nace, marca.muere, marca.hito]).toEqual([3, 0, 'puente-sucre'])

  // Act: se recorre la línea de tiempo con la cámara sobre el puente; ninguna época rompe el render
  await page.evaluate(c => { window.lab.levantar(true); window.lab.cam.jump({ ...c, dist: 160, yaw: 0, pitch: 0.9 }) }, CRUCE)
  for (const epoca of [1, 2, 3, 4, 5, 6]) {
    await page.evaluate(e => window.lab.lineaDeTiempo.elegir(e), epoca)
    await page.waitForFunction(e => Math.round(window.lab.ciudad.U.uEpocaA.value) === e, epoca)
    await page.evaluate(() => { window.lab.levantar(true); window.lab.renderer.render(window.lab.scene, window.lab.camera) })
  }
  expect(errores).toEqual([])
})

test('el cruce no le cambia la vida a ninguna casa: solo reserva su cauce', async ({ page }) => {
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready)
  const cambiadas = await page.evaluate(async () => {
    const [{ cargarPak }, { HITOS }, { suprimirTechos, zonasDeSupresion }] = await Promise.all([
      import('/src/pak.js'), import('/src/hitos/datos/index.js'), import('/src/hitos/suprimir.js'),
    ])
    const casas = await cargarPak('datos/ciudad.pak', { vertices: Float32Array, techos: Uint32Array, vida: Uint32Array, historia: Uint8Array, marcos: Float32Array, alas: Float32Array, vuelos: Uint8Array, paletas: Uint8Array })
    const sin = suprimirTechos(casas, zonasDeSupresion(HITOS.filter(h => h.id !== 'puente-sucre')))
    const con = suprimirTechos(casas, zonasDeSupresion(HITOS))
    return [...con].filter((v, i) => v !== sin[i]).length
  })
  expect(cambiadas).toBe(0)
})

test('ningún hito va encima de una manzana: tablero, cabezas, accesos y cauce quedan fuera en 1889 y 1911', async ({ page }) => {
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready)
  test.skip(!(await hayDato(page, 'datos/suelo-manzanas.json', 'json')) || !(await hayDato(page, 'datos/suelo-manzanas-modernas.json', 'json')), 'sin el suelo de manzanas')

  // Act: la distancia firmada al borde de la manzana más cercana (positiva adentro), cada medio metro
  const medido = await page.evaluate(async () => {
    const { puentesGuaire } = await import('/src/hitos/datos/puentes-guaire.js')
    const { poligonosConVida } = await import('/src/hitos/datos/fases-geometricas.js')
    const { puntoEnPoligono } = await import('/src/hitos/suprimir.js')
    const h = puentesGuaire.find(p => p.id === 'puente-sucre')
    const zonas = ['suprime', 'sinArboles'].flatMap(campo => poligonosConVida(h, campo))
    const [ux, uy] = h.eje
    const campos = {}
    for (const [archivo, años] of [['suelo-manzanas', [1889]], ['suelo-manzanas-modernas', [1911]]]) {
      const meta = await (await fetch(`datos/${archivo}.json`)).json()
      const imagen = await createImageBitmap(await (await fetch(meta.imagen)).blob(), { colorSpaceConversion: 'none' })
      const lienzo = new OffscreenCanvas(imagen.width, imagen.height)
      const ctx = lienzo.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(imagen, 0, 0)
      const pixeles = ctx.getImageData(0, 0, imagen.width, imagen.height).data
      for (const año of años) campos[año] = { meta, pixeles, ancho: imagen.width, canal: meta.canales.indexOf(año) }
    }
    // bilineal, como la lee el shader del suelo (la imagen es de 2 m por píxel)
    const distancia = ({ meta, pixeles, ancho, canal }, x, y) => {
      const k = meta.m_por_px / 0.5
      const [fx, fy] = [(x - meta.caja[0]) / k - 0.5, (y - meta.caja[1]) / k - 0.5]
      const [i, j] = [Math.floor(fx), Math.floor(fy)]
      if (i < 0 || j < 0 || i + 1 >= ancho || j + 1 >= meta.alto) return null
      const [tx, ty] = [fx - i, fy - j]
      const en = (a, b) => pixeles[(b * ancho + a) * 4 + canal]
      const v = en(i, j) * (1 - tx) * (1 - ty) + en(i + 1, j) * tx * (1 - ty) + en(i, j + 1) * (1 - tx) * ty + en(i + 1, j + 1) * tx * ty
      return ((v - 127.5) / 127.5) * meta.dist_max_m
    }
    const salida = {}
    for (const [año, campo] of Object.entries(campos)) {
      let [peor, muestras] = [-Infinity, 0]
      for (let a = -50; a <= 50; a += 0.5) {
        for (let b = -27; b <= 27; b += 0.5) {
          const p = [h.x + (a * ux - b * uy) / 0.5, h.y + (a * uy + b * ux) / 0.5]
          const esEstructura = Math.abs(a) <= h.largo / 2 + 1 && Math.abs(b) <= 4.5 // tablero de 8 m y estribos de 9 m
          const esReserva = zonas.some(z => puntoEnPoligono(p, z.poligono)) // el cauce, su margen sin árboles y los accesos
          if (!esEstructura && !esReserva) continue
          const d = distancia(campo, p[0], p[1])
          if (d === null) continue
          muestras++
          peor = Math.max(peor, d)
        }
      }
      salida[año] = { peor, muestras }
    }
    return salida
  })
  console.log(`distancia a la manzana más cercana (negativa = afuera): ${JSON.stringify(medido)}`)

  // Assert: en las dos épocas hay muestras y todas quedan fuera de las manzanas (distancia negativa)
  for (const año of [1889, 1911]) {
    test.skip(medido[año].muestras === 0, 'el suelo de manzanas no cubre el cruce')
    expect(medido[año].muestras).toBeGreaterThan(5000)
    expect(medido[año].peor, `manzana pisada en ${año}`).toBeLessThan(0)
  }
})
