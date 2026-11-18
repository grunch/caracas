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

import { crearTeselasFinas } from '../../src/teselas.js'

describe('crearTeselasFinas', () => {
  const laminasGrandes = { ancho: 30720, alto: 30720, tesela: 3072, cols: 10, rows: 10 }
  const ranuras = () => ({
    uFino: { value: Array(4).fill('respaldo') },
    uFinoRect: { value: Array.from({ length: 4 }, () => ({ fromArray() {} })) },
    uFinoOn: { value: [0, 0, 0, 0] },
  })
  const textura = (nombre) => ({ nombre, liberada: false, dispose() { this.liberada = true } })
  const esperar = () => new Promise((r) => setTimeout(r, 0))

  test('una ranura inactiva vuelve a la textura de respaldo antes de liberar la suya', async () => {
    const U = ranuras()
    const t = crearTeselasFinas({ laminas: laminasGrandes, cargar: async (url) => textura(url), U, pedirCuadro: () => {}, respaldo: () => 'respaldo' })
    t.update(100, 100, true)
    await esperar()
    t.update(100, 100, true) // ya cargadas: entran a las ranuras
    // cruzar muchos bloques: el caché libera las viejas; ninguna ranura puede quedar apuntando a una liberada
    for (let k = 0; k < 6; k++) {
      t.update(100 + k * 6144, 100 + k * 6144, true)
      expect(U.uFino.value.every((v) => v === 'respaldo' || !v.liberada)).toBe(true)
    }
    t.update(0, 0, false)
    expect(U.uFino.value).toEqual(Array(4).fill('respaldo'))
  })
})

describe('crearTeselasFinas con pedidos lentos', () => {
  const laminas = { ancho: 30720, alto: 30720, tesela: 3072, cols: 10, rows: 10 }
  const ranuras = () => ({
    uFino: { value: Array(4).fill('respaldo') },
    uFinoRect: { value: Array.from({ length: 4 }, () => ({ fromArray() {} })) },
    uFinoOn: { value: [0, 0, 0, 0] },
  })
  const esperar = () => new Promise((r) => setTimeout(r, 0))

  test('un pedido viejo que falla después de ser expulsado no borra el pedido nuevo de la misma tesela', async () => {
    const pendientes = []
    const cargar = (url) => new Promise((ok, mal) => pendientes.push({ url, ok, mal }))
    const U = ranuras()
    const t = crearTeselasFinas({ laminas, cargar, U, pedirCuadro: () => {}, respaldo: () => 'respaldo' })
    t.update(100, 100, true) // pide el bloque de la esquina
    for (let k = 1; k <= 3; k++) t.update(100 + k * 6144, 100 + k * 6144, true) // lo expulsa del caché
    t.update(100, 100, true) // vuelve: pedidos nuevos para las mismas teselas
    const nuevo = pendientes.filter((p) => p.url.endsWith('/0-0.webp')).at(-1)
    const textura = { liberada: false, dispose() { this.liberada = true } }
    nuevo.ok(textura)
    await esperar()
    pendientes.filter((p) => p.url.endsWith('/0-0.webp') && p !== nuevo).forEach((p) => p.mal(new Error('404')))
    await esperar()
    expect(t.cargadas).toContain('0-0')
    expect(textura.liberada).toBe(false)
  })

  test('una textura que llega después de que su tesela fue expulsada se libera enseguida', async () => {
    const pendientes = []
    const cargar = (url) => new Promise((ok) => pendientes.push({ url, ok }))
    const t = crearTeselasFinas({ laminas, cargar, U: ranuras(), pedirCuadro: () => {}, respaldo: () => 'respaldo' })
    t.update(100, 100, true)
    for (let k = 1; k <= 3; k++) t.update(100 + k * 6144, 100 + k * 6144, true)
    const tarde = { liberada: false, dispose() { this.liberada = true } }
    pendientes.find((p) => p.url.endsWith('/0-0.webp')).ok(tarde)
    await esperar()
    expect(t.cargadas).not.toContain('0-0')
    expect(tarde.liberada).toBe(true)
  })
})
