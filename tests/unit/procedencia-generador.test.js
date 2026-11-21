// La procedencia de las entradas del generador de 1772 (specs/auditoria-1772/procedencia-generador.json) tiene que
// cubrir exactamente las entradas de esos pasos en tools/datos-pasos.mjs: si un paso suma una entrada, hay que
// clasificarla (histórica o heurística) antes de que llegue a la época de 1772.
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { PASOS } from '../../tools/datos-pasos.mjs'

const registro = JSON.parse(readFileSync(new URL('../../specs/auditoria-1772/procedencia-generador.json', import.meta.url), 'utf8'))

describe('procedencia de las entradas del generador de 1772', () => {
  test.each(Object.keys(registro.pasos))('el paso %s clasifica todas sus entradas y ninguna de más', (id) => {
    const paso = PASOS.find((p) => p.id === id)
    expect(paso, `el paso ${id} no existe en datos-pasos.mjs`).toBeDefined()
    expect(registro.pasos[id].map((e) => e.entrada).sort()).toEqual([...paso.entradas].sort())
  })

  test('cada entrada tiene una clase conocida y su nota', () => {
    for (const entradas of Object.values(registro.pasos)) {
      for (const e of entradas) {
        expect(Object.keys(registro.clases)).toContain(e.clase)
        expect(e.nota.length).toBeGreaterThan(0)
      }
    }
  })

  test('el generador lee la referencia histórica solo por el filtro de aprobadas (ninguna pendiente entra)', () => {
    const lee = Object.values(registro.pasos).flat()
      .filter((e) => e.entrada.includes('tools/geo/referencias/') && e.entrada.includes('unidades'))
    expect(lee.length).toBeGreaterThan(0)
    expect(lee.every((e) => e.clase === 'referencia_aprobada')).toBe(true)
  })
})
