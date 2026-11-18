import { describe, test, expect } from 'vitest'
import { teselasCercanas, rectTesela } from '../../src/teselas.js'

const laminas = { ancho: 7000, alto: 4000, tesela: 3072, cols: 3, rows: 2 }

describe('teselasCercanas', () => {
  test('el bloque 2×2 alrededor del punto, hacia los bordes más cercanos', () => {
    // (3000, 2900): tesela (0,0), cerca del borde derecho y del de abajo → (0,0) (1,0) (0,1) (1,1)
    expect(teselasCercanas(3000, 2900, laminas)).toEqual(['0-0', '1-0', '0-1', '1-1'])
    // (3200, 3200): tesela (1,1), cerca del borde izquierdo y del de arriba → (0,0) (1,0) (0,1) (1,1)
    expect(teselasCercanas(3200, 3200, laminas)).toEqual(['0-0', '1-0', '0-1', '1-1'])
    // (6500, 100): tesela (2,0), más cerca del borde izquierdo; la fila de abajo
    expect(teselasCercanas(6500, 100, laminas)).toEqual(['1-0', '2-0', '1-1', '2-1'])
  })

  test('en los bordes de la hoja no pide teselas que no existen', () => {
    expect(teselasCercanas(10, 10, laminas)).toEqual(['0-0', '1-0', '0-1', '1-1'])
    expect(teselasCercanas(-500, 9000, laminas)).toEqual(['0-0', '1-0', '0-1', '1-1'])
  })

  test('con una sola columna o fila devuelve menos de cuatro', () => {
    expect(teselasCercanas(100, 100, { ancho: 3000, alto: 2000, tesela: 3072, cols: 1, rows: 1 })).toEqual(['0-0'])
  })
})

describe('rectTesela', () => {
  test('el rectángulo de la tesela en coordenadas normalizadas de la hoja', () => {
    expect(rectTesela('0-0', laminas)).toEqual([0, 0, 3072 / 7000, 3072 / 4000])
    expect(rectTesela('2-1', laminas)).toEqual([6144 / 7000, 3072 / 4000, 1, 1])
  })
})
