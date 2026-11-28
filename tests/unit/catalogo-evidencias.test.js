import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CLASES_DEBILES, MARCA, documentoDe, ejecutar, tablaDeCortes, validarCatalogo } from '../../tools/catalogo-evidencias.mjs'

const fuentes = () => ({
  plano1936: { tipo: 'historica', anios: [1936], clase: 'plano de época', url: 'https://ejemplo.org/1936', fecha_documento: { desde: 1936, hasta: 1936 } },
  cronica: { tipo: 'historica', anios: [], clase: 'secundaria con referencias', url: 'https://ejemplo.org/cronica', fecha_documento: { desde: 2020, hasta: 2020 } },
  wiki: { tipo: 'historica', anios: [], clase: 'terciaria', url: 'https://ejemplo.org/wiki', fecha_documento: null },
})
const clases = () => ({ 'plano de época': 'Plano calzado.', 'secundaria con referencias': 'Cita sus fuentes: admite «documentada».', terciaria: 'Solo dudosa.' })
const afirmacion = (cambios = {}) => ({ tipo: 'apertura', fecha: { desde: 1845, hasta: 1845 }, dice: 'Se abre', cita: '«se abre»', fuentes: ['cronica'], certeza: 'documentada', ...cambios })
const disputa = () => ({ asunto: 'Fecha', estado: 'pendiente', afirmaciones: [{ dice: '1845', fuente: 'cronica' }, { dice: '1846', fuente: 'wiki' }] })
const etapa = (cambios = {}) => ({
  anio: 1936, estado: 'existente', certeza: 'documentada', documento: 'plano1936', fuentes: ['plano1936'], fecha_hecho: null,
  nombre: 'Camino Real', contradicciones: [], ancho_m: null, error_m: null, medible: false, lectura: 'Doble trazo hasta el borde.', ...cambios,
})
const catalogo = (cambios = {}) => ({
  clases_de_fuente: clases(), fuentes: fuentes(),
  tramos: [{
    id: 'camino:prueba', tipo: 'camino de recuas', nombre: 'Camino de prueba', sistema: 'Caminos', encuadre: 'parcial', contradicciones: [],
    desconocido: ['Su ancho'], etapas: [etapa()],
    cronologia: [afirmacion()],
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
    expect(() => validarCatalogo(catalogo({ etapas: undefined }))).toThrow(/o etapas/)
    expect(() => validarCatalogo({ fuentes: fuentes(), tramos: [] })).toThrow(/sin elementos/)
    expect(() => validarCatalogo({ ...catalogo(), clases_de_fuente: undefined })).toThrow(/clases_de_fuente/)
  })

  it('«documentada» pide un documento de época o una fuente con referencias', () => {
    // Arrange
    const soloWikipedia = afirmacion({ fuentes: ['wiki'] })

    // Act y Assert
    expect(CLASES_DEBILES).toEqual(['secundaria sin referencias', 'crónica sin referencias', 'terciaria'])
    expect(() => validarCatalogo(catalogo({ cronologia: [soloWikipedia] }))).toThrow(/solo cita fuentes sin referencias o terciarias/)
    expect(validarCatalogo(catalogo({ cronologia: [{ ...soloWikipedia, certeza: 'dudosa' }] }))).toBeTruthy()
    expect(validarCatalogo(catalogo({ cronologia: [afirmacion({ fuentes: ['cronica', 'wiki'] })] }))).toBeTruthy()
    expect(() => validarCatalogo({ ...catalogo(), clases_de_fuente: { 'plano de época': 'Plano.' } })).toThrow(/no tiene una clase definida/)
  })

  it('lo que está en una contradicción pendiente no puede ir como documentado', () => {
    // Arrange
    const enDisputa = afirmacion({ disputa: 'Fecha' })

    // Act y Assert
    expect(() => validarCatalogo(catalogo({ contradicciones: [disputa()], cronologia: [enDisputa] }))).toThrow(/está en una contradicción pendiente/)
    expect(validarCatalogo(catalogo({ contradicciones: [disputa()], cronologia: [{ ...enDisputa, certeza: 'dudosa' }] }))).toBeTruthy()
    expect(() => validarCatalogo(catalogo({ cronologia: [{ ...enDisputa, certeza: 'dudosa' }] }))).toThrow(/no es una contradicción pendiente/)
    expect(() => validarCatalogo(catalogo({ etapas: [etapa({ contradicciones: [{ ...disputa(), afirmaciones: [{ dice: 'a', fuente: 'cronica' }, { dice: 'b', fuente: 'plano1936' }] }] })] }))).toThrow(/etapa de 1936 va como documentada/)
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

    try {
      // Act
      const generado = await ejecutar([join(dir, 'datos.json'), join(dir, 'doc.md')])

      // Assert
      expect(readFileSync(join(dir, 'doc.md'), 'utf8')).toBe(generado)
      expect(generado).toContain('sin lectura donde ningún plano lo acredita')
      await expect(ejecutar([])).rejects.toThrow(/uso:/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
