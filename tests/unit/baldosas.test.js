import { describe, it, expect } from 'vitest'
import { LADO_BALDOSA_M, repartirEnBaldosas, seVeEntre, ordenarPorVida, rangosVivos, esferaSobreRelieve } from '../../src/baldosas.js'

describe('repartirEnBaldosas', () => {
  const casa = (x, z, conHuella = true) => ({ centro: [x, z], huella: conHuella ? [[x, z]] : null })
  const casas = [casa(2000, 100), casa(10, 10), casa(-10, -10), casa(20, 30), casa(700, 10), casa(5, 5, false)]
  const baldosas = repartirEnBaldosas(casas)

  it('cada casa con huella va a una sola baldosa, la de su centro', () => {
    expect(baldosas.flatMap((b) => b.numeros).sort()).toEqual([0, 1, 2, 3, 4])
    expect(baldosas.find((b) => b.id === '0,0').numeros).toEqual([1, 3])
    expect(baldosas.find((b) => b.id === '-1,-1').numeros).toEqual([2])
    expect(baldosas.find((b) => b.id === '1,0')).toMatchObject({ i: 1, j: 0, numeros: [4] })
  })
  it('las más cercanas a la plaza van primero, y el orden no depende del de las casas', () => {
    expect(baldosas.map((b) => b.id)).toEqual(['-1,-1', '0,0', '1,0', '3,0'])
    expect(repartirEnBaldosas([...casas].reverse()).map((b) => b.id)).toEqual(baldosas.map((b) => b.id))
  })
  it('el lado de la baldosa se puede cambiar', () => {
    expect(repartirEnBaldosas(casas, 4000).map((b) => b.id)).toEqual(['-1,-1', '0,0'])
    expect(LADO_BALDOSA_M).toBeGreaterThan(100)
  })
})

describe('seVeEntre: espejo de vivoEn() del shader', () => {
  it('una casa que no muere se ve desde que nace', () => {
    expect(seVeEntre(2, 0, 1, 1)).toBe(false)
    expect(seVeEntre(2, 0, 2, 2)).toBe(true)
    expect(seVeEntre(2, 0, 5, 5)).toBe(true)
  })
  it('una que muere ya no se ve en la época de su muerte', () => {
    expect(seVeEntre(1, 3, 2, 2)).toBe(true)
    expect(seVeEntre(1, 3, 3, 3)).toBe(false)
    expect(seVeEntre(1, 3, 0, 0)).toBe(false)
  })
  it('durante la ola de una época a otra se ve lo que vive en cualquiera de las dos, o entre medio', () => {
    expect(seVeEntre(2, 0, 1, 2)).toBe(true) // nace con la ola
    expect(seVeEntre(1, 2, 1, 2)).toBe(true) // muere con la ola
    expect(seVeEntre(3, 4, 1, 5)).toBe(true) // vive solo entre medio de un salto largo
    expect(seVeEntre(1, 2, 5, 1)).toBe(true) // la ola hacia atrás es el mismo tramo
    expect(seVeEntre(4, 0, 1, 3)).toBe(false)
  })
  it('sin línea de tiempo (época 99), solo las que no mueren', () => {
    expect(seVeEntre(5, 0, 99, 99)).toBe(true)
    expect(seVeEntre(0, 2, 99, 99)).toBe(false)
  })
})

describe('ordenarPorVida y rangosVivos', () => {
  // cuatro casas de un triángulo cada una (vértices 0-2, 3-5, 6-8, 9-11), con vidas mezcladas
  const vidaDe = [[4, 0], [1, 3], [1, 0], [1, 3]]
  const vidas = new Uint8Array(vidaDe.flatMap((v) => [...v, ...v, ...v]))
  const indices = new Uint16Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  const { indices: ordenados, tramos } = ordenarPorVida(indices, vidas)

  it('conserva los triángulos enteros y el tipo de los índices', () => {
    expect(ordenados).toBeInstanceOf(Uint16Array)
    const triangulos = (a) => Array.from({ length: a.length / 3 }, (_, t) => [...a.slice(t * 3, t * 3 + 3)].join(','))
    expect(triangulos(ordenados).sort()).toEqual(triangulos(indices).sort())
    expect(indices[0]).toBe(0) // no toca la entrada
  })
  it('primero las que no mueren, por nacimiento; después las que mueren; cada vida, un tramo', () => {
    expect(tramos).toEqual([
      { nace: 1, muere: 0, desde: 0, cuantos: 3 },
      { nace: 4, muere: 0, desde: 3, cuantos: 3 },
      { nace: 1, muere: 3, desde: 6, cuantos: 6 },
    ])
    expect([...ordenados.slice(0, 3)]).toEqual([6, 7, 8])
    expect([...ordenados.slice(6)]).toEqual([3, 4, 5, 9, 10, 11])
  })
  it('en una época, los rangos de lo que vive, juntando los tramos seguidos', () => {
    expect(rangosVivos(tramos, 1, 1)).toEqual([{ desde: 0, cuantos: 3 }, { desde: 6, cuantos: 6 }])
    expect(rangosVivos(tramos, 5, 5)).toEqual([{ desde: 0, cuantos: 6 }])
    expect(rangosVivos(tramos, 0, 0)).toEqual([])
    expect(rangosVivos(tramos, 2, 5)).toEqual([{ desde: 0, cuantos: 12 }])
  })
  it('sin triángulos, nada', () => {
    expect(ordenarPorVida(new Uint32Array(0), new Uint8Array(0))).toEqual({ indices: new Uint32Array(0), tramos: [] })
  })
})

describe('esferaSobreRelieve', () => {
  const esfera = { centro: [100, 5, -40], radio: 300 }
  it('sin relieve queda igual', () => {
    expect(esferaSobreRelieve(esfera, 0, 0)).toEqual(esfera)
  })
  it('cubre la baldosa acostada (altura 0) y levantada sobre el terreno, con su margen', () => {
    expect(esferaSobreRelieve(esfera, 120, 200, 10)).toEqual({ centro: [100, 105, -40], radio: 410 })
  })
  it('un terreno bajo cero también cuenta', () => {
    expect(esferaSobreRelieve(esfera, -40, 60)).toEqual({ centro: [100, 15, -40], radio: 350 })
  })
})

describe('alturasBajo', () => {
  it('muestrea el terreno en el cuadrado de la esfera, bordes incluidos', async () => {
    const { alturasBajo } = await import('../../src/baldosas.js')
    const puntos = []
    const r = alturasBajo({ centro: [100, 0, -50], radio: 10 }, (x, z) => { puntos.push([x, z]); return x + z }, 3)
    expect(puntos).toHaveLength(9)
    expect(puntos[0]).toEqual([90, -60])
    expect(puntos.at(-1)).toEqual([110, -40])
    expect(r).toEqual({ yMin: 30, yMax: 70 })
  })
})
