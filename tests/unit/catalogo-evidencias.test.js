import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MARCA, documentoDe, ejecutar, tablaDeCortes, validarCatalogo } from '../../tools/catalogo-evidencias.mjs'

const fuentes = () => ({
  plano1936: { tipo: 'historica', anios: [1936], clase: 'plano de época', url: 'https://ejemplo.org/1936', fecha_documento: { desde: 1936, hasta: 1936 } },
  cronica: { tipo: 'historica', anios: [], clase: 'secundaria', url: 'https://ejemplo.org/cronica', fecha_documento: { desde: 2020, hasta: 2020 } },
})
const etapa = (cambios = {}) => ({
  anio: 1936, estado: 'existente', certeza: 'documentada', documento: 'plano1936', fuentes: ['plano1936'], fecha_hecho: null,
  nombre: 'Camino Real', contradicciones: [], ancho_m: null, error_m: null, medible: false, lectura: 'Doble trazo hasta el borde.', ...cambios,
})
const catalogo = (cambios = {}) => ({
  fuentes: fuentes(),
  tramos: [{
    id: 'camino:prueba', tipo: 'camino de recuas', nombre: 'Camino de prueba', sistema: 'Caminos', encuadre: 'parcial', contradicciones: [],
    desconocido: ['Su ancho'], etapas: [etapa()],
    cronologia: [{ tipo: 'apertura', fecha: { desde: 1845, hasta: 1845 }, dice: 'Se abre', cita: '«se abre»', fuentes: ['cronica'], certeza: 'documentada' }],
    ...cambios,
  }],
})

describe('catálogos de evidencias generados desde su JSON', () => {
  it('admite tipos propios del catálogo y valida lo demás con las reglas del registro vial', () => {
    // Arrange
    const doc = catalogo()

    // Act y Assert
    expect(validarCatalogo(doc)).toBe(doc)
    expect(() => validarCatalogo(catalogo({ etapas: [etapa({ documento: 'cronica' })] }))).toThrow(/documento de la etapa/)
    expect(() => validarCatalogo(catalogo({ etapas: [etapa({ lectura: '' })] }))).toThrow(/sin lectura/)
    expect(() => validarCatalogo(catalogo({ tipo: undefined }))).toThrow(/falta tipo/)
    expect(() => validarCatalogo(catalogo({ desconocido: undefined }))).toThrow(/desconocido/)
    expect(() => validarCatalogo({ fuentes: fuentes(), tramos: [] })).toThrow(/sin elementos/)
  })

  it('la tabla de cortes no confunde un plano sin leer con una ausencia', () => {
    // Act
    const tabla = tablaDeCortes(catalogo())

    // Assert
    expect(tabla).toContain('| Elemento | 1772 | 1843 | 1889 | 1911 | 1936 | 1946 |')
    expect(tabla).toContain('| Camino de prueba | Sin lectura | Sin lectura | Sin lectura | Sin lectura | **Existe** (documentada). «Camino Real». Doble trazo hasta el borde. | Sin lectura |')
  })

  it('conserva el encabezado escrito a mano y regenera lo que sigue a la marca', () => {
    // Arrange
    const actual = `# Título\n\nTexto a mano.\n\n${MARCA}\n\nviejo`

    // Act
    const generado = documentoDe(catalogo(), actual)

    // Assert
    expect(generado.startsWith(`# Título\n\nTexto a mano.\n\n${MARCA}\n\n## Lo que deja leer`)).toBe(true)
    expect(generado).not.toContain('viejo')
    expect(generado).toContain('### Camino de prueba')
    expect(generado).toContain('| 1845 | Apertura | Se abre | «se abre» | documentada | [1] |')
    expect(documentoDe(catalogo(), generado)).toBe(generado)
    expect(() => documentoDe(catalogo(), 'sin marca')).toThrow(/marca del catálogo/)
  })

  it('la CLI reescribe el documento y exige sus dos rutas', async () => {
    // Arrange
    const dir = mkdtempSync(join(tmpdir(), 'catalogo-'))
    writeFileSync(join(dir, 'datos.json'), JSON.stringify(catalogo()))
    writeFileSync(join(dir, 'doc.md'), `# Título\n\n${MARCA}\n`)

    // Act
    const generado = await ejecutar([join(dir, 'datos.json'), join(dir, 'doc.md')])

    // Assert
    expect(readFileSync(join(dir, 'doc.md'), 'utf8')).toBe(generado)
    await expect(ejecutar([])).rejects.toThrow(/uso:/)
  })
})
