import { describe, expect, test } from 'vitest'
import { BoxGeometry, Float32BufferAttribute } from 'three'
import { APOYO, crearLienzo } from '../../src/hitos/lienzo.js'
import { cotaDeRasante, lechoDe, marcoDeCabezas, pendienteDeRasante } from '../../src/hitos/rasante.js'
import { crearMaterialHitos } from '../../src/hitos/material.js'
import { ponerMallaDelSuelo, sueloDibujadoEn, uniformsRelieve } from '../../src/relieve.js'

describe('rasante de un puente', () => {
  test('la cota va recta de una cabeza a la otra y no sigue el terreno intermedio', () => {
    // Arrange
    const [a, b] = [{ x: 0, z: 0, cota: 10 }, { x: 0, z: 100, cota: 12 }]
    // Act
    const medio = cotaDeRasante(a, b, { x: 30, z: 50 })
    // Assert
    expect(medio).toBeCloseTo(11, 6)
    expect(cotaDeRasante(a, b, { x: 0, z: 25 })).toBeCloseTo(10.5, 6)
    expect(pendienteDeRasante(a, b)).toBeCloseTo(0.02, 6)
  })

  test('más allá de las cabezas la rasante no se extrapola', () => {
    const [a, b] = [{ x: 0, z: 0, cota: 10 }, { x: 0, z: 100, cota: 12 }]
    expect(cotaDeRasante(a, b, { x: 0, z: -40 })).toBe(10)
    expect(cotaDeRasante(a, b, { x: 0, z: 400 })).toBe(12)
  })

  test('dos cabezas en el mismo punto no definen una rasante', () => {
    const a = { x: 1, z: 1, cota: 3 }
    expect(() => cotaDeRasante(a, a, { x: 0, z: 0 })).toThrow(/cabezas/)
    expect(() => marcoDeCabezas([[5, 5], [5, 5]])).toThrow(/cabezas/)
  })

  test('el marco de un puente sale de sus dos cabezas: centro, eje y largo', () => {
    const marco = marcoDeCabezas([[100, 200], [100, 400]])
    expect([marco.x, marco.y]).toEqual([100, 300])
    expect(marco.eje).toEqual([0, 1])
    expect(marco.largo).toBe(100) // 200 px a 0,5 m
  })
})

describe('lecho bajo un puente', () => {
  const lecho = lechoDe({ vano: [-40, 40], ancho: 30, fondo: 5, taludLargo: 8, taludAncho: 10 })

  test('llega al fondo bajo el tablero y vale cero en todo el borde y fuera de él', () => {
    expect(lecho(0, 0)).toBeCloseTo(5, 6)
    expect(lecho(20, 4)).toBeCloseTo(5, 6)
    for (const [x, z] of [[-40, 0], [40, 3], [0, 15], [10, -15], [60, 0], [0, 40]]) expect(lecho(x, z)).toBe(0)
  })

  test('las orillas bajan de a poco, sin escalones', () => {
    const perfil = Array.from({ length: 41 }, (_, i) => lecho(-40 + i * 0.2, 0))
    for (let i = 1; i < perfil.length; i++) {
      expect(perfil[i]).toBeGreaterThanOrEqual(perfil[i - 1])
      expect(perfil[i] - perfil[i - 1]).toBeLessThan(0.3)
    }
  })

  test('un vano que no es un intervalo, o sin fondo, se rechaza', () => {
    expect(() => lechoDe({ vano: [3, 3], ancho: 30, fondo: 5 })).toThrow(/vano/)
    expect(() => lechoDe({ vano: [0, 10], ancho: 30, fondo: 0 })).toThrow(/fondo/)
  })
})

