import { describe, test, expect } from 'vitest'
import {
  areaConSigno, simplificar, simplificarAdentro, rectanguloMinimo, recortar, recortarConvexo, estaDentro, crearIndice, cruces,
} from '../../src/poligono.js'

const cuadrado = [[0, 0], [10, 0], [10, 10], [0, 10]]

describe('areaConSigno', () => {
  test('da el área del anillo, con el signo de su sentido de giro', () => {
    expect(areaConSigno(cuadrado)).toBe(100)
    expect(areaConSigno([...cuadrado].reverse())).toBe(-100)
  })
})

describe('simplificar', () => {
  test('quita los vértices que se apartan menos que la tolerancia de la recta', () => {
    // un rectángulo trazado a píxeles: vértices de más sobre los lados, con dientes de 0,2 m
    const dentado = [[0, 0], [3, 0.2], [6, -0.1], [10, 0], [10.1, 5], [10, 10], [5, 10.2], [0, 10], [-0.2, 4]]
    const s = simplificar(dentado, 0.5)
    expect(s).toHaveLength(4)
    expect(Math.abs(areaConSigno(s))).toBeCloseTo(100, 0)
  })

  test('conserva las esquinas de verdad (una L sigue siendo una L)', () => {
    const ele = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]]
    expect(simplificar(ele, 0.5)).toHaveLength(6)
  })

  test('nunca devuelve menos de tres vértices ni un polígono sin área: ahí deja el original', () => {
    const fino = [[0, 0], [10, 0.1], [20, 0], [10, 0.2]]
    expect(simplificar(fino, 0.5)).toEqual(fino)
    const triangulo = [[0, 0], [5, 0], [2, 4]]
    expect(simplificar(triangulo, 0.5)).toEqual(triangulo)
  })

  test('no cambia el anillo de entrada', () => {
    const copia = cuadrado.map((p) => [...p])
    simplificar(cuadrado, 0.5)
    expect(cuadrado).toEqual(copia)
  })
})

describe('rectanguloMinimo', () => {
  test('de un rectángulo girado da sus lados y su eje', () => {
    const [c, s] = [Math.cos(0.3), Math.sin(0.3)]
    const girado = [[0, 0], [20, 0], [20, 8], [0, 8]].map(([x, z]) => [x * c - z * s + 5, x * s + z * c - 2])
    const r = rectanguloMinimo(girado)
    expect([r.ancho, r.fondo].sort((a, b) => a - b).map((v) => +v.toFixed(3))).toEqual([8, 20])
    // el eje u es unitario y está alineado con un lado
    expect(Math.hypot(...r.u)).toBeCloseTo(1, 6)
    expect(Math.abs(r.u[0] * c + r.u[1] * s) > 0.999 || Math.abs(-r.u[0] * s + r.u[1] * c) > 0.999).toBe(true)
    expect(r.area).toBeCloseTo(160, 3)
  })

  test('las cuatro esquinas encierran todos los puntos', () => {
    const ele = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]]
    const r = rectanguloMinimo(ele)
    expect(r.area).toBeCloseTo(100, 3)
    expect(r.esquinas).toHaveLength(4)
  })
})

describe('recortar', () => {
  test('se queda con la parte del polígono del lado positivo de la recta', () => {
    // x >= 4  →  1·x + 0·z − 4 >= 0
    const r = recortar(cuadrado, 1, 0, -4)
    expect(Math.abs(areaConSigno(r))).toBeCloseTo(60, 6)
    expect(Math.min(...r.map((p) => p[0]))).toBeCloseTo(4, 6)
  })

  test('si queda todo afuera, devuelve vacío', () => {
    expect(recortar(cuadrado, 1, 0, -20)).toEqual([])
  })

  test('recortarConvexo corta contra una región convexa en cualquier sentido de giro', () => {
    const region = [[5, 5], [20, 5], [20, 20], [5, 20]]
    expect(Math.abs(areaConSigno(recortarConvexo(cuadrado, region)))).toBeCloseTo(25, 6)
    expect(Math.abs(areaConSigno(recortarConvexo(cuadrado, [...region].reverse())))).toBeCloseTo(25, 6)
  })
})

describe('estaDentro', () => {
  test('dice si el punto cae dentro del anillo', () => {
    expect(estaDentro(cuadrado, 5, 5)).toBe(true)
    expect(estaDentro(cuadrado, 15, 5)).toBe(false)
    const ele = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]]
    expect(estaDentro(ele, 8, 8)).toBe(false)
    expect(estaDentro(ele, 2, 8)).toBe(true)
  })
})

