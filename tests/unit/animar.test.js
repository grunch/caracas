import { describe, test, expect } from 'vitest'
import { acercar, pasoDeCuadro } from '../../src/animar.js'

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

describe('pasoDeCuadro', () => {
  test('con GPU, un cuadro avanza las animaciones a lo sumo 0,1 s (volver a la pestaña no salta)', () => {
    expect(pasoDeCuadro(0.016, false)).toBe(0.016)
    expect(pasoDeCuadro(3, false)).toBe(0.1)
  })

  test('con render por software los cuadros tardan segundos: la animación dura su tiempo, no tantos cuadros', () => {
    expect(pasoDeCuadro(5, true)).toBe(1)
    expect(pasoDeCuadro(0.4, true)).toBe(0.4)
  })
})
