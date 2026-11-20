import { describe, test, expect } from 'vitest'
import { debeArrancar, esperaDeArranque, velocidadDeOla, vistaDeHoja, VISTA_CENTRO, ESPERA_MS } from '../../src/arranque.js'

const p = (q) => new URLSearchParams(q)

describe('debeArrancar', () => {
  test('una visita normal arranca con la entrada: color, la ciudad que se levanta y el vuelo', () => {
    expect(debeArrancar(p(''))).toBe(true)
    expect(debeArrancar(p('intro'))).toBe(true)
  })

  test('los tests, las capturas y la vitrina empiezan quietos', () => {
    for (const q of ['capture', 'sinintro', 'vitrina', 'quieto']) expect(debeArrancar(p(q))).toBe(false)
  })
})

describe('esperaDeArranque', () => {
  test('después de cerrar la bienvenida, menos; sin bienvenida, un poco más para ver el plano', () => {
    expect(esperaDeArranque(true)).toBe(ESPERA_MS.trasIntro)
    expect(esperaDeArranque(false)).toBe(ESPERA_MS.sinIntro)
    expect(ESPERA_MS.trasIntro).toBeLessThan(ESPERA_MS.sinIntro)
  })
})

describe('velocidadDeOla', () => {
  test('al levantar, la ola acelera a medida que se aleja del centro', () => {
    expect(velocidadDeOla(0, true)).toBeGreaterThan(0)
    expect(velocidadDeOla(5000, true)).toBeGreaterThan(velocidadDeOla(0, true))
  })

  test('al acostar baja de golpe, rápida y pareja', () => {
    expect(velocidadDeOla(0, false)).toBe(velocidadDeOla(5000, false))
    expect(velocidadDeOla(0, false)).toBeGreaterThan(velocidadDeOla(5000, true))
  })

  test('una ciudad de 10 km se levanta en unos tres segundos', () => {
    // Arrange
    let frente = 0
    let t = 0
    // Act
    while (frente < 10000) { frente += velocidadDeOla(frente, true) / 60; t += 1 / 60 }
    // Assert
    expect(t).toBeGreaterThan(2)
    expect(t).toBeLessThan(4.5)
  })
})

describe('vistaDeHoja', () => {
  test('la hoja entera, desde arriba, centrada', () => {
    const v = vistaDeHoja({ x0: -1000, z0: -500, ancho: 4000, alto: 2000 })
    expect(v).toMatchObject({ x: 1000, z: 500, yaw: 0 })
    expect(v.pitch).toBeGreaterThan(1.4)
    expect(v.dist).toBeGreaterThan(4000)
  })
})

describe('VISTA_CENTRO', () => {
  test('cerca de la plaza (el origen), inclinada y mirando al norte, hacia el Ávila', () => {
    expect(Math.hypot(VISTA_CENTRO.x, VISTA_CENTRO.z)).toBeLessThan(600)
    expect(VISTA_CENTRO.pitch).toBeLessThan(0.8)
    expect(Math.abs(VISTA_CENTRO.yaw)).toBeLessThan(0.8)
    expect(Object.isFrozen(VISTA_CENTRO)).toBe(true)
  })
})