describe('cruces', () => {
  test('da los parámetros (0..1) donde el segmento cruza el borde del anillo, ordenados', () => {
    expect(cruces([-5, 5], [15, 5], cuadrado)).toEqual([0.25, 0.75])
    expect(cruces([2, 2], [8, 8], cuadrado)).toEqual([])
  })
})

describe('crearIndice', () => {
  const casas = [cuadrado, [[20, 0], [30, 0], [30, 10], [20, 10]], null]
  const indice = crearIndice(casas, 8)

  test('dice si un punto está ocupado por alguna casa', () => {
    expect(indice.ocupado(5, 5)).toBe(true)
    expect(indice.ocupado(25, 5)).toBe(true)
    expect(indice.ocupado(15, 5)).toBe(false) // la calle entre las dos
    expect(indice.ocupado(-500, 900)).toBe(false)
  })

  test('puede no contar una casa (la propia)', () => {
    expect(indice.ocupado(5, 5, 0)).toBe(false)
    expect(indice.ocupado(25, 5, 0)).toBe(true)
  })
})

describe('simplificarAdentro', () => {
  const dentro = (anillo, original) => anillo.every(([x, z]) => estaDentro(original, x, z) ||
    original.some((p, k) => {   // o sobre el borde
      const q = original[(k + 1) % original.length]
      const largo = Math.hypot(q[0] - p[0], q[1] - p[1])
      return Math.abs((q[0] - p[0]) * (z - p[1]) - (q[1] - p[1]) * (x - p[0])) / largo < 1e-9
    }))

  test('quita los dientes que sobresalen y nunca deja el anillo afuera del original', () => {
    // un rectángulo trazado a píxeles con dientes hacia afuera y hacia adentro de 0,2 m
    const dentado = [[0, 0], [3, 0.2], [6, -0.1], [10, 0], [10.1, 5], [10, 10], [5, 10.2], [0, 10], [-0.2, 4]]
    const s = simplificarAdentro(dentado, 0.5)
    expect(s.length).toBeLessThan(dentado.length)
    expect(dentro(s, dentado)).toBe(true)
    expect(Math.abs(areaConSigno(s))).toBeLessThanOrEqual(Math.abs(areaConSigno(dentado)))
    expect(Math.abs(areaConSigno(s))).toBeGreaterThan(95)
  })

  test('dos vecinas que comparten la medianera dentada no se pisan después de simplificar', () => {
    const medianera = [[10, 0], [10.2, 3], [9.8, 6], [10.1, 8], [10, 10]]
    const izq = [[0, 0], ...medianera, [0, 10]]
    const der = [[20, 0], [20, 10], ...[...medianera].reverse()]
    const [a, b] = [simplificarAdentro(izq, 0.5), simplificarAdentro(der, 0.5)]
    expect(dentro(a, izq) && dentro(b, der)).toBe(true)
  })

  test('el error no se acumula: ningún vértice original queda a más de la tolerancia del contorno nuevo', () => {
    // revisión de #141: un círculo de 10 m con 64 puntos se volvía un pentágono, con 2,27 m de desvío
    const circulo = Array.from({ length: 64 }, (_, k) => [10 * Math.cos((2 * Math.PI * k) / 64), 10 * Math.sin((2 * Math.PI * k) / 64)])
    const s = simplificarAdentro(circulo, 0.6)
    // solo hacia adentro, 0,6 m de flecha deja un polígono inscrito de 9 lados: 92,6 % del área (el pentágono, 74 %)
    expect(Math.abs(areaConSigno(s)) / Math.abs(areaConSigno(circulo))).toBeGreaterThan(0.9)
    const alBorde = ([x, z]) => Math.min(...s.map((p, k) => {
      const q = s[(k + 1) % s.length]
      const [dx, dz] = [q[0] - p[0], q[1] - p[1]]
      const t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / (dx * dx + dz * dz)))
      return Math.hypot(x - p[0] - t * dx, z - p[1] - t * dz)
    }))
    for (const p of circulo) expect(alBorde(p)).toBeLessThanOrEqual(0.6 + 1e-9)
    expect(dentro(s, circulo)).toBe(true)
  })

  test('conserva las esquinas de verdad y el sentido de giro', () => {
    const ele = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]]
    expect(simplificarAdentro(ele, 0.5)).toEqual(ele)
    const horario = [...ele].reverse()
    expect(Math.sign(areaConSigno(simplificarAdentro(horario, 0.5)))).toBe(-1)
  })

  test('nunca devuelve menos de tres vértices, y no cambia el anillo de entrada', () => {
    const triangulo = [[0, 0], [5, 0], [2, 4]]
    expect(simplificarAdentro(triangulo, 0.5)).toEqual(triangulo)
    const copia = cuadrado.map((p) => [...p])
    simplificarAdentro(cuadrado, 0.5)
    expect(cuadrado).toEqual(copia)
  })
})
