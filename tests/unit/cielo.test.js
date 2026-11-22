import { describe, test, expect } from 'vitest'
import { Color } from 'three'
import { CIELO, colorDelCielo, brilloDelSol, trazoDelSol, nubosidad, crearCielo, cieloDeModo } from '../../src/cielo.js'
import { vectorSol } from '../../src/luz.js'

const luminancia = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b
const unitario = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l) }
const sol = vectorSol()
// del lado contrario al sol, con `y` como seno de la elevación
const lejosDelSol = (y) => {
  const h = Math.sqrt(1 - y * y)
  const [x, z] = unitario([-sol[0], -sol[2]])
  return [x * h, y, z * h]
}

describe('colorDelCielo', () => {
  test('arriba es celeste: el azul domina al rojo', () => {
    const [r, g, b] = colorDelCielo([0, 1, 0], { color: 1 })
    expect(b).toBeGreaterThan(r * 1.6)
    expect(b).toBeGreaterThan(g)
  })

  test('hacia el horizonte se aclara, como la bruma del valle', () => {
    const cenit = colorDelCielo([0, 1, 0], { color: 1 })
    const horizonte = colorDelCielo(lejosDelSol(0.02), { color: 1 })
    expect(luminancia(horizonte)).toBeGreaterThan(luminancia(cenit))
  })

  test('por debajo del horizonte queda el color del horizonte (no un hueco negro)', () => {
    expect(luminancia(colorDelCielo(lejosDelSol(-0.5)))).toBeGreaterThan(0.3)
  })

  test('el sol no encandila: ningún canal pasa de 1, ni mirándolo de frente', () => {
    for (const color of [0, 1]) for (const c of colorDelCielo(sol, { color })) expect(c).toBeLessThanOrEqual(1)
  })
})

describe('brilloDelSol', () => {
  test('el disco está entero en su centro y casi desaparece a pocos grados', () => {
    expect(brilloDelSol(1)).toBeCloseTo(1, 5)
    expect(brilloDelSol(Math.cos((5 * Math.PI) / 180))).toBeLessThan(0.25)
    expect(brilloDelSol(Math.cos((40 * Math.PI) / 180))).toBeLessThan(0.02)
  })

  test('baja siempre al alejarse del sol', () => {
    let antes = Infinity
    for (let g = 0; g <= 60; g += 0.5) {
      const b = brilloDelSol(Math.cos((g * Math.PI) / 180))
      expect(b).toBeLessThanOrEqual(antes)
      antes = b
    }
  })
})

describe('nubosidad', () => {
  test('algunas nubes, no un cielo tapado: entre el 10 % y el 45 % del cielo alto', () => {
    let nubes = 0
    let total = 0
    for (let i = -30; i <= 30; i++) {
      for (let j = -30; j <= 30; j++) {
        total++
        if (nubosidad(unitario([i / 30, 1, j / 30])) > 0.5) nubes++
      }
    }
    expect(nubes / total).toBeGreaterThan(0.1)
    expect(nubes / total).toBeLessThan(0.45)
  })

  test('no hay nubes bajo el horizonte y se desvanecen al acercarse a él', () => {
    expect(nubosidad([1, -0.2, 0])).toBe(0)
    expect(nubosidad(unitario([1, 0.001, 0]))).toBeLessThan(0.05)
  })
})

describe('en tinta (uColor = 0)', () => {
  const tinta = (d) => colorDelCielo(d, { color: 0 })

  test('el cielo es del papel: tibio, sin azul (el rojo no queda por debajo del azul)', () => {
    for (const d of [[0, 1, 0], lejosDelSol(0.05), lejosDelSol(0.4)]) {
      const [r, , b] = tinta(d)
      expect(r).toBeGreaterThanOrEqual(b)
      expect(luminancia(tinta(d))).toBeGreaterThan(0.6)
    }
  })

  test('las nubes llevan un trazo de tinta en el borde: algún punto del cielo es más oscuro que el papel', () => {
    let min = Infinity
    for (let i = -30; i <= 30; i++) for (let j = -30; j <= 30; j++) min = Math.min(min, luminancia(tinta(unitario([i / 30, 1, j / 30]))))
    expect(min).toBeLessThan(luminancia(tinta([0, 1, 0])) - 0.1)
  })

  test('el sol tiene su aro de tinta y adentro queda claro', () => {
    const aro = Math.cos((CIELO.disco + CIELO.borde / 2) * Math.PI / 180)
    expect(trazoDelSol(aro)).toBeGreaterThan(0.5)
    expect(trazoDelSol(1)).toBe(0)
    expect(trazoDelSol(Math.cos(5 * Math.PI / 180))).toBe(0)
  })

  test('en color no hay trazos: el cielo de color es el de siempre', () => {
    expect(colorDelCielo([0, 1, 0], { color: 1 })).toEqual(colorDelCielo([0, 1, 0]))
  })
})

describe('crearCielo', () => {
  test('sigue el mismo uColor que la ciudad (tinta ⇄ color con su transición)', () => {
    const U = { uColor: { value: 0 } }
    const { malla } = crearCielo({ U })
    expect(malla.material.uniforms.uColor).toBe(U.uColor)
  })

  test('una cúpula que se dibuja primero, detrás de todo, sin profundidad y sin tirar sombra', () => {
    const { malla } = crearCielo()
    expect(malla.renderOrder).toBeLessThan(0)
    expect(malla.frustumCulled).toBe(false)
    expect(malla.castShadow).toBe(false)
    expect(malla.material.depthWrite).toBe(false)
    expect(malla.material.depthTest).toBe(false)
  })

  test('oculta en el mapa; se muestra al recorrer la ciudad', () => {
    const cielo = crearCielo()
    expect(cielo.malla.visible).toBe(false)
    cielo.mostrar(true)
    expect(cielo.malla.visible).toBe(true)
    cielo.mostrar(false)
    expect(cielo.malla.visible).toBe(false)
  })

  test('el sol del cielo es el mismo que el de las sombras', () => {
    const u = crearCielo().malla.material.uniforms
    expect(u.uSol.value.toArray().map((v) => +v.toFixed(6))).toEqual(sol.map((v) => +v.toFixed(6)))
    expect(u.uColor_cenit.value).toBeInstanceOf(Color)
    expect(u.uTinta_cenit.value).toBeInstanceOf(Color)
  })
})

describe('cieloDeModo', () => {
  test('el cielo se ve caminando, manejando o volando; en el mapa, no', () => {
    expect(cieloDeModo(['modo', 'modo-caminar'])).toBe(true)
    expect(cieloDeModo(['modo', 'modo-manejar'])).toBe(true)
    expect(cieloDeModo(['modo', 'modo-volar'])).toBe(true)
    expect(cieloDeModo(['listo'])).toBe(false)
  })
})

test('CIELO está congelado', () => {
  expect(Object.isFrozen(CIELO)).toBe(true)
})
