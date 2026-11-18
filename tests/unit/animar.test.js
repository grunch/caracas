import { describe, test, expect } from 'vitest'
import { acercar } from '../../src/animar.js'

describe('acercar', () => {
  test('avanza hacia el objetivo sin pasarse, en ambos sentidos', () => {
    expect(acercar(0, 10, 3)).toBe(3)
    expect(acercar(9, 10, 3)).toBe(10)
    expect(acercar(10, 0, 4)).toBe(6)
    expect(acercar(1, 0, 4)).toBe(0)
  })

  test('si ya llegó, no se mueve', () => {
    expect(acercar(5, 5, 1)).toBe(5)
  })
})
