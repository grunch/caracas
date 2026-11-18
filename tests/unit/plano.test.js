import { describe, test, expect } from 'vitest'
import { grillaTeselas, nivelesLOD, planoDesdeMosaico } from '../../tools/plano-lib.mjs'

describe('grillaTeselas', () => {
  test('cubre la imagen entera; la última fila y columna pueden ser más chicas', () => {
    const g = grillaTeselas(7000, 4000, 3072)
    expect(g).toMatchObject({ cols: 3, rows: 2, tesela: 3072 })
    expect(g.teselas).toHaveLength(6)
    expect(g.teselas[0]).toEqual({ i: 0, j: 0, x: 0, y: 0, ancho: 3072, alto: 3072, nombre: '0-0' })
    expect(g.teselas.at(-1)).toEqual({ i: 2, j: 1, x: 6144, y: 3072, ancho: 856, alto: 928, nombre: '2-1' })
  })

  test('rechaza medidas inválidas', () => {
    expect(() => grillaTeselas(0, 10, 256)).toThrow(/medidas/)
    expect(() => grillaTeselas(10, 10, 0)).toThrow(/tesela/)
  })
})

describe('nivelesLOD', () => {
  test('genera los niveles que no superan la imagen, con su nombre de archivo', () => {
    expect(nivelesLOD(18000, 14000).map((n) => [n.archivo, n.lado])).toEqual([
      ['primero.webp', 1024], ['chico.webp', 2048], ['medio-4k.webp', 4096], ['medio.webp', 8192],
    ])
    expect(nivelesLOD(3000, 2000).map((n) => n.archivo)).toEqual(['primero.webp', 'chico.webp'])
  })
})

describe('planoDesdeMosaico', () => {
  const mosaico = { metro: 0.5, ancho: 18000, alto: 14000, origen_m: [-3000, 3500], marco: [10, 20, 17990, 13980], plaza: [6000, 7000] }

  test('pasa las medidas del mosaico al bloque "plano" del visor', () => {
    expect(planoDesdeMosaico(mosaico)).toEqual({
      ancho: 18000, alto: 14000, metro: 0.5, plaza: [6000, 7000],
      marco: [10, 20, 17990, 13980], interior: [10, 20, 17990, 13980], origen_m: [-3000, 3500],
    })
  })

  test('falla si falta la plaza o la escala', () => {
    expect(() => planoDesdeMosaico({ ...mosaico, plaza: null })).toThrow(/plaza/)
    expect(() => planoDesdeMosaico({ ...mosaico, metro: undefined })).toThrow(/metro/)
  })
})
