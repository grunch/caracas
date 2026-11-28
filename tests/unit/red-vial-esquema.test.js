import { describe, it, expect } from 'vitest'
import { validarRedVial, redDeEpoca, fuenteDeFicha, levantamientoDe, unirRegistros, proyeccionesIndebidas, posterioresAlUltimoCorte, ANIOS_RED } from '../../tools/red-vial-lib.mjs'
import { registro, etapa } from './red-vial-ayudas.js'

const con = (cambiar) => { const r = registro(); cambiar(r); return r }
const laEtapa = (r) => r.tramos[0].etapas[0]

describe('ficha de evidencias de cada etapa (#269)', () => {
  it('exige la fecha del documento en cada fuente, aunque sea null', () => {
    expect(() => validarRedVial(con((r) => { delete r.fuentes.p.fecha_documento }))).toThrow(/fecha_documento/)
    expect(() => validarRedVial(con((r) => { r.fuentes.p.fecha_documento = null }))).not.toThrow()
    expect(() => validarRedVial(con((r) => { r.fuentes.p.fecha_documento = { desde: 1780, hasta: 1772 } }))).toThrow(/fecha inválida/)
  })

  it('exige la fecha del hecho, aparte de la del documento, aunque sea null', () => {
    expect(() => validarRedVial(con((r) => { delete laEtapa(r).fecha_hecho }))).toThrow(/fecha_hecho/)
    expect(() => validarRedVial(con((r) => { laEtapa(r).fecha_hecho = null }))).not.toThrow()
    expect(() => validarRedVial(con((r) => { laEtapa(r).fecha_hecho = { tipo: 'rumor', desde: 1772, hasta: 1772 } }))).toThrow(/tipo de hecho/)
  })

  it('rechaza un hecho posterior al documento que lo acredita', () => {
    const r = con((x) => { laEtapa(x).fecha_hecho = { tipo: 'apertura', desde: 1780, hasta: 1780 } })
    expect(() => validarRedVial(r)).toThrow(/posterior al documento/)
  })

  it('admite un documento posterior al hecho: el plano de fotos de 1946 se catalogó en 1950', () => {
    const r = con((x) => {
      x.fuentes.aereo = { tipo: 'historica', anios: [1946], url: 'https://ejemplo.org/1946', fecha_documento: { desde: 1946, hasta: 1950 } }
      x.tramos[0].etapas.push(etapa({ anio: 1946, documento: 'aereo', fuentes: ['aereo'], fecha_hecho: { tipo: 'levantamiento', desde: 1946, hasta: 1946 } }))
    })
    const [t] = redDeEpoca(r, 1946).tramos
    expect(t.fecha_documento).toEqual({ desde: 1946, hasta: 1950 })
    expect(t.fecha_hecho).toEqual({ tipo: 'levantamiento', desde: 1946, hasta: 1946 })
  })

  it('el documento de la etapa es una de sus fuentes históricas de ese año', () => {
    expect(() => validarRedVial(con((r) => { laEtapa(r).documento = 'otra' }))).toThrow(/documento de la etapa/)
    expect(() => validarRedVial(con((r) => { delete laEtapa(r).documento }))).toThrow(/documento de la etapa/)
  })

  it('exige certeza y nombre explícitos; el nombre puede ser null', () => {
    expect(() => validarRedVial(con((r) => { delete laEtapa(r).certeza }))).toThrow(/certeza/)
    expect(() => validarRedVial(con((r) => { laEtapa(r).certeza = 'segura' }))).toThrow(/certeza/)
    expect(() => validarRedVial(con((r) => { delete laEtapa(r).nombre }))).toThrow(/nombre/)
    const corte = redDeEpoca(con((r) => { laEtapa(r).nombre = 'Calle Real' }), 1772)
    expect(corte.tramos[0].nombre).toBe('Calle Real')
  })

  it('una contradicción enfrenta al menos dos afirmaciones con fuente, y dice si sigue pendiente', () => {
    const c = { asunto: 'fecha', afirmaciones: [{ dice: '1895', fuente: 'p' }, { dice: 'hacia 1890', fuente: 'p' }], estado: 'pendiente' }
    expect(() => validarRedVial(con((r) => { delete laEtapa(r).contradicciones }))).toThrow(/contradicciones/)
    expect(() => validarRedVial(con((r) => { laEtapa(r).contradicciones = [{ ...c, afirmaciones: [c.afirmaciones[0]] }] }))).toThrow(/dos afirmaciones/)
    expect(() => validarRedVial(con((r) => { laEtapa(r).contradicciones = [{ ...c, afirmaciones: [{ dice: 'x', fuente: 'no' }, c.afirmaciones[1]] }] }))).toThrow(/fuente ausente/)
    expect(() => validarRedVial(con((r) => { laEtapa(r).contradicciones = [{ ...c, estado: 'resuelta' }] }))).toThrow(/sin resolución/)
    const corte = redDeEpoca(con((r) => { laEtapa(r).contradicciones = [c] }), 1772)
    expect(corte.contradicciones).toEqual([{ tramo: 'calle', asunto: 'fecha' }])
  })

  it('una contradicción resuelta no sale como pendiente', () => {
    const c = { asunto: 'fecha', afirmaciones: [{ dice: 'a', fuente: 'p' }, { dice: 'b', fuente: 'p' }], estado: 'resuelta', resolucion: 'Manda el plano de la época.' }
    expect(redDeEpoca(con((r) => { laEtapa(r).contradicciones = [c] }), 1772).contradicciones).toEqual([])
  })

  it('el recorte del plano es una caja con área, o null', () => {
    expect(() => validarRedVial(con((r) => { laEtapa(r).recorte = { caja: [10, 10, 5, 20] } }))).toThrow(/recorte/)
    const corte = redDeEpoca(con((r) => { laEtapa(r).recorte = { caja: [0, 0, 10, 20] } }), 1772)
    expect(corte.tramos[0].recorte).toEqual({ caja: [0, 0, 10, 20] })
  })
})

