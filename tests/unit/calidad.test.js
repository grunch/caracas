import { describe, test, expect } from 'vitest'
import { esLiviano, esMinimo, proporcionDePixeles, cuantosTrabajadores } from '../../src/calidad.js'

const equipo = (cambios = {}) => ({ params: new URLSearchParams(''), maxTextura: 16384, pantalla: { ancho: 1440, alto: 900 }, memoria: 8, ...cambios })

describe('esLiviano', () => {
  test('una laptop con buena GPU no es liviana', () => {
    expect(esLiviano(equipo())).toBe(false)
  })

  test('es liviano un teléfono (lado corto < 600), una GPU que no llega a 8192 o poca memoria', () => {
    expect(esLiviano(equipo({ pantalla: { ancho: 390, alto: 844 } }))).toBe(true)
    expect(esLiviano(equipo({ maxTextura: 4096 }))).toBe(true)
    expect(esLiviano(equipo({ memoria: 2 }))).toBe(true)
  })

  test('sin dato de memoria (Safari, Firefox) cuenta como suficiente', () => {
    expect(esLiviano(equipo({ memoria: undefined }))).toBe(false)
  })

  test('?liviano lo fuerza y ?pesado lo impide', () => {
    expect(esLiviano(equipo({ params: new URLSearchParams('liviano') }))).toBe(true)
    expect(esLiviano(equipo({ params: new URLSearchParams('pesado'), pantalla: { ancho: 390, alto: 844 } }))).toBe(false)
  })
})

describe('proporcionDePixeles', () => {
  test('hasta 2 en equipos completos y hasta 1,5 en livianos: en un teléfono de 3× es lo que más cuesta', () => {
    expect(proporcionDePixeles({ dpr: 3, liviano: false })).toBe(2)
    expect(proporcionDePixeles({ dpr: 3, liviano: true })).toBe(1.5)
    expect(proporcionDePixeles({ dpr: 1, liviano: true })).toBe(1)
  })

  test('las capturas van siempre a 1', () => {
    expect(proporcionDePixeles({ dpr: 2, liviano: false, captura: true })).toBe(1)
  })
})

describe('cuantosTrabajadores', () => {
  test('uno menos que los núcleos, hasta 4', () => {
    expect(cuantosTrabajadores({ nucleos: 16, liviano: false })).toBe(4)
    expect(cuantosTrabajadores({ nucleos: 4, liviano: false })).toBe(3)
    expect(cuantosTrabajadores({ nucleos: 2, liviano: false })).toBe(1)
  })
  test('en un equipo liviano, hasta 2', () => {
    expect(cuantosTrabajadores({ nucleos: 8, liviano: true })).toBe(2)
  })
  test('nunca menos de uno; sin el dato de los núcleos, 2', () => {
    expect(cuantosTrabajadores({ nucleos: 1, liviano: false })).toBe(1)
    expect(cuantosTrabajadores({ nucleos: undefined, liviano: false })).toBe(2)
    expect(cuantosTrabajadores({ nucleos: 0, liviano: true })).toBe(2)
  })
  test('con el render por software, uno solo: dibujar ya se lleva los núcleos', () => {
    expect(cuantosTrabajadores({ nucleos: 16, liviano: false, software: true })).toBe(1)
  })
})

describe('el nivel mínimo', () => {
  const sin = new URLSearchParams()
  test('lo fuerza ?minimo, lo impide ?pesado, y si no lo decide la memoria que declara el equipo (2 GB o menos)', () => {
    expect(esMinimo({ params: new URLSearchParams('minimo'), memoria: 8 })).toBe(true)
    expect(esMinimo({ params: new URLSearchParams('pesado'), memoria: 1 })).toBe(false)
    expect(esMinimo({ params: sin, memoria: 2 })).toBe(true)
    expect(esMinimo({ params: sin, memoria: 4 })).toBe(false)
    expect(esMinimo({ params: sin, memoria: undefined })).toBe(false) // Safari y Firefox no lo dicen
  })
  test('un píxel por punto y un solo worker', () => {
    expect(proporcionDePixeles({ dpr: 3, liviano: true, minimo: true })).toBe(1)
    expect(proporcionDePixeles({ dpr: 3, liviano: true, minimo: true, captura: true })).toBe(1)
    expect(cuantosTrabajadores({ nucleos: 8, liviano: true, minimo: true })).toBe(1)
  })
})
