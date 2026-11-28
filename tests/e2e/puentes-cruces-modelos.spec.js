import { expect, test } from '@playwright/test'
import { hayDato } from './datos.js'

// El centro del tablero en metros del mundo y lo que mide cada puente (docs/puentes-cruces-integracion.md)
const PUENTES = [
  { id: 'puente-dolores', x: -530.1, z: 1641.5, largo: 60, techoMinimo: 6.5 }, // la armadura sube 7 m sobre el tablero
  { id: 'puente-restaurador', x: -233.85, z: 1520.25, largo: 100.5, techoMinimo: 3 }, // tablero bajo: lo más alto son los faroles
]
const IDS = PUENTES.map(p => p.id)

for (const puente of PUENTES) {
  test(`${puente.id}: la estructura se dibuja en 1911 y en ninguna otra época`, async ({ page }) => {
    const errores = []
    page.on('pageerror', e => errores.push(e.message))
    await page.goto('/?sinintro&capture&sinsw')
    await page.waitForFunction(() => window.lab?.ready && window.lab?.lineaDeTiempo)

    // Arrange: los vértices del cruce en la malla de los hitos, con su vida y su modo de apoyo
    const datos = await page.evaluate((id) => {
      const rango = window.lab.hitos.userData.rangos.find(r => r.id === id)
      if (!rango) return null
      const [vida, hito, ancla, posicion] = ['aVida', 'aHito', 'aAncla', 'position'].map(n => window.lab.hitos.geometry.getAttribute(n))
      const [fases, modos] = [new Set(), new Set()]
      const vivosEn = Array(7).fill(0)
      let [separacion, techo] = [0, -Infinity]
      for (let i = rango.desde; i < rango.hasta; i++) {
        const [nace, muere] = [vida.getX(i), vida.getY(i)]
        fases.add(`${nace}/${muere}`)
        modos.add(hito.getW(i))
        if (hito.getW(i) === 2) {
          separacion = Math.max(separacion, Math.hypot(ancla.getZ(i) - ancla.getX(i), ancla.getW(i) - ancla.getY(i)))
          techo = Math.max(techo, posicion.getY(i))
        }
        for (let e = 1; e <= 6; e++) if (nace <= e && (muere === 0 || e < muere)) vivosEn[e]++
      }
      return { vertices: rango.hasta - rango.desde, fases: [...fases], modos: [...modos].sort(), vivosEn, techo, separacion }
    }, puente.id)

    // Assert: una sola estructura, la de 1911, sobre una rasante entre las dos cabezas
    expect(datos?.vertices).toBeGreaterThan(5000)
    expect(datos.fases).toEqual(['4/5'])
    expect(datos.modos).toEqual([2, 3]) // rasante y suelo dibujado: ni un vértice anclado como una casa
    expect(datos.separacion).toBeCloseTo(puente.largo, 0)
    for (const epoca of [1, 2, 3, 5, 6]) expect(datos.vivosEn[epoca]).toBe(0)
    expect(datos.vivosEn[4]).toBe(datos.vertices)
    expect(datos.techo).toBeGreaterThan(puente.techoMinimo)

    // la marca del cruce queda en el centro del tablero y sigue en 1936 y 1946, cuando no hay estructura dibujada
    const marca = await page.evaluate(id => window.lab.marcasDelMapa.find(m => m.id === id), puente.id)
    expect(Math.hypot(marca.x - puente.x, marca.z - puente.z)).toBeLessThan(1)
    expect([marca.nace, marca.muere, marca.hito]).toEqual([4, 0, puente.id])

    // Act: se recorre la línea de tiempo con la cámara sobre el puente; ninguna época rompe el render
    await page.evaluate(c => { window.lab.levantar(true); window.lab.cam.jump({ x: c.x, z: c.z, dist: 190, yaw: 0, pitch: 0.9 }) }, puente)
    for (const epoca of [3, 4, 5, 6]) {
      await page.evaluate(e => window.lab.lineaDeTiempo.elegir(e), epoca)
      await page.waitForFunction(e => Math.round(window.lab.ciudad.U.uEpocaA.value) === e, epoca)
      await page.evaluate(() => { window.lab.levantar(true); window.lab.renderer.render(window.lab.scene, window.lab.camera) })
    }
    expect(errores).toEqual([])
  })
}

