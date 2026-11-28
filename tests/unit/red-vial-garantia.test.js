import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ANIOS_RED, posterioresAlUltimoCorte, proyeccionesIndebidas, redDeEpoca } from '../../tools/red-vial-lib.mjs'
import { registroDelProyecto, documentoDelCatalogo } from '../../tools/red-vial.mjs'
import { MARCAS } from '../../src/marcas-datos.js'
import { HITOS } from '../../src/hitos.js'
import { normalizarMarcas, nombreEn, vivaEn } from '../../src/marcas.js'
import { crearCoords } from '../../src/coords.js'

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8'))
const catalogo = leer('tools/geo/referencias/vialidad-posterior-1946.json')
const medicion = leer('docs/mediciones/vialidad/secciones-modernas.json')
const red = await registroDelProyecto()
const modernos = catalogo.tramos.filter((t) => t.desde > ANIOS_RED.at(-1))

describe('nada posterior a 1946 se proyecta en las épocas del sitio (#277, #278)', () => {
  it('el catálogo trae las vías que nombran los dos issues, todas con apertura posterior a 1946', () => {
    const ids = modernos.map((t) => t.id)
    for (const id of ['urdaneta-1953', 'fuerzas-armadas-1956', 'libertador-1965', 'norte-sur6-ensanche', 'andres-bello-1952', 'lecuna-1970',
      'autopista-la-guaira', 'autopista-del-este-1953', 'autopista-del-este-1955', 'autopista-valle-coche', 'boyaca-1971', 'distribuidor-baralt-boyaca']) {
      expect(ids, id).toContain(`moderno:${id}`)
    }
    expect(posterioresAlUltimoCorte(red)).toEqual(ids)
  })

  it('cada una sale como ausente en los seis cortes, y en ninguna otra lista', () => {
    for (const anio of ANIOS_RED) {
      const corte = redDeEpoca(red, anio)
      const presentes = new Set([...corte.tramos.map((t) => t.tramo), ...corte.inferidos.map((t) => t.tramo), ...corte.sinMedir, ...corte.obras, ...corte.proyectos, ...corte.pendientes])
      for (const t of modernos) {
        expect(corte.ausentes, `${t.id} en ${anio}`).toContain(t.id)
        expect(presentes.has(t.id), `${t.id} en ${anio}`).toBe(false)
      }
    }
  })

  it('las salidas reales no proyectan ningún tramo antes de su apertura', () => {
    expect(proyeccionesIndebidas(red)).toEqual([])
  })

  it('si alguien le agrega una etapa de 1946 a una avenida de 1953, el registro la rechaza', () => {
    const trampa = structuredClone(red)
    const urdaneta = trampa.tramos.find((t) => t.id === 'moderno:urdaneta-1953')
    urdaneta.etapas.push({
      anio: 1946, estado: 'existente', certeza: 'documentada', documento: 'plano1946', fuentes: ['plano1946'],
      fecha_hecho: { tipo: 'levantamiento', desde: 1946, hasta: 1946 }, nombre: 'Avenida Urdaneta', contradicciones: [],
      puntos: [[7000, 6200], [11000, 6800]], ancho_m: 26, error_m: 3.53,
    })
    expect(() => redDeEpoca(trampa, 1946)).toThrow(/existente antes de su apertura/)
  })

  it('ni la deja «en obra» en 1946: su cronología no trae obras antes de 1953', () => {
    const trampa = structuredClone(red)
    trampa.tramos.find((t) => t.id === 'moderno:urdaneta-1953').etapas.push({
      anio: 1946, estado: 'obra', certeza: 'documentada', documento: 'plano1946', fuentes: ['plano1946'],
      fecha_hecho: null, nombre: null, contradicciones: [], ancho_m: null, error_m: null,
    })
    expect(() => redDeEpoca(trampa, 1946)).toThrow(/obra en 1946 sin cronología/)
  })

  it('la carretera vieja de La Guaira (1845) no hereda la fecha de la autopista (1953)', () => {
    const vieja = catalogo.tramos.find((t) => t.id === 'moderno:carretera-vieja-la-guaira')
    expect(vieja).toMatchObject({ tipo: 'carretera', desde: 1845 })
    expect(redDeEpoca(red, 1889).ausentes).not.toContain(vieja.id)
    expect(redDeEpoca(red, 1889).pendientes).toContain(vieja.id)
    expect(redDeEpoca(red, 1843).ausentes).toContain(vieja.id)
  })

  it('una vía sin año de apertura queda pendiente, no ausente', () => {
    const universidad = catalogo.tramos.find((t) => t.id === 'moderno:universidad-ampliacion')
    expect(universidad.desde).toBeUndefined()
    expect(redDeEpoca(red, 1946).pendientes).toContain(universidad.id)
  })
})

