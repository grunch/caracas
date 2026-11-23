import { describe, test, expect } from 'vitest'
import {
  tramosDibujables, cajaDeCalles, campoDeDistancia, metaCalles, NUCLEO_M, M_POR_PX, DIST_MAX_M,
} from '../../tools/calles-epoca-lib.mjs'

const METRO = 0.5 // m por píxel del plano base
const tramo = (id, puntos, medible = true) => ({ tramo: id, sector: 'S1772-11', puntos, identificado: [], banda_m: 6, medible })

describe('tramosDibujables: las calles de la referencia que se dibujan', () => {
  test('solo los tramos medibles: los de los sectores límite del calce no se ubican y no se dibujan', () => {
    const ref = { tramos: [tramo('a', [[0, 0], [10, 0]]), tramo('b', [[0, 5], [10, 5]], false)] }
    const t = tramosDibujables(ref)
    expect(t.map((x) => x.tramo)).toEqual(['a'])
    expect(t[0].puntos).toEqual([[0, 0], [10, 0]])
  })

  test('no toca la referencia y devuelve datos congelados', () => {
    const ref = { tramos: [tramo('a', [[0, 0], [10, 0]])] }
    const copia = structuredClone(ref)
    const t = tramosDibujables(ref)
    expect(ref).toEqual(copia)
    expect(Object.isFrozen(t)).toBe(true)
    expect(Object.isFrozen(t[0])).toBe(true)
  })

  test('una referencia mal formada no pasa: sin tramos, con menos de dos puntos o con coordenadas que no son números', () => {
    expect(() => tramosDibujables({})).toThrow(/tramos/)
    expect(() => tramosDibujables({ tramos: [tramo('a', [[0, 0]])] })).toThrow(/a.*dos puntos/)
    expect(() => tramosDibujables({ tramos: [tramo('a', [[0, 0], [1, 'x']])] })).toThrow(/a.*coordenada/)
    expect(() => tramosDibujables({ tramos: [{ ...tramo('a', [[0, 0], [1, 1]]), medible: 'si' }] })).toThrow(/a.*medible/)
  })

  test('sin tramos medibles no hay nada que dibujar', () => {
    expect(() => tramosDibujables({ tramos: [tramo('a', [[0, 0], [1, 1]], false)] })).toThrow(/ningún tramo medible/)
  })
})

describe('cajaDeCalles: el rectángulo del plano que cubren las calles', () => {
  test('envuelve todos los puntos con un margen de la distancia guardada, en píxeles enteros del plano', () => {
    const t = tramosDibujables({ tramos: [tramo('a', [[100.4, 200.2], [300.6, 200]]), tramo('b', [[150, 180], [150, 420.5]])] })
    const margen = DIST_MAX_M / METRO
    expect(cajaDeCalles(t, METRO)).toEqual([Math.floor(100.4 - margen), Math.floor(180 - margen), Math.ceil(300.6 + margen), Math.ceil(420.5 + margen)])
  })
})