test('los dos cruces no le cambian la vida a ninguna casa, y en 1911 no queda casa ni árbol en la huella ni en los accesos', async ({ page }) => {
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready)
  test.skip(!(await hayDato(page, 'datos/arboles.bin', 'octet-stream')), 'sin los árboles')
  const medido = await page.evaluate(async (ids) => {
    const [{ cargarPak }, { HITOS }, { suprimirTechos, zonasDeSupresion, puntoEnPoligono }, { decodificarArboles }, { suprimirArbolesDeHitos }, { poligonosConVida }] = await Promise.all([
      import('/src/pak.js'), import('/src/hitos/datos/index.js'), import('/src/hitos/suprimir.js'), import('/src/arboles.js'),
      import('/src/hitos/suprimir-arboles.js'), import('/src/hitos/datos/fases-geometricas.js'),
    ])
    const casas = await cargarPak('datos/ciudad.pak', { vertices: Float32Array, techos: Uint32Array, vida: Uint32Array, historia: Uint8Array, marcos: Float32Array, alas: Float32Array, vuelos: Uint8Array, paletas: Uint8Array })
    const sin = suprimirTechos(casas, zonasDeSupresion(HITOS.filter(h => !ids.includes(h.id))))
    const con = suprimirTechos(casas, zonasDeSupresion(HITOS))
    const nuevos = HITOS.filter(h => ids.includes(h.id))
    // la huella con sus accesos (la reserva sin árboles la cubre entera) y el cauce
    const zonas = nuevos.flatMap(h => ['suprime', 'sinArboles'].flatMap(campo => poligonosConVida(h, campo))).map(z => z.poligono)
    const vivoEn1911 = (nace, muere) => nace <= 4 && (muere === 0 || muere > 4)
    let casasEnLaHuella = 0
    for (let t = 0; t < casas.techos.length / 4; t++) {
      if (!vivoEn1911(con[t] % 8, Math.floor(con[t] / 8))) continue
      const [inicio, cuantos] = [casas.techos[t * 4], casas.techos[t * 4 + 1]]
      for (let k = inicio; k < inicio + cuantos; k++) {
        if (zonas.some(z => puntoEnPoligono([casas.vertices[k * 2], casas.vertices[k * 2 + 1]], z))) { casasEnLaHuella++; break }
      }
    }
    const arboles = suprimirArbolesDeHitos(decodificarArboles(await (await fetch('datos/arboles.bin')).arrayBuffer()), HITOS)
    let arbolesEnLaHuella = 0
    for (let i = 0; i < arboles.n; i++) {
      if (vivoEn1911(arboles.nace[i], arboles.muere[i]) && zonas.some(z => puntoEnPoligono([arboles.x[i], arboles.y[i]], z))) arbolesEnLaHuella++
    }
    return { cambiadas: [...con].filter((v, i) => v !== sin[i]).length, casasEnLaHuella, arbolesEnLaHuella, zonas: zonas.length }
  }, IDS)
  console.log(`casas y árboles en los dos cruces: ${JSON.stringify(medido)}`)
  expect(medido.zonas).toBe(4)
  expect(medido.cambiadas).toBe(0)
  expect(medido.casasEnLaHuella).toBe(0)
  expect(medido.arbolesEnLaHuella).toBe(0)
})

