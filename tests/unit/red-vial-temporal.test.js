import { describe, it, expect } from 'vitest'
import { validarRedVial, redDeEpoca, importarReferencias } from '../../tools/red-vial-lib.mjs'
import { registroDelProyecto } from '../../tools/red-vial.mjs'
import { registro, fuentesDePrueba } from './red-vial-ayudas.js'

describe('red temporal sin heredar geometría actual', () => {
  it('solo emite etapas existentes y explícitas, sin convertir desconocido en ausencia', () => {
    expect(redDeEpoca(registro(), 1772).tramos).toHaveLength(1)
    expect(redDeEpoca(registro(), 1843).tramos).toHaveLength(0)
    expect(redDeEpoca(registro(), 1843).pendientes).toEqual(['calle'])
  })

  it('no emite proyectos aunque tengan geometría', () => {
    const r = registro()
    r.tramos[0].etapas[0].estado = 'proyecto'
    const corte = redDeEpoca(r, 1772)
    expect(corte.tramos).toHaveLength(0)
    expect(corte.proyectos).toEqual(['calle'])
  })

  it('rechaza un documento actual como única prueba histórica', () => {
    const r = registro()
    r.fuentes.p.tipo = 'actual'
    expect(() => validarRedVial(r)).toThrow(/histórica/)
  })

  it('rechaza una etapa existente anterior a la apertura de la estructura moderna', () => {
    const r = registro()
    r.tramos[0].desde = 1953
    r.tramos[0].fuentesCronologia = ['p']
    expect(() => validarRedVial(r)).toThrow(/antes de su apertura/)
  })

  it('detecta duplicados, años ambiguos, puntos inválidos y fuentes ausentes', () => {
    const cambios = [
      (r) => r.tramos.push(structuredClone(r.tramos[0])),
      (r) => r.tramos[0].etapas.push(structuredClone(r.tramos[0].etapas[0])),
      (r) => { r.tramos[0].etapas[0].anio = 1800 },
      (r) => { r.tramos[0].etapas[0].puntos[0] = [NaN, 2] },
      (r) => { r.tramos[0].etapas[0].fuentes = ['x'] },
      (r) => { r.tramos[0].etapas[0].ancho_m = -1 },
    ]
    for (const cambiar of cambios) {
      const r = registro()
      cambiar(r)
      expect(() => validarRedVial(r)).toThrow()
    }
  })

  it('no modifica ni devuelve las coordenadas originales por referencia', () => {
    const r = registro(), antes = structuredClone(r)
    const salida = redDeEpoca(r, 1772)
    salida.tramos[0].puntos[0][0] = 99
    salida.fuentes.p.anios.push(1843)
    expect(r).toEqual(antes)
  })

  it('conserva los trazados recuperados y la red de 1772, y aparta los sectores no medibles', () => {
    const ref = { tramos: [{ tramo: 'a', puntos: [[0, 0], [1, 1]], medible: true, banda_m: 5 }, { tramo: 'b', puntos: [[1, 1], [2, 2]], medible: false, banda_m: 9 }] }
    const recuperadas = { tramos: [{ id: 'c', anclajes: [[3, 3], [4, 4]], nota: 'Visible en ambos planos' }] }
    const r = importarReferencias(ref, recuperadas, fuentesDePrueba())
    expect(redDeEpoca(r, 1772).tramos.map((t) => t.tramo)).toEqual(['a', 'recuperado:c'])
    expect(redDeEpoca(r, 1772).sinMedir).toEqual(['b'])
    expect(redDeEpoca(r, 1936).tramos.map((t) => t.tramo)).toEqual(['recuperado:c'])
    expect(redDeEpoca(r, 1843).tramos).toHaveLength(0)
  })
})

describe('el registro del proyecto', () => {
  it('conserva los 11 trazados recuperados con su procedencia, en 1772 y en 1936', async () => {
    const red = await registroDelProyecto()
    for (const anio of [1772, 1936]) {
      const recuperados = redDeEpoca(red, anio).tramos.filter((t) => t.tramo.startsWith('recuperado:'))
      expect(recuperados).toHaveLength(11)
      expect(recuperados.every((t) => t.procedencia.original)).toBe(true)
    }
  })

  it('no extrapola la red de 1772 a las épocas que nadie digitalizó', async () => {
    const red = await registroDelProyecto()
    expect(redDeEpoca(red, 1772).tramos.length).toBeGreaterThan(400)
    for (const anio of [1843, 1889, 1911, 1936, 1946]) {
      const corte = redDeEpoca(red, anio)
      expect(corte.tramos.filter((t) => t.procedencia?.archivo === 'tools/geo/referencias/1772-calles-1936.json')).toHaveLength(0)
      expect(corte.pendientes.length).toBeGreaterThan(400)
    }
  })

  it('en 1843 no hay ningún tramo: nadie ha digitalizado el plano de Jesurún', async () => {
    const corte = redDeEpoca(await registroDelProyecto(), 1843)
    expect(corte.tramos).toHaveLength(0)
    expect(corte.inferidos).toHaveLength(0)
    expect(corte.sinMedir).toHaveLength(0)
  })
})
