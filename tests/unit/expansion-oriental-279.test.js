import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { documentoDe, validarCatalogo } from '../../tools/catalogo-evidencias.mjs'
import { MARCAS } from '../../src/marcas-datos.js'
import { HITOS } from '../../src/hitos.js'

const texto = (ruta) => readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8')
const leer = (ruta) => JSON.parse(texto(ruta))
const catalogo = leer('docs/evidencias/expansion-oriental-1946.json')
const mosaico = leer('tools/geo/mosaico-1936.json')
const documento = texto('docs/issue-279-expansion-oriental.md')
const de = (id) => catalogo.tramos.find((t) => t.id === `este:${id}`)
const miles = (n) => String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+$)/g, '.')

describe('expansión oriental de 1946: cobertura de Altamira (#279)', () => {
  it('el catálogo cumple la ficha de evidencias y el documento se genera desde él', () => {
    expect(validarCatalogo(catalogo)).toBe(catalogo)
    expect(documentoDe(catalogo, documento)).toBe(documento)
  })

  it('la cobertura sale del marco real del mosaico, no de un número escrito a mano', () => {
    // Arrange
    const [, , este] = mosaico.extension_m
    const { cobertura } = catalogo

    // Assert
    expect(cobertura.borde_este_del_marco_m).toBe(este)
    expect(cobertura.plaza_bolivar_x_m).toBe(mosaico.plaza_m[0])
    for (const p of cobertura.puntos) {
      expect(p.fuera_del_marco_m, p.nombre).toBe(p.x_m - este)
      expect(p.al_este_de_la_plaza_m, p.nombre).toBe(Math.round(p.x_m - mosaico.plaza_m[0]))
      expect(p.osm, p.nombre).toMatch(/^(node|way|relation)\/\d+$/)
    }
  })

  it('Altamira y Chacao quedan fuera de la hoja y del plano de 1946; Sabana Grande y Chacaíto, dentro', () => {
    const fuera = (nombre) => catalogo.cobertura.puntos.find((p) => p.nombre.startsWith(nombre)).fuera_del_marco_m
    expect(fuera('Plaza Francia')).toBeGreaterThan(2000)
    expect(fuera('Obelisco')).toBeGreaterThan(2000)
    expect(fuera('Plaza Bolívar de Chacao')).toBeGreaterThan(1500)
    expect(fuera('Redoma de Las Delicias')).toBeLessThan(0)
    expect(fuera('Sabana Grande')).toBeLessThan(0)
    for (const p of catalogo.cobertura.puntos.filter((x) => x.fuera_del_marco_m > 0)) expect(p.x_m, p.nombre).toBeGreaterThan(catalogo.cobertura.interior_del_plano_1946_x_m)
  })

  it('el documento trae las mismas distancias que el catálogo', () => {
    for (const p of catalogo.cobertura.puntos) {
      expect(documento, p.nombre).toContain(`(\`${p.osm}\`) | ${miles(p.al_este_de_la_plaza_m)} m |`)
      expect(documento, p.nombre).toContain(`${miles(p.fuera_del_marco_m)} m ${p.fuera_del_marco_m > 0 ? 'afuera' : 'adentro'}`)
    }
  })

  it('lo que está fuera de la hoja no tiene lectura de plano: queda desconocido, no ausente', () => {
    for (const t of catalogo.tramos.filter((x) => x.encuadre === 'fuera')) {
      for (const e of t.etapas) {
        expect(e.estado, t.id).toBe('desconocido')
        expect(e.nombre, t.id).toBeNull()
      }
    }
    expect(de('calle-real-sabana-grande').etapas.map((e) => [e.anio, e.nombre])).toEqual([[1936, 'Calle Real de Sabana Grande'], [1946, 'Avenida Abraham Lincoln']])
  })

  it('el edificio Altamira, terminado en 1947, queda sin lectura en los seis cortes: no se afirma que estuviera ausente', () => {
    const edificio = de('edificio-altamira')
    expect(edificio.desde).toBeUndefined()
    expect(edificio.etapas).toEqual([])
    expect(edificio.cronologia.map((c) => [c.tipo, c.fecha.desde])).toEqual([['apertura', 1947]])
    expect(documento).toContain('`este:edificio-altamira` · edificio · sin lectura donde ningún plano lo acredita')
    expect(documento.split('\n').filter((l) => l.includes('edificio-altamira`') && l.includes('· ausente'))).toEqual([])
  })

  it('las fechas que las fuentes dan de dos maneras quedan como contradicciones pendientes', () => {
    const asuntos = catalogo.tramos.flatMap((t) => t.contradicciones.map((c) => [c.asunto, c.estado]))
    for (const asunto of ['Fecha de inauguración de la plaza', 'Altura del obelisco', 'Cuándo pasa a llamarse Plaza Francia', 'Fecha de la Carretera del Este']) {
      expect(asuntos).toContainEqual([asunto, 'pendiente'])
    }
    // una afirmación que otra contradice no puede ir como documentada
    const plaza = de('plaza-altamira')
    for (const c of plaza.cronologia) expect(c.certeza, c.dice).toBe('dudosa')
    // la misma contradicción de la Carretera del Este que el catálogo de caminos: 1875, 1934 y 1947, las tres dudosas
    const carretera = de('carretera-del-este')
    expect(carretera.contradicciones[0].afirmaciones.map((a) => a.fuente)).toEqual(['cil', 's50', 's54'])
    expect(carretera.cronologia.filter((c) => c.disputa).map((c) => [c.fecha.desde, c.certeza])).toEqual([[1875, 'dudosa'], [1934, 'dudosa'], [1947, 'dudosa']])
  })

  it('ninguna marca ni hito nombra lo que queda fuera de la hoja', () => {
    // Arrange
    const vedado = /altamira|plaza francia|chacao|carretera del este|francisco de miranda/i
    const nombres = [
      ...MARCAS.flatMap((m) => [m.id, m.nombre, ...(m.nombres ?? []).flat()]),
      ...HITOS.flatMap((h) => [h.id, h.nombre]),
    ].filter((n) => typeof n === 'string')

    // Assert
    expect(nombres.length).toBeGreaterThan(60)
    expect(nombres.filter((n) => vedado.test(n))).toEqual([])
  })
})