describe('qué sale como red y qué no', () => {
  it('solo lo documentado y medible es red; lo inferido y lo dudoso van aparte, con su geometría', () => {
    for (const certeza of ['inferida', 'dudosa']) {
      const corte = redDeEpoca(con((r) => { laEtapa(r).certeza = certeza }), 1772)
      expect(corte.tramos).toHaveLength(0)
      expect(corte.inferidos.map((t) => [t.tramo, t.certeza])).toEqual([['calle', certeza]])
      expect(corte.pendientes).toEqual([])
    }
  })

  it('lo que el documento acredita sin dejar medir un eje sale en sinMedir, no en pendientes ni en ausentes', () => {
    const r = con((x) => { delete laEtapa(x).puntos; laEtapa(x).medible = false })
    const corte = redDeEpoca(r, 1772)
    expect(corte.sinMedir).toEqual(['calle'])
    expect(corte.tramos).toHaveLength(0)
    expect(corte.pendientes).toEqual([])
    expect(corte.ausentes).toEqual([])
  })

  it('sin medible:false, una etapa existente necesita sus puntos', () => {
    expect(() => validarRedVial(con((r) => { delete laEtapa(r).puntos }))).toThrow(/coordenadas/)
  })
})

describe('la ficha del tramo: tipo, nombres y cronología con fuente por afirmación', () => {
  const moderno = (cambios = {}) => con((r) => {
    r.fuentes.cr = { tipo: 'historica', anios: [], url: 'https://ejemplo.org/cronica', fecha_documento: { desde: 2013, hasta: 2013 } }
    r.tramos.push({
      id: 'moderno:avenida', tipo: 'avenida', desde: 1953, fuentesCronologia: ['cr'], encuadre: 'dentro', etapas: [],
      nombres: [{ nombre: 'Avenida Nueva', desde: 1953, hasta: null, fuentes: ['cr'] }],
      cronologia: [
        { tipo: 'obra', fecha: { desde: 1951, hasta: 1951 }, dice: 'Empiezan las demoliciones', fuentes: ['cr'], certeza: 'documentada' },
        { tipo: 'apertura', fecha: { desde: 1953, hasta: 1953 }, dice: 'Se inaugura', fuentes: ['cr'], certeza: 'documentada' },
      ],
      desconocido: ['Ancho de la sección'], contradicciones: [], ...cambios,
    })
  })

  it('acepta un tramo moderno completo y lo da por ausente en las seis épocas', () => {
    const r = moderno()
    expect(posterioresAlUltimoCorte(r)).toEqual(['moderno:avenida'])
    for (const a of ANIOS_RED) expect(redDeEpoca(r, a).ausentes).toContain('moderno:avenida')
    expect(proyeccionesIndebidas(r)).toEqual([])
  })

  it('cada afirmación de la cronología cita una fuente, lleva certeza y fecha (o null)', () => {
    const base = { tipo: 'apertura', fecha: { desde: 1953, hasta: 1953 }, dice: 'Se inaugura', fuentes: ['cr'], certeza: 'documentada' }
    expect(() => validarRedVial(moderno({ cronologia: [{ ...base, fuentes: [] }] }))).toThrow(/no cita ninguna fuente/)
    expect(() => validarRedVial(moderno({ cronologia: [{ ...base, fuentes: ['inexistente'] }] }))).toThrow(/no cita ninguna fuente/)
    expect(() => validarRedVial(moderno({ cronologia: [{ ...base, certeza: undefined }] }))).toThrow(/sin certeza/)
    expect(() => validarRedVial(moderno({ cronologia: [base, { ...base, tipo: 'reforma', fecha: undefined }] }))).toThrow(/sin fecha/)
    expect(() => validarRedVial(moderno({ cronologia: [base, { ...base, tipo: 'reforma', fecha: null }] }))).not.toThrow()
  })

  it('«desde» tiene que ser una apertura de la propia cronología', () => {
    const otra = [{ tipo: 'apertura', fecha: { desde: 1956, hasta: 1956 }, dice: 'Se inaugura', fuentes: ['cr'], certeza: 'documentada' }]
    expect(() => validarRedVial(moderno({ cronologia: otra }))).toThrow(/no coincide con ninguna apertura/)
  })

  it('rechaza tipos, encuadres y nombres mal formados', () => {
    expect(() => validarRedVial(moderno({ tipo: 'sendero' }))).toThrow(/tipo de tramo/)
    expect(() => validarRedVial(moderno({ encuadre: 'cerca' }))).toThrow(/encuadre/)
    expect(() => validarRedVial(moderno({ nombres: [{ nombre: 'X', desde: 1953, hasta: null, fuentes: [] }] }))).toThrow(/sin fuente/)
    expect(() => validarRedVial(moderno({ nombres: [{ nombre: 'X', fuentes: ['cr'] }] }))).toThrow(/desde inválido/)
    expect(() => validarRedVial(moderno({ desconocido: [''] }))).toThrow(/desconocido/)
  })

  it('antes de abrir, solo está en obra o en proyecto si su cronología lo dice para ese año', () => {
    const enObra = (anio) => etapa({ anio, estado: 'obra', documento: 'p', fuentes: ['p'], fecha_hecho: null })
    // la fuente «p» de prueba solo sirve para 1772 y 1936; la obra documentada empieza en 1951
    expect(() => validarRedVial(moderno({ etapas: [enObra(1936)] }))).toThrow(/obra en 1936 sin cronología/)
    const temprana = [
      { tipo: 'obra', fecha: { desde: 1935, hasta: 1935 }, dice: 'Empiezan las demoliciones', fuentes: ['cr'], certeza: 'documentada' },
      { tipo: 'apertura', fecha: { desde: 1953, hasta: 1953 }, dice: 'Se inaugura', fuentes: ['cr'], certeza: 'documentada' },
    ]
    const r = moderno({ cronologia: temprana, etapas: [enObra(1936)] })
    expect(redDeEpoca(r, 1936).obras).toEqual(['moderno:avenida'])
    expect(redDeEpoca(r, 1936).tramos.map((t) => t.tramo)).not.toContain('moderno:avenida')
    expect(proyeccionesIndebidas(r)).toEqual([])
  })
})

