import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { documentoDe, validarCatalogo } from '../../tools/catalogo-evidencias.mjs'

const texto = (ruta) => readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8')
const leer = (ruta) => JSON.parse(texto(ruta))
const catalogo = leer('docs/evidencias/puentes-quebradas.json')
const documento = texto('docs/puentes-quebradas-evidencia.md')
const leyenda = leer('specs/auditoria-1843/leyenda.json')
const esquinas = leer('tools/geo/esquinas/1936-esquinas.json')
const calce1843 = leer('tools/geo/gcp/calce-1843-nypl-jesurun-facsimil-muller-stapler.json').residuos_m
const de = (id) => catalogo.tramos.find((t) => t.id === `puente:${id}`)
const etapa = (id, anio) => de(id).etapas.find((e) => e.anio === anio)
const puntos = (lectura) => [...lectura.matchAll(/\((\d+), (\d+)\)/g)].map((m) => [Number(m[1]), Number(m[2])])
const metros = ([ax, ay], [bx, by]) => Math.hypot(ax - bx, ay - by) * 0.5

describe('puentes sobre Catuche, Caroata y Anauco: ficha de evidencias (#271)', () => {
  it('el catálogo cumple la ficha de evidencias y el documento se genera desde él', () => {
    expect(validarCatalogo(catalogo)).toBe(catalogo)
    expect(documentoDe(catalogo, documento)).toBe(documento)
  })

  it('trae los ocho puentes de la leyenda de 1843, con el nombre que les da la leyenda', () => {
    const delCatalogo = catalogo.tramos.map((t) => etapa(t.id.slice(7), 1843).nombre.toLowerCase())
    const deLaLeyenda = leyenda.puentes.map((p) => p.nombre.toLowerCase().replace('union', 'unión'))
    expect(delCatalogo.toSorted()).toEqual(deLaLeyenda.toSorted())
    expect(leyenda.puentes.find((p) => p.letra === 'e').lectura).toBe('dudosa')
    expect(etapa('monroy', 1843).certeza).toBe('dudosa')
  })

  it('cada lectura de 1843 y de 1889 lleva el error del calce de su plano, y ninguna da un ancho', () => {
    for (const t of catalogo.tramos) {
      expect(etapa(t.id.slice(7), 1843).error_m, t.id).toBe(calce1843.p90)
      expect(etapa(t.id.slice(7), 1889).error_m, t.id).toBe(12.93)
      for (const e of t.etapas) expect([e.ancho_m, e.medible], `${t.id} ${e.anio}`).toEqual([null, false])
    }
  })

  it('Pastora (Carlos III) y Trinidad son dos puentes, a más de 500 m uno del otro', () => {
    const pastora = puntos(etapa('pastora', 1889).lectura)[0], trinidad = puntos(etapa('trinidad', 1889).lectura)[0]
    expect(metros(pastora, trinidad)).toBeGreaterThan(500)
    expect(de('pastora').cronologia.filter((c) => c.fuentes.includes('blo')).every((c) => c.fecha.desde >= 1784)).toBe(true)
  })

  it('en 1772 ningún puente figura como existente: lo que no se leyó queda desconocido', () => {
    for (const t of catalogo.tramos) expect(etapa(t.id.slice(7), 1772).estado, t.id).not.toBe('existente')
    expect([etapa('pastora', 1772).estado, etapa('trinidad', 1772).estado]).toEqual(['desconocido', 'desconocido'])
  })

  it('el Anauco no corresponde a 1772: obra de 1786 a 1790, y esas fechas van como dudosas', () => {
    expect(de('anauco').desde).toBe(1790)
    expect(etapa('anauco', 1772).estado).toBe('ausente')
    expect(de('anauco').cronologia.filter((c) => [1786, 1790].includes(c.fecha?.desde)).map((c) => c.certeza)).toEqual(['dudosa', 'dudosa'])
  })

  it('los nombres de esquina de 1936 son los del diccionario de esquinas, en su posición', () => {
    for (const [id, nombre] of [['trinidad', 'Puente Trinidad'], ['punceres', 'Punceres'], ['candelaria', 'Ña Romualda'], ['monroy', 'Monroy'], ['san-pablo', 'Puente San Pablo'], ['union', 'Puente Nuevo']]) {
      const [x, y] = esquinas.find((e) => e.nombre === nombre).px, e = etapa(id, 1936)
      expect(e.nombre, id).toBe(nombre)
      expect(e.lectura, id).toContain(`(${Math.round(x)}, ${Math.round(y)})`)
    }
  })

  it('donde el plano de 1936 no dibuja el cauce, el puente queda «no se sabe», no «existe»', () => {
    for (const id of ['punceres', 'candelaria', 'san-pablo']) {
      expect(etapa(id, 1936).estado, id).toBe('desconocido')
      expect(etapa(id, 1936).lectura, id).toMatch(/No hay cauce dibujado/)
    }
  })

  it('las distancias que cita el documento salen de las posiciones del catálogo', () => {
    // Arrange: el cruce es el segundo punto de la lectura de 1843 (el primero es la letra)
    const cruce1843 = (id) => puntos(etapa(id, 1843).lectura)[1], cruce1889 = (id) => puntos(etapa(id, 1889).lectura)[0]
    const letraX = puntos(etapa('anauco', 1843).lectura)[2], letraF = puntos(etapa('anauco', 1843).lectura)[0]
    const osmCarlosIII = [8295, 4647]

    // Assert
    expect(Math.round(metros(cruce1843('trinidad'), cruce1889('trinidad')) / 10) * 10).toBe(60)
    expect(metros(cruce1843('trinidad'), cruce1889('trinidad'))).toBeGreaterThan(calce1843.max)
    expect(Math.round(metros(cruce1843('monroy'), cruce1889('monroy')) / 10) * 10).toBe(30)
    expect(Math.round(metros(letraX, letraF) / 5) * 5).toBe(65)
    expect(Math.round(metros(osmCarlosIII, cruce1889('pastora')) / 10) * 10).toBe(30)
    expect(documento).toContain('error máximo del calce\n   de 1843 (30 m)')
  })

  it('Wikipedia y las crónicas sin referencias no acreditan nada como documentado', () => {
    const debil = (id) => ['terciaria', 'crónica sin referencias'].includes(catalogo.fuentes[id].clase)
    for (const t of catalogo.tramos) {
      for (const c of t.cronologia) {
        if (c.fuentes.every(debil)) expect(c.certeza, `${t.id}: ${c.dice}`).toBe('dudosa')
        for (const id of c.fuentes) expect(Object.keys(catalogo.clases_de_fuente), id).toContain(catalogo.fuentes[id].clase)
      }
    }
  })

  it('los otros puentes de la tabla están en el diccionario de esquinas, en esa posición', () => {
    for (const nombre of ['Puente Monagas', 'Puente Yanes', 'Puente Victoria', 'Puente Junín', 'Puente Arauca', 'Puente Casacoima', 'Puente Brión']) {
      const [x, y] = esquinas.find((e) => e.nombre === nombre).px
      expect(documento, nombre).toContain(`| ${nombre} | (${Math.round(x)}, ${Math.round(y)}) |`)
    }
  })
})