describe('el lienzo con rasante', () => {
  const caja = () => new BoxGeometry(10, 2, 4).translate(0, -1, 0)

  test('los vértices llevan las dos cabezas como ancla y el modo de rasante, sin pies', () => {
    // Arrange
    const lienzo = crearLienzo()
    const p = lienzo.hito({ origen: { x: 100, z: 200 }, eje: [0, 1] })
    // Act
    p.rasante([-45, 0], [45, 0]).geo(caja())
    const d = lienzo.datos()
    // Assert: con el eje al sur, x local es z del mundo
    for (let i = 0; i < lienzo.vertices; i++) {
      expect([...d.anclas.slice(i * 4, i * 4 + 4)].map(Math.round)).toEqual([100, 155, 100, 245])
      expect(d.hitos[i * 4 + 3]).toBe(APOYO.RASANTE)
    }
  })

  test('los vértices marcados «suelo» siguen el terreno bajo sí mismos y el resto, la rasante', () => {
    const lienzo = crearLienzo()
    const g = caja()
    const y = g.attributes.position
    g.setAttribute('suelo', new Float32BufferAttribute(Array.from({ length: y.count }, (_, i) => (y.getY(i) < -1 ? 1 : 0)), 1))
    lienzo.hito({ origen: { x: 0, z: 0 } }).rasante([-45, 0], [45, 0]).geo(g)
    const d = lienzo.datos()
    let [alSuelo, enRasante] = [0, 0]
    for (let i = 0; i < lienzo.vertices; i++) {
      const [ax, az, bx, bz] = d.anclas.slice(i * 4, i * 4 + 4)
      if (d.posiciones[i * 3 + 1] < -1) {
        expect([ax, az, bx, bz]).toEqual([d.posiciones[i * 3], d.posiciones[i * 3 + 2], d.posiciones[i * 3], d.posiciones[i * 3 + 2]])
        expect(d.hitos[i * 4 + 3]).toBe(APOYO.SUELO)
        alSuelo++
      } else {
        expect([ax, bx]).toEqual([-45, 45])
        expect(d.hitos[i * 4 + 3]).toBe(APOYO.RASANTE)
        enRasante++
      }
    }
    expect([alSuelo, enRasante]).toEqual([12, 12])
  })

  test('sin rasante, el lienzo sigue marcando los pies como antes', () => {
    const lienzo = crearLienzo()
    lienzo.hito({ origen: { x: 0, z: 0 } }).geo(new BoxGeometry(2, 2, 2).translate(0, 1, 0))
    const pies = [...lienzo.datos().hitos].filter((_, i) => i % 4 === 3)
    expect(new Set(pies)).toEqual(new Set([APOYO.NINGUNO, APOYO.PIE]))
  })

  test('el shader de los hitos interpola la cota entre las cabezas y deja los pies como estaban', () => {
    const U = { ...uniformsRelieve({ x0: 0, z0: 0, ancho: 1, alto: 1 }), ...Object.fromEntries(['uColor', 'uOla', 'uAnchoOla', 'uEpocaDe', 'uEpocaA', 'uOlaEpoca'].map(k => [k, { value: 0 }])) }
    const { vertexShader } = crearMaterialHitos({ U })
    expect(vertexShader).toContain('piso = sueloDibujado(alSuelo ? position.xz : aAncla.xy);')
    expect(vertexShader).toContain('if (t > 0.0) piso = mix(piso, sueloDibujado(aAncla.zw), t);')
    expect(vertexShader).toMatch(/aHito\.w > 0\.5 && aHito\.w < 1\.5/)
    expect(vertexShader).toContain('float piso = pisoDeHito(aAncla.xy, aAncla.zw, position.xz);')
  })

  test('sin los uniforms del relieve nuevos, el material usa el relieve mismo (malla en cero)', () => {
    const { uMallaSuelo, ...resto } = uniformsRelieve({ x0: 0, z0: 0, ancho: 1, alto: 1 })
    const U = { ...resto, ...Object.fromEntries(['uColor', 'uOla', 'uAnchoOla', 'uEpocaDe', 'uEpocaA', 'uOlaEpoca'].map(k => [k, { value: 0 }])) }
    expect(uMallaSuelo.value.toArray()).toEqual([0, 0])
    expect(crearMaterialHitos({ U }).uniforms.uMallaSuelo.value.toArray()).toEqual([0, 0])
    expect(crearMaterialHitos({ U: { ...U, uMallaSuelo } }).uniforms.uMallaSuelo).toBe(uMallaSuelo)
  })
})

describe('el suelo tal como se dibuja', () => {
  const hoja = { x0: -100, z0: -50, ancho: 400, alto: 200 }
  const celda = [100, 50]
  const valle = (x, z) => (x * x) / 1000 + z / 10 // curvo a lo ancho: entre vértices, la malla queda por encima

  test('en los vértices de la malla es el relieve exacto', () => {
    for (const [x, z] of [[-100, -50], [0, 0], [100, 50], [300, 150]]) expect(sueloDibujadoEn(valle, hoja, celda, x, z)).toBeCloseTo(valle(x, z), 9)
  })

  test('entre vértices va recto, como el triángulo que se dibuja, y es continuo en la diagonal', () => {
    // el cuadro de (0, 0) a (100, 50): la diagonal une (0, 50) con (100, 0)
    expect(sueloDibujadoEn(valle, hoja, celda, 50, 0)).toBeCloseTo((valle(0, 0) + valle(100, 0)) / 2, 9)
    expect(sueloDibujadoEn(valle, hoja, celda, 50, 0)).toBeGreaterThan(valle(50, 0))
    expect(sueloDibujadoEn(valle, hoja, celda, 50, 25)).toBeCloseTo((valle(0, 50) + valle(100, 0)) / 2, 9)
    const [antes, despues] = [sueloDibujadoEn(valle, hoja, celda, 49.999, 25), sueloDibujadoEn(valle, hoja, celda, 50.001, 25)]
    expect(Math.abs(antes - despues)).toBeLessThan(1e-3)
    expect(sueloDibujadoEn(valle, hoja, celda, 75, 40)).toBeCloseTo(valle(100, 50) + 0.25 * (valle(0, 50) - valle(100, 50)) + 0.2 * (valle(100, 0) - valle(100, 50)), 9)
  })

  test('sin malla es el relieve mismo; ponerMallaDelSuelo deja el tamaño del cuadro', () => {
    expect(sueloDibujadoEn(valle, hoja, null, 50, 0)).toBe(valle(50, 0))
    expect(sueloDibujadoEn(valle, hoja, [0, 0], 50, 0)).toBe(valle(50, 0))
    const U = uniformsRelieve(hoja)
    ponerMallaDelSuelo(U, hoja, [4, 4])
    expect(U.uMallaSuelo.value.toArray()).toEqual(celda)
  })
})