test('ningún hito va encima de una manzana: tablero, cabezas, accesos y cauce quedan fuera en 1911, y después no hay nada que medir', async ({ page }) => {
  await page.goto('/?sinintro&capture&sinsw')
  await page.waitForFunction(() => window.lab?.ready)
  test.skip(!(await hayDato(page, 'datos/suelo-manzanas-modernas.json', 'json')), 'sin el suelo de manzanas')

  // Act: la distancia firmada al borde de la manzana más cercana (positiva adentro), cada medio metro
  const medido = await page.evaluate(async (ids) => {
    const { puentesGuaire } = await import('/src/hitos/datos/puentes-guaire.js')
    const { poligonosConVida } = await import('/src/hitos/datos/fases-geometricas.js')
    const { puntoEnPoligono } = await import('/src/hitos/suprimir.js')
    const meta = await (await fetch('datos/suelo-manzanas-modernas.json')).json()
    const imagen = await createImageBitmap(await (await fetch(meta.imagen)).blob(), { colorSpaceConversion: 'none' })
    const lienzo = new OffscreenCanvas(imagen.width, imagen.height)
    const ctx = lienzo.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(imagen, 0, 0)
    const pixeles = ctx.getImageData(0, 0, imagen.width, imagen.height).data
    const canal = meta.canales.indexOf(1911)
    // bilineal, como la lee el shader del suelo (la imagen es de 2 m por píxel)
    const distancia = (x, y) => {
      const k = meta.m_por_px / 0.5
      const [fx, fy] = [(x - meta.caja[0]) / k - 0.5, (y - meta.caja[1]) / k - 0.5]
      const [i, j] = [Math.floor(fx), Math.floor(fy)]
      if (i < 0 || j < 0 || i + 1 >= imagen.width || j + 1 >= meta.alto) return null
      const [tx, ty] = [fx - i, fy - j]
      const en = (a, b) => pixeles[(b * imagen.width + a) * 4 + canal]
      const v = en(i, j) * (1 - tx) * (1 - ty) + en(i + 1, j) * tx * (1 - ty) + en(i, j + 1) * (1 - tx) * ty + en(i + 1, j + 1) * tx * ty
      return ((v - 127.5) / 127.5) * meta.dist_max_m
    }
    const vivo = (desde, hasta, e) => desde <= e && (hasta === 0 || e < hasta)
    const salida = {}
    for (const h of puentesGuaire.filter(p => ids.includes(p.id))) {
      const zonas = ['suprime', 'sinArboles', 'sueloPropio'].flatMap(campo => poligonosConVida(h, campo))
      const [ux, uy] = h.eje
      const [mitad, lado] = [h.largo / 2 + 14, 17]
      let [peor, muestras] = [-Infinity, 0]
      for (let a = -mitad; a <= mitad; a += 0.5) {
        for (let b = -lado; b <= lado; b += 0.5) {
          const p = [h.x + (a * ux - b * uy) / 0.5, h.y + (a * uy + b * ux) / 0.5]
          const esEstructura = Math.abs(a) <= h.largo / 2 + 1 && Math.abs(b) <= 7 // tablero, estribos de 9 m y plazoleta de 13 m
          if (!esEstructura && !zonas.some(z => puntoEnPoligono(p, z.poligono))) continue
          const d = distancia(p[0], p[1])
          if (d === null) continue
          muestras++
          peor = Math.max(peor, d)
        }
      }
      // en 1936 y 1946 no hay estructura (la vida del hito termina) ni reserva viva
      const despues = [5, 6].some(e => vivo(h.nace, h.muere, e) || zonas.some(z => vivo(z.desde, z.hasta, e)))
      salida[h.id] = { peor, muestras, despues }
    }
    return salida
  }, IDS)
  console.log(`distancia a la manzana más cercana en 1911 (negativa = afuera): ${JSON.stringify(medido)}`)

  // Assert: hay muestras en los dos cruces y todas quedan fuera de las manzanas (distancia negativa)
  for (const id of IDS) {
    expect(medido[id].despues, `${id}: algo vivo después de 1911`).toBe(false)
    test.skip(medido[id].muestras === 0, 'el suelo de manzanas no cubre el cruce')
    expect(medido[id].muestras).toBeGreaterThan(5000)
    expect(medido[id].peor, `manzana pisada en 1911 por ${id}`).toBeLessThan(0)
  }
})
