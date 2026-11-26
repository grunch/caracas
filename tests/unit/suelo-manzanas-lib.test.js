import { describe, expect, test } from 'vitest'
import {
  BANDA_CALLE_M, DIST_MAX_M, EPOCAS_SUELO, M_POR_PX, PLAZA_MAX_M2,
  poligonosDeInforme, cajaDeManzanas, distanciaFirmada, plazasDeEpoca, despejarPlazas, codificar, metaSueloManzanas,
} from '../../tools/suelo-manzanas-lib.mjs'

const METRO = 0.5 // m por px del plano, como el mosaico de 1936
// un cuadrado de 40 m de lado (80 px) con la esquina en (100, 100) px
const CUADRADO = [[100, 100], [180, 100], [180, 180], [100, 180]]
const leer = (campo, x, y, caja) => campo.distancias[
  Math.floor(((y - caja[1]) * METRO) / campo.pasoY) * campo.ancho + Math.floor(((x - caja[0]) * METRO) / campo.pasoX)]

describe('poligonosDeInforme', () => {
  test('devuelve el contorno de cada manzana como anillos, congelados, y salta las que no tienen tres puntos', () => {
    // Arrange
    const informe = { manzanas: [{ id: 'A', poligono: CUADRADO }, { id: 'B', poligono: [[0, 0], [1, 1]] }, { id: 'C' }] }
    // Act
    const manzanas = poligonosDeInforme(informe)
    // Assert
    expect(manzanas).toEqual([[CUADRADO]])
    expect(Object.isFrozen(manzanas[0][0])).toBe(true)
  })

  test('prefiere el límite real (con sus huecos) al rectángulo del plan', () => {
    const limite = [[100, 100], [140, 100], [140, 180], [100, 180]]
    const hueco = [[110, 110], [120, 110], [120, 120], [110, 120]]
    const manzanas = poligonosDeInforme({ manzanas: [{ id: 'A', poligono: CUADRADO, limite, huecos: [hueco, [[0, 0]]] }] })
    expect(manzanas).toEqual([[limite, hueco]])
  })

  test('falla sin lista de manzanas o con una coordenada que no es un par de números', () => {
    expect(() => poligonosDeInforme({})).toThrow(/manzanas/)
    expect(() => poligonosDeInforme({ manzanas: [{ id: 'X', poligono: [[0, 0], [1, 'a'], [2, 2]] }] })).toThrow(/X/)
    expect(() => poligonosDeInforme({ manzanas: [{ id: 'Y', poligono: CUADRADO, limite: CUADRADO, huecos: [[[0, 0], [1, null], [2, 2]]] }] })).toThrow(/Y/)
  })
})

describe('cajaDeManzanas', () => {
  test('envuelve todos los contornos con DIST_MAX_M de margen, en px enteros', () => {
    const margen = DIST_MAX_M / METRO
    expect(cajaDeManzanas([[[CUADRADO]]], METRO)).toEqual([100 - margen, 100 - margen, 180 + margen, 180 + margen])
  })
})

describe('distanciaFirmada', () => {
  const caja = cajaDeManzanas([[[CUADRADO]]], METRO)
  const campo = distanciaFirmada([[CUADRADO]], caja, { metro: METRO })

  test('es positiva adentro de la manzana y negativa afuera, en metros hasta el borde', () => {
    // el centro del cuadrado está a 20 m de cada lado (saturado a DIST_MAX_M)
    expect(leer(campo, 140, 140, caja)).toBeCloseTo(Math.min(20, DIST_MAX_M), 0)
    // 3 m adentro del lado oeste
    expect(leer(campo, 106, 140, caja)).toBeCloseTo(3, 0)
    // 3 m afuera del lado oeste (el centro del texel que tiene a x = 94 px)
    expect(leer(campo, 94, 140, caja)).toBeCloseTo(-3, 0)
  })

  test('satura en ±DIST_MAX_M', () => {
    for (const d of campo.distancias) expect(Math.abs(d)).toBeLessThanOrEqual(DIST_MAX_M)
  })

  test('un hueco de la manzana queda afuera (calle), aunque otra manzana no lo tape', () => {
    const hueco = [[120, 120], [160, 120], [160, 160], [120, 160]] // 20 m de lado, en el medio
    const c = cajaDeManzanas([[[CUADRADO, hueco]]], METRO)
    const conHueco = distanciaFirmada([[CUADRADO, hueco]], c, { metro: METRO })
    expect(leer(conHueco, 140, 140, c)).toBeLessThan(0)
    expect(leer(conHueco, 106, 140, c)).toBeGreaterThan(0)
  })

  test('une las manzanas que se pisan sin restarse', () => {
    const otro = CUADRADO.map(([x, y]) => [x + 40, y])
    const c = cajaDeManzanas([[[CUADRADO], [otro]]], METRO)
    const unidos = distanciaFirmada([[CUADRADO], [otro]], c, { metro: METRO })
    // (160, 140) está adentro de los dos
    expect(leer(unidos, 160, 140, c)).toBeGreaterThan(0)
  })
})