describe('cada afirmación del catálogo, con su fuente', () => {
  it('toda afirmación de cronología lleva cita textual y una fuente con clase y enlace', () => {
    for (const t of catalogo.tramos) {
      expect(t.cronologia.length, t.id).toBeGreaterThan(0)
      for (const c of t.cronologia) {
        expect(c.cita, `${t.id}: ${c.dice}`).toMatch(/^«.+»/)
        for (const id of c.fuentes) expect(Object.keys(catalogo.clases_de_fuente), `${t.id}: ${id}`).toContain(catalogo.fuentes[id].clase)
      }
    }
  })

  it('lo que solo dice una fuente terciaria va como dudoso', () => {
    for (const t of catalogo.tramos) {
      for (const c of t.cronologia) {
        if (c.fuentes.every((id) => catalogo.fuentes[id].clase === 'terciaria')) expect(c.certeza, `${t.id}: ${c.dice}`).toBe('dudosa')
      }
    }
  })

  it('declara lo desconocido y las contradicciones en vez de elegir una fecha', () => {
    const de = (id) => catalogo.tramos.find((t) => t.id === `moderno:${id}`)
    expect(de('distribuidor-baralt-sur').contradicciones[0].asunto).toBe('año del distribuidor')
    expect(de('boyaca-1971').contradicciones.map((c) => c.asunto)).toContain('año del tramo La Castellana–El Marqués')
    expect(de('fuerzas-armadas-1956').desconocido).toContain('Ancho de la sección')
    expect(catalogo.tramos.every((t) => t.contradicciones.every((c) => c.estado === 'pendiente'))).toBe(true)
  })

  it('el documento del catálogo está al día con el JSON', async () => {
    const { actual, generado } = await documentoDelCatalogo()
    expect(actual).toBe(generado)
  })
})

describe('los nombres del sitio no adelantan ninguna vía', () => {
  // épocas de src/marcas-datos.js: 1 = 1772 … 6 = 1946 (0 es el esquema de 1578)
  const AÑO_DE_EPOCA = [1578, ...ANIOS_RED]
  const coords = crearCoords({ ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] })
  const marcas = normalizarMarcas(MARCAS, { hitos: HITOS, coords })
  const rotulo = (m, e) => nombreEn(m, e)?.nombre ?? ''
  const sinAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const nombresDe = (t) => [...(t.nombres ?? []).filter((n) => n.desde !== null).map((n) => ({ nombre: n.nombre, desde: n.desde })), ...(t.nombres_osm ?? []).map((nombre) => ({ nombre, desde: t.desde }))]

  it('ninguna marca lleva el nombre de una vía antes del año en que la vía lo recibe', () => {
    const adelantadas = []
    for (const t of catalogo.tramos.filter((x) => x.desde !== undefined)) {
      for (const { nombre, desde } of nombresDe(t)) {
        for (const m of marcas) {
          for (let e = 0; e < AÑO_DE_EPOCA.length; e++) {
            if (!vivaEn(m, e) || AÑO_DE_EPOCA[e] >= desde) continue
            if (sinAcentos(rotulo(m, e)).includes(sinAcentos(nombre))) adelantadas.push(`${m.id}: «${rotulo(m, e)}» en ${AÑO_DE_EPOCA[e]}, antes de ${desde}`)
          }
        }
      }
    }
    expect(adelantadas).toEqual([])
  })

  it('el control ve una marca adelantada cuando la hay', () => {
    const falsa = normalizarMarcas([{ id: 'falsa', nombre: 'Avenida Urdaneta', x: 9000, y: 6500, nace: 5, nivel: 2, fuente: 'prueba' }], { hitos: [], coords })[0]
    expect(vivaEn(falsa, 5)).toBe(true)
    expect(sinAcentos(rotulo(falsa, 5))).toContain(sinAcentos('Avenida Urdaneta'))
  })
})

describe('la medición versionada de las secciones de hoy contra las manzanas de cada época', () => {
  const via = (id) => medicion.vias.find((v) => v.id === `moderno:${id}`)

  it('mide todas las vías del catálogo que la capa Hoy trae con nombre', () => {
    const conNombre = catalogo.tramos.filter((t) => t.nombres_osm?.length).map((t) => t.id)
    expect(medicion.vias.map((v) => v.id)).toEqual(conNombre)
    for (const v of medicion.vias) expect(v.tramos_de_hoy, v.id).toBeGreaterThan(0)
  })

  it('en 1936 y 1946 las avenidas ensanchadas sobre una calle vieja siguen teniendo manzana sobre su eje de hoy', () => {
    for (const id of ['urdaneta-1953', 'fuerzas-armadas-1956', 'norte-sur6-ensanche']) {
      for (const anio of [1936, 1946]) expect(via(id).epocas[anio].dentro_pct, `${id} en ${anio}`).toBeGreaterThanOrEqual(25)
    }
  })

  it('y donde hay corredor, su ancho mediano queda por debajo de los 26 m de la Urdaneta de 1953', () => {
    for (const anio of [1911, 1936, 1946]) expect(via('urdaneta-1953').epocas[anio].ancho_mediana_m).toBeLessThan(26)
  })

  it('las autopistas y la Cota Mil corren por terreno sin manzanas: no hay corredor que se haya abierto para ellas', () => {
    for (const id of ['autopista-del-este-1953', 'autopista-la-guaira', 'autopista-valle-coche', 'boyaca-mariperez-la-florida']) {
      for (const anio of [1936, 1946]) expect(via(id).epocas[anio].corredor_pct, `${id} en ${anio}`).toBeLessThanOrEqual(5)
    }
  })

  it('los tramos sospechosos son todos anteriores a la apertura de su vía y quedan listados para revisar', () => {
    for (const v of medicion.vias) for (const s of v.sospechosos) expect(s.año, v.id).toBeLessThan(v.desde)
    expect(via('urdaneta-1953').sospechosos.filter((s) => s.año === 1936)).toHaveLength(3)
  })
})
