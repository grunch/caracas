// La Plaza Mayor centrada en su manzana: entre las cuatro esquinas que la rodean en el plano de 1936 (Principal, La Torre,
// Las Monjas y Las Gradillas, verificadas en tools/geo/esquinas/1936-esquinas.json). Corrida al este, Sur 0 quedaba
// angosta y Sur 2 ancha frente a las manzanas de 1772, que se arman desde esos mismos cruces.
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { plazaBolivar } from '../../src/hitos/datos/plaza-bolivar.js'

const esquinas = JSON.parse(readFileSync(new URL('../../tools/geo/esquinas/1936-esquinas.json', import.meta.url), 'utf8'))
const px = (nombre) => esquinas.find((e) => e.nombre === nombre).px
const METRO = 0.5

/** Distancia (m) del punto p a la recta por a y b. */
function aRecta(p, a, b) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
  return (Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / Math.hypot(dx, dy)) * METRO
}

describe('Plaza Mayor', () => {
  const [principal, torre, monjas, gradillas] = ['Principal', 'La Torre', 'Las Monjas', 'Las Gradillas'].map(px)
  const planta = plazaBolivar.planta[0]
  const centro = planta.reduce(([x, y], [a, b]) => [x + a / 4, y + b / 4], [0, 0])

  test('su recuadro está centrado entre las cuatro esquinas que la rodean', () => {
    const medio = [principal, torre, monjas, gradillas].reduce(([x, y], [a, b]) => [x + a / 4, y + b / 4], [0, 0])
    expect(Math.hypot(centro[0] - medio[0], centro[1] - medio[1]) * METRO).toBeLessThan(0.5)
  })

  test('Sur 2 (oeste) y Sur 0 (este) quedan parejas a cada lado de la plaza', () => {
    const oeste = aRecta(centro, principal, monjas)
    const este = aRecta(centro, torre, gradillas)
    expect(Math.abs(oeste - este)).toBeLessThan(1.5)
  })
})