describe('fuentes desde las fichas del catálogo de mapas', () => {
  const ficha = { titulo: 'Plano de Caracas', año: '1950', año_representado: '1946', url_fuente: 'https://archive.org/details/WCWdb_18051', licencia: null }

  it('separa el año del documento del año que representa', () => {
    const f = fuenteDeFicha(ficha, { anios: [1946], ruta: 'fuentes/mapas/x/ficha.json' })
    expect(f.fecha_documento).toEqual({ desde: 1946, hasta: 1950 })
    expect(f.fecha_representada).toEqual({ desde: 1946, hasta: 1946 })
    expect(levantamientoDe(f)).toEqual({ tipo: 'levantamiento', desde: 1946, hasta: 1946 })
    expect(f).toMatchObject({ tipo: 'historica', anios: [1946], url: ficha.url_fuente, ficha: 'fuentes/mapas/x/ficha.json', licencia: null })
  })

  it('un facsímil sin fecha deja el documento en null y conserva lo que representa', () => {
    const f = fuenteDeFicha({ ...ficha, año: null, año_representado: '1843' }, { anios: [1843], ruta: 'r' })
    expect(f.fecha_documento).toBeNull()
    expect(levantamientoDe(f)).toEqual({ tipo: 'levantamiento', desde: 1843, hasta: 1843 })
  })

  it('sin año representado, el plano representa su propio año', () => {
    const f = fuenteDeFicha({ ...ficha, año: '1889', año_representado: null }, { anios: [1889], ruta: 'r' })
    expect(f.fecha_documento).toEqual({ desde: 1889, hasta: 1889 })
    expect(f.fecha_representada).toEqual({ desde: 1889, hasta: 1889 })
  })

  it('rechaza una ficha sin enlace o con un año que no es un año', () => {
    expect(() => fuenteDeFicha({ ...ficha, url_fuente: '' }, { anios: [1946], ruta: 'r' })).toThrow(/url_fuente/)
    expect(() => fuenteDeFicha({ ...ficha, año: 'hacia 1950' }, { anios: [1946], ruta: 'r' })).toThrow(/inválido/)
  })
})

describe('unir registros', () => {
  it('junta tramos y fuentes sin tocar las entradas', () => {
    const a = registro(), b = con((r) => { r.tramos[0].id = 'otra' }), antes = structuredClone(a)
    const u = unirRegistros(a, b)
    expect(u.tramos.map((t) => t.id)).toEqual(['calle', 'otra'])
    u.tramos[0].etapas[0].puntos[0][0] = 99
    expect(a).toEqual(antes)
  })

  it('rechaza dos fuentes distintas con el mismo id y un tramo repetido', () => {
    expect(() => unirRegistros(registro(), con((r) => { r.tramos[0].id = 'otra'; r.fuentes.p.url = 'https://ejemplo.org/otro' }))).toThrow(/fuente duplicada/)
    expect(() => unirRegistros(registro(), registro())).toThrow(/repetido/)
  })
})
