import { describe, expect, it } from 'vitest'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { HITOS } from '../../src/hitos.js'
import { normalizarMarcas } from '../../src/marcas.js'
import { contenidoDeFicha } from '../../src/fichas.js'
import { crearCoords } from '../../src/coords.js'
import { cementerioSur } from '../../src/hitos/datos/cementerio-sur.js'

const coords = crearCoords({ ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] })
const marcas = normalizarMarcas(MARCAS, { hitos: HITOS, coords })
const dato = id => MARCAS.find(m => m.id === id)

describe('cierre de #250: los dos cementerios ya tienen hito', () => {
  it('la marca del General del Sur va enlazada a su hito y no se mueve', () => {
    // Arrange
    const marca = marcas.find(m => m.id === 'cementerio-sur')
    // Assert
    expect(dato('cementerio-sur').hito).toBe('cementerio-sur')
    expect(dato('cementerio-sur').x).toBeUndefined()
    expect(dato('cementerio-sur').y).toBeUndefined()
    expect([marca.px, marca.py]).toEqual([cementerioSur.x, cementerioSur.y])
    expect([marca.px, marca.py]).toEqual([7100, 12500])
    expect(marca.nace).toBe(3)
  })

  it('ninguna de las dos marcas sigue diciendo que el hito está pendiente', () => {
    for (const id of ['cementerio-sur', 'hijos-de-dios']) {
      expect(dato(id).dudas, id).not.toMatch(/pendiente de integración/i)
      expect(dato(id).dudas, id).not.toMatch(/no delimita/i)
    }
  })

  it('la ficha de 1946 del Sur cita el plano de 1946 que se cotejó, no un ejemplar sin inspeccionar', () => {
    const marca = marcas.find(m => m.id === 'cementerio-sur')
    const texto = contenidoDeFicha({ marca, ficha: FICHAS['cementerio-sur'], epoca: 6 }).parrafos.find(p => p.rige).texto
    expect(texto).not.toMatch(/no se pudo inspeccionar/)
    expect(texto).toMatch(/1946/)
    expect(texto).toMatch(/norte/)
    expect(dato('cementerio-sur').fuente).toContain('https://archive.org/details/WCWdb_18051')
  })
})
