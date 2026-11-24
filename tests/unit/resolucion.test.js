import { describe, it, expect } from 'vitest'
import { crearResolucionAdaptable } from '../../src/resolucion.js'

const varios = (r, ms, n = 12) => { let ultimo = null; for (let i = 0; i < n; i++) ultimo = r.cuadro(ms) ?? ultimo; return ultimo }

describe('crearResolucionAdaptable', () => {
  it('con cuadros rápidos no cambia nada', () => {
    const r = crearResolucionAdaptable({ maxima: 2 })
    expect(varios(r, 8, 60)).toBe(null)
    expect(r.puesta).toBe(2)
  })
  it('con cuadros lentos baja de a un cuarto, una vez por ventana, hasta el piso', () => {
    const r = crearResolucionAdaptable({ maxima: 2, minima: 1 })
    expect(varios(r, 40, 11)).toBe(null) // todavía no juntó la ventana
    expect(r.cuadro(40)).toBe(1.75)
    expect(varios(r, 40)).toBe(1.5)
    expect(varios(r, 40, 36)).toBe(1)
    expect(varios(r, 40, 24)).toBe(null) // en el piso no baja más
    expect(r.enMovimiento).toBe(1)
  })
  it('un cuadro lento suelto no la baja: decide la mediana', () => {
    const r = crearResolucionAdaptable({ maxima: 2 })
    for (let i = 0; i < 11; i++) r.cuadro(10)
    expect(r.cuadro(500)).toBe(null)
  })
  it('al quedar quieta vuelve a la máxima; al moverse de nuevo, a la que le daba fluidez', () => {
    const r = crearResolucionAdaptable({ maxima: 2 })
    varios(r, 40, 24)
    expect(r.puesta).toBe(1.5)
    expect(r.quieta()).toBe(2)
    expect(r.quieta()).toBe(null) // ya está
    expect(r.cuadro(40)).toBe(1.5) // el primer cuadro del movimiento vuelve a la reducida, sin medirlo
    expect(r.cuadro(40)).toBe(null)
  })
  it('después de bajar no vuelve a probar enseguida la proporción que resultó lenta; pasada la espera, sí', () => {
    const r = crearResolucionAdaptable({ maxima: 2 })
    varios(r, 40, 24) // 2 y 1,75 resultaron lentas: queda en 1,5
    expect(r.puesta).toBe(1.5)
    expect(varios(r, 16, 48 * 12)).toBe(null) // va fluida, pero 1,75 está vedada
    expect(varios(r, 16, 2 * 12)).toBe(1.75) // pasaron las 50 ventanas: prueba de nuevo
    expect(varios(r, 16)).toBe(2)
    expect(varios(r, 16)).toBe(null)
  })
  it('una bajada por un tirón (la carga, el recolector) se recupera sola', () => {
    const r = crearResolucionAdaptable({ maxima: 2 })
    varios(r, 200) // un tramo lento: baja a 1,75
    expect(varios(r, 16, 51 * 12)).toBe(2)
  })
  it('entre lento y rápido se queda donde está', () => {
    const r = crearResolucionAdaptable({ maxima: 2 })
    varios(r, 40)
    expect(varios(r, 25, 36)).toBe(null)
    expect(r.puesta).toBe(1.75)
  })
  it('si la máxima ya es el piso (o menos), nunca cambia', () => {
    const r = crearResolucionAdaptable({ maxima: 1, minima: 1 })
    expect(varios(r, 80, 48)).toBe(null)
    expect(crearResolucionAdaptable({ maxima: 0.75, minima: 1 }).quieta()).toBe(null)
  })
})