describe('plazasDeEpoca', () => {
  const marcas = [
    { id: 'plaza-mayor', nombres: [[1, 'Plaza Mayor'], [3, 'Plaza Bolívar']], hito: 'plaza' },
    { id: 'sj', nombre: 'Plaza de San Jacinto', x: 10, y: 20, nace: 1, muere: 3 },
    { id: 'iglesia', nombre: 'San Pablo', x: 5, y: 5, nace: 1 },
    { id: 'nueva', nombre: 'Plaza Henry Clay', x: 7, y: 7, nace: 5 },
  ]
  const hitos = [{ id: 'plaza', x: 1, y: 2, nace: 1 }]

  test('da la posición de las plazas en pie y nombradas como plaza en la época', () => {
    expect(plazasDeEpoca(marcas, hitos, 1)).toEqual([{ id: 'plaza-mayor', x: 1, y: 2 }, { id: 'sj', x: 10, y: 20 }])
    expect(plazasDeEpoca(marcas, hitos, 3)).toEqual([{ id: 'plaza-mayor', x: 1, y: 2 }])
  })

  test('falla si una marca apunta a un hito que no existe', () => {
    expect(() => plazasDeEpoca([{ id: 'p', nombre: 'Plaza X', hito: 'nada' }], [], 1)).toThrow(/nada/)
  })
})

describe('despejarPlazas', () => {
  // dos manzanas de 40 m separadas por 60 m de plaza; afuera de todo, campo abierto sin límite
  const oeste = CUADRADO
  const este = CUADRADO.map(([x, y]) => [x + 200, y])
  const caja = cajaDeManzanas([[[oeste], [este]]], METRO)
  const campo = distanciaFirmada([[oeste], [este]], caja, { metro: METRO })

  test('la plaza (el claro cerrado más lejos que la banda de calle) queda como calle', () => {
    // la plaza, en (230, 140): a 25 m de las dos manzanas → abierto antes de despejar
    expect(leer(campo, 230, 140, caja)).toBeLessThan(-BANDA_CALLE_M)
    const despejado = despejarPlazas(campo, caja, [{ id: 'p', x: 230, y: 140 }], { metro: METRO, maxM2: 1e9 })
    expect(leer(despejado, 230, 140, caja)).toBeGreaterThan(-BANDA_CALLE_M)
    expect(leer(despejado, 230, 140, caja)).toBeLessThan(0)
    // no toca el campo original
    expect(leer(campo, 230, 140, caja)).toBeLessThan(-BANDA_CALLE_M)
  })

  test('no despeja un claro más grande que el límite: es campo, no una plaza', () => {
    const despejado = despejarPlazas(campo, caja, [{ id: 'p', x: 230, y: 140 }], { metro: METRO, maxM2: 100 })
    expect(leer(despejado, 230, 140, caja)).toBeLessThan(-BANDA_CALLE_M)
  })

  test('ignora la plaza cuyo punto cae en una manzana, en la banda de calle o fuera de la caja', () => {
    const plazas = [{ id: 'a', x: 140, y: 140 }, { id: 'b', x: 92, y: 140 }, { id: 'c', x: -999, y: 0 }]
    const despejado = despejarPlazas(campo, caja, plazas, { metro: METRO, maxM2: 1e9 })
    expect(Array.from(despejado.distancias)).toEqual(Array.from(campo.distancias))
  })

  test('el límite por omisión deja pasar una plaza mayor de ~120 m de lado', () => {
    expect(PLAZA_MAX_M2).toBeGreaterThan(120 * 120)
  })
})

describe('codificar', () => {
  test('lleva la distancia de cada época a su canal: 0 m es el medio, ±DIST_MAX_M los extremos', () => {
    const a = { ancho: 2, alto: 1, distancias: Float32Array.from([0, DIST_MAX_M]) }
    const b = { ancho: 2, alto: 1, distancias: Float32Array.from([-DIST_MAX_M, DIST_MAX_M / 2]) }
    const c = { ancho: 2, alto: 1, distancias: Float32Array.from([DIST_MAX_M, -DIST_MAX_M]) }
    const { datos, canales } = codificar([a, b, c])
    expect(canales).toBe(3)
    expect(Array.from(datos)).toEqual([128, 0, 255, 255, 191, 0])
  })

  test('falla si los campos no tienen las mismas medidas', () => {
    expect(() => codificar([{ ancho: 1, alto: 1, distancias: [0] }, { ancho: 2, alto: 1, distancias: [0, 0] }])).toThrow(/medidas/)
  })
})

describe('metaSueloManzanas', () => {
  test('dice dónde va la textura, qué época va en cada canal y con qué medidas', () => {
    const meta = metaSueloManzanas({ caja: [0, 0, 10, 10], ancho: 3, alto: 3, manzanas: { 1772: 2, 1843: 3, 1889: 4 } })
    expect(meta).toMatchObject({
      imagen: 'plano/suelo-manzanas.png', caja: [0, 0, 10, 10], ancho: 3, alto: 3,
      m_por_px: M_POR_PX, dist_max_m: DIST_MAX_M, banda_calle_m: BANDA_CALLE_M, canales: [1772, 1843, 1889],
    })
    expect(meta.manzanas).toEqual({ 1772: 2, 1843: 3, 1889: 4 })
    expect(EPOCAS_SUELO.map((e) => e.año)).toEqual([1772, 1843, 1889])
  })
})