describe('campoDeDistancia: cuánto falta hasta el eje de una calle, por texel', () => {
  // una calle horizontal por el medio de una caja de 80 × 40 m
  const t = tramosDibujables({ tramos: [tramo('a', [[0, 40], [160, 40]])] })
  const caja = [0, 0, 160, 80]
  const campo = campoDeDistancia(t, caja, { metro: METRO })

  test('mide la caja en texeles de M_POR_PX metros', () => {
    expect(campo.ancho).toBe(Math.ceil(160 * METRO / M_POR_PX))
    expect(campo.alto).toBe(Math.ceil(80 * METRO / M_POR_PX))
    expect(campo.datos).toBeInstanceOf(Uint8Array)
    expect(campo.datos.length).toBe(campo.ancho * campo.alto)
  })

  test('sobre el eje vale casi 0; a DIST_MAX_M o más, 255; en medio, la distancia en metros escalada', () => {
    const en = (fila) => campo.datos[fila * campo.ancho + 10]
    // la fila de texeles cuyo centro está a 1 m del eje (el eje en y = 20 m: texeles de 2 m, centros en 1, 3, …)
    const filaEje = 20 / M_POR_PX
    expect(en(filaEje) / 255 * DIST_MAX_M).toBeCloseTo(M_POR_PX / 2, 1)
    expect(en(filaEje + 1) / 255 * DIST_MAX_M).toBeCloseTo(1.5 * M_POR_PX, 1)
    expect(en(0)).toBe(255)
    expect(en(campo.alto - 1)).toBe(255)
  })

  test('la fila 0 es el norte (la y chica del plano), como en la imagen', () => {
    const t2 = tramosDibujables({ tramos: [tramo('n', [[0, 2], [160, 2]])] })
    const c2 = campoDeDistancia(t2, caja, { metro: METRO })
    expect(c2.datos[10]).toBeLessThan(c2.datos[(c2.alto - 1) * c2.ancho + 10])
  })

  test('toma la calle más cercana y sigue la polilínea entera, no solo su primer segmento', () => {
    const quebrada = tramosDibujables({ tramos: [tramo('q', [[0, 10], [80, 10], [80, 70]])] })
    const c = campoDeDistancia(quebrada, caja, { metro: METRO })
    // un texel cerca del tramo vertical (x = 40 m, y abajo)
    const x = Math.floor(40 / M_POR_PX)
    const y = Math.floor(30 / M_POR_PX)
    expect(c.datos[y * c.ancho + x] / 255 * DIST_MAX_M).toBeLessThan(1.5)
  })
})

describe('campoDeDistancia: la textura cubre exactamente su caja', () => {
  test('con una caja que no es múltiplo de M_POR_PX, cada texel guarda la distancia del punto donde el shader lo pone', () => {
    // 5 × 4 m a 1 m/px: 3 × 2 texeles que el shader estira sobre la caja; una calle vertical en x = 4 m
    const t = tramosDibujables({ tramos: [tramo('v', [[4, 0], [4, 4]])] })
    const caja = [0, 0, 5, 4]
    const c = campoDeDistancia(t, caja, { metro: 1 })
    expect([c.ancho, c.alto]).toEqual([3, 2])
    for (let i = 0; i < c.ancho; i++) {
      const x = (i + 0.5) / c.ancho * (caja[2] - caja[0]) // el centro del texel i en la caja, como lo muestrea el shader
      expect(c.datos[i] / 255 * DIST_MAX_M).toBeCloseTo(Math.abs(x - 4), 1)
    }
  })
})

describe('metaCalles: lo que el sitio necesita para ubicar la textura y decir de dónde sale', () => {
  test('la época, la caja en píxeles del plano, el tamaño, las medidas del dibujo y la fuente', () => {
    const t = tramosDibujables({ tramos: [tramo('a', [[0, 40], [160, 40]]), tramo('b', [[0, 0], [1, 1]], false)] })
    const ref = { red_sha256: 'abc', tramos: [] }
    const m = metaCalles({ año: 1772, ref, tramos: t, caja: [0, 0, 160, 80], campo: { ancho: 80, alto: 40 } })
    expect(m).toMatchObject({
      año: 1772, imagen: 'plano/calles-1772.png', caja: [0, 0, 160, 80], ancho: 80, alto: 40,
      m_por_px: M_POR_PX, dist_max_m: DIST_MAX_M, nucleo_m: NUCLEO_M, tramos: 1,
      fuente: 'tools/geo/referencias/1772-calles-1936.json', red_sha256: 'abc',
    })
    expect(m.nota).toMatch(/inferido/)
  })

  test('el núcleo de calzada es el ancho inferido del generador (el original no da anchos)', () => {
    expect(NUCLEO_M).toBe(4)
    expect(DIST_MAX_M).toBeGreaterThan(NUCLEO_M)
  })
})
