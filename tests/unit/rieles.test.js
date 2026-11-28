import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { documentoDe, validarCatalogo } from '../../tools/catalogo-evidencias.mjs'
import { MARCAS } from '../../src/marcas-datos.js'

const texto = (ruta) => readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8')
const catalogo = JSON.parse(texto('docs/evidencias/rieles.json'))
const documento = texto('docs/rieles-evidencia.md')
const de = (id) => catalogo.tramos.find((t) => t.id === `riel:${id}`)
const etapa = (id, anio) => de(id).etapas.find((e) => e.anio === anio)
const estados = (id) => Object.fromEntries(de(id).etapas.map((e) => [e.anio, e.estado]))

describe('ferrocarriles y tranvías: ficha de evidencias (#273, #274)', () => {
  it('el catálogo cumple la ficha de evidencias y el documento se genera desde él', () => {
    expect(validarCatalogo(catalogo)).toBe(catalogo)
    expect(documentoDe(catalogo, documento)).toBe(documento)
  })

  it('las tres estaciones no son intercambiables: cada plano les da su rótulo', () => {
    expect(de('fc-la-guaira').etapas.map((e) => e.nombre)).toEqual(['Ferrocarril La Guaira a Caracas', 'Estación Caracas', 'Estación del F.C. de La Guaira', 'Estaciones'])
    expect(de('fc-central').etapas.map((e) => e.nombre)).toEqual(['Estación', 'Estación del F.C.', 'Estación del F.C. Central', null])
    expect(de('gran-ferrocarril').etapas.map((e) => e.nombre)).toEqual([null, 'Estación Palo Grande', 'Estación Palo Grande', 'Est. Palo Grande'])
  })

  it('el Gran Ferrocarril no se retrotrae a 1889: abre en 1890, y el plano de 1889, que no cubre Palo Grande, lo deja en «no se sabe»', () => {
    expect(de('gran-ferrocarril').desde).toBe(1890)
    expect(etapa('gran-ferrocarril', 1889).lectura).toMatch(/fuera de la hoja de Mestre/)
    expect(estados('gran-ferrocarril')).toEqual({ 1889: 'desconocido', 1911: 'existente', 1936: 'existente', 1946: 'existente' })
  })

  it('en 1889 el tranvía es de caballos; el eléctrico no existe hasta 1907 y no se borra en 1946', () => {
    expect(de('tranvia-animal').etapas.map((e) => e.anio)).toEqual([1889])
    expect(de('tranvia-electrico').desde).toBe(1907)
    expect(estados('tranvia-electrico')).toEqual({ 1889: 'ausente', 1911: 'existente', 1936: 'existente', 1946: 'existente' })
    expect(etapa('tranvia-electrico', 1946).certeza).toBe('inferida')
    const cierre = de('tranvia-electrico').cronologia.findLast((c) => c.tipo === 'demolicion')
    expect(cierre.fecha).toEqual({ desde: 1947, hasta: 1947 })
  })

  it('compañía en 1881 y servicio en 1882 son dos afirmaciones distintas, y las dos inferidas: la fuente declara incierta la fecha', () => {
    const [compania, servicio] = de('tranvia-animal').cronologia
    expect([compania.tipo, compania.fecha.desde, servicio.tipo, servicio.fecha.desde]).toEqual(['proyecto', 1881, 'apertura', 1882])
    expect([compania.certeza, servicio.certeza]).toEqual(['inferida', 'inferida'])
    expect(compania.cita).toMatch(/incierta/)
    expect(de('tranvia-animal').desde).toBeUndefined()
    // febrero de 1908 lo sostiene Morrison; la cronología de FAC, sin fuentes citadas, queda de apoyo
    expect(de('tranvia-electrico').cronologia.find((c) => c.fecha?.desde === 1908).fuentes).toEqual(['css', 'fv'])
  })

  it('el Ferrocarril Central de 1946 queda sin resolver, con su contradicción', () => {
    expect([etapa('fc-central', 1946).estado, etapa('fc-central', 1946).certeza]).toEqual(['desconocido', 'dudosa'])
    expect(de('fc-central').contradicciones.map((c) => [c.asunto, c.estado])).toEqual([['Cuándo deja de funcionar', 'pendiente']])
  })

  it('lo leído sobre el plano reducido de 1946 no pasa por lectura firme de un rótulo', () => {
    expect(etapa('fc-la-guaira', 1946).certeza).toBe('dudosa')
    for (const t of catalogo.tramos) for (const e of t.etapas.filter((x) => x.anio === 1946 && x.certeza === 'documentada')) expect(e.lectura, t.id).toContain('2 m por píxel')
  })

  it('las marcas de las estaciones caen en la zona leída y nacen en una época en la que la línea existe', () => {
    // índice de época de las marcas: 3 es 1889 y 4 es 1911 (public/plano/epocas.json)
    const anioDe = (indice) => ({ 3: 1889, 4: 1911, 5: 1936, 6: 1946 })[indice]
    for (const [marca, id] of [['cano-amarillo', 'fc-la-guaira'], ['fc-central', 'fc-central'], ['palo-grande', 'gran-ferrocarril']]) {
      const m = MARCAS.find((x) => x.id === marca), linea = de(id)
      const [x0, y0, x1, y1] = linea.etapas.find((e) => e.anio === 1936).recorte.caja
      expect(m.x >= x0 && m.x <= x1 && m.y >= y0 && m.y <= y1, marca).toBe(true)
      expect(anioDe(m.nace), marca).toBeGreaterThanOrEqual(linea.desde)
      expect(linea.etapas.find((e) => e.anio === anioDe(m.nace)).estado, marca).toBe('existente')
    }
  })

  it('Wikipedia sola no acredita nada como documentado, y cada fuente tiene su clase', () => {
    for (const t of catalogo.tramos) {
      for (const c of t.cronologia) {
        if (c.fuentes.every((id) => catalogo.fuentes[id].clase === 'terciaria')) expect(c.certeza, `${t.id}: ${c.dice}`).toBe('dudosa')
        for (const id of c.fuentes) expect(Object.keys(catalogo.clases_de_fuente), id).toContain(catalogo.fuentes[id].clase)
      }
    }
  })
})
