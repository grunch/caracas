import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { importarPuentes, nombreEnElPlano } from '../../tools/red-vial-puentes.mjs'
import { redDeEpoca, validarRedVial } from '../../tools/red-vial-lib.mjs'
import { registroDelProyecto } from '../../tools/red-vial.mjs'
import { fuentesDePrueba } from './red-vial-ayudas.js'

const planos = {
  1911: { calce: { p90_m: 12, max_m: 20 }, leyenda: '«Puentes sobre el Guaire»: I Sucre (S. 7), II de Hierro (S. 5), III Restaurador (Av. S.)' },
  1936: { calce: { nota: 'Es la base.' } },
  1946: { calce: { p90_m: 3.5, max_m: 5 } },
}
const calce = (puente) => ({ descripcion: 'x', metodo: {}, planos, 'puente-prueba': { cruce: 'calle Sur 5 (Puente de Prueba, 1875)', ...puente } })
const deUnPuente = (puente) => importarPuentes(calce(puente), fuentesDePrueba()).tramos[0]

describe('nombre de un cruce en el plano de su época', () => {
  it('lee el rótulo entre comillas cuando el plano rotula', () => {
    expect(nombreEnElPlano({ dibuja: 'calzada continua rotulada «Puente de Hierro»; no marca las cabezas' }, planos[1936])).toBe('Puente de Hierro')
    expect(nombreEnElPlano({ dibuja: 'símbolo cruzado en X, rótulo «Puente Dolores»' }, planos[1936])).toBe('Puente Dolores')
  })

  it('busca el número romano en la leyenda del plano', () => {
    expect(nombreEnElPlano({ dibuja: 'calzada entre dos pares de pedestales, numerada II; orillas' }, planos[1911])).toBe('de Hierro')
    expect(nombreEnElPlano({ dibuja: 'calzada, numerada I' }, planos[1911])).toBe('Sucre')
  })

  it('devuelve null si el plano numera sin leyenda transcrita o no rotula', () => {
    expect(nombreEnElPlano({ dibuja: 'símbolo rayado del tablero, numerado 14' }, {})).toBeNull()
    expect(nombreEnElPlano({ dibuja: 'calzada, numerada IX' }, planos[1911])).toBeNull()
    expect(nombreEnElPlano({ dibuja: 'no hay puente: la calle llega al río' }, planos[1911])).toBeNull()
  })
})

describe('importar los cruces del Guaire como tramos con etapas', () => {
  it('un puente con las dos cabezas leídas es un tramo medible, con el error del calce de ese plano', () => {
    const t = deUnPuente({ 1911: { dibuja: 'calzada, numerada II', cabeza_norte: { mosaico: [10, 20] }, cabeza_sur: { mosaico: [12, 80] } } })
    expect(t).toMatchObject({ id: 'puente:prueba', tipo: 'puente' })
    expect(t.etapas).toHaveLength(1)
    expect(t.etapas[0]).toMatchObject({
      anio: 1911, estado: 'existente', certeza: 'documentada', documento: 'plano1911', nombre: 'de Hierro',
      puntos: [[10, 20], [12, 80]], error_m: 12, ancho_m: null, contradicciones: [],
      fecha_hecho: { tipo: 'levantamiento', desde: 1911, hasta: 1911 },
    })
  })

  it('una calzada rotulada sin cabezas existe pero no se mide; conserva el ancho que da el plano', () => {
    const t = deUnPuente({ 1946: { dibuja: 'calzada continua rotulada «Puente Soublette»; no marca las cabezas', cabeza_norte: null, cabeza_sur: null, ancho_de_calzada_m: 19.5 } })
    expect(t.etapas[0]).toMatchObject({ anio: 1946, estado: 'existente', medible: false, nombre: 'Puente Soublette', ancho_m: 19.5, error_m: 3.5 })
    expect(t.etapas[0].puntos).toBeUndefined()
    expect(t.etapas[0].fecha_hecho).toEqual({ tipo: 'levantamiento', desde: 1946, hasta: 1946 })
  })

  it('«no hay puente» en el plano es ausencia documentada, no falta de datos', () => {
    const t = deUnPuente({ 1911: { dibuja: 'no hay puente: la calle llega al río por las dos orillas', cabeza_norte: null, cabeza_sur: null } })
    expect(t.etapas[0]).toMatchObject({ anio: 1911, estado: 'ausente', certeza: 'documentada', nombre: null })
  })

  it('si el plano lo dibuja más lejos del de 1936 que el error máximo de su calce, es dudoso y queda la contradicción', () => {
    const t = deUnPuente({ 1911: {
      dibuja: 'calzada, numerada III', cabeza_norte: { mosaico: [10, 20] }, cabeza_sur: { mosaico: [12, 80] },
      desvio_del_centro_de_1936_m: { a_lo_largo_del_eje: 77.7, hacia: 'norte', de_traves: 19.5, de_traves_hacia: 'este' },
    } })
    const [e] = t.etapas
    expect(e.certeza).toBe('dudosa')
    expect(e.contradicciones).toHaveLength(1)
    expect(e.contradicciones[0]).toMatchObject({ asunto: 'posición del cruce', estado: 'pendiente' })
    expect(e.contradicciones[0].afirmaciones.map((a) => a.fuente)).toEqual(['plano1911', 'plano1936'])
    expect(e.contradicciones[0].afirmaciones[0].dice).toMatch(/77,7 m/)
  })

  it('un desvío dentro del error del calce no es una contradicción', () => {
    const t = deUnPuente({ 1911: {
      dibuja: 'calzada, numerada II', cabeza_norte: { mosaico: [10, 20] }, cabeza_sur: { mosaico: [12, 80] },
      desvio_del_eje_de_1936_m: { cabeza_norte: 1.5, cabeza_sur: 2.3, hacia: 'este' },
    } })
    expect(t.etapas[0].certeza).toBe('documentada')
    expect(t.etapas[0].contradicciones).toEqual([])
  })

  it('no agrega etapas para los planos que el calce no leyó', () => {
    const t = deUnPuente({ 1936: { dibuja: 'calzada continua rotulada «Puente de Prueba»', eje: { punto: [1, 2], direccion: [0, 1] } } })
    expect(t.etapas.map((e) => e.anio)).toEqual([1936])
  })

  it('no toca el calce de entrada', () => {
    const entrada = calce({ 1911: { dibuja: 'calzada, numerada II', cabeza_norte: { mosaico: [10, 20] }, cabeza_sur: { mosaico: [12, 80] } } })
    const antes = structuredClone(entrada)
    importarPuentes(entrada, fuentesDePrueba()).tramos[0].etapas[0].puntos[0][0] = 99
    expect(entrada).toEqual(antes)
  })
})

describe('los cruces reales (docs/puentes-guaire-calce.json)', () => {
  const real = JSON.parse(readFileSync(new URL('../../docs/puentes-guaire-calce.json', import.meta.url), 'utf8'))
  const red = importarPuentes(real, fuentesDePrueba())
  const etapaDe = (id, anio) => red.tramos.find((t) => t.id === id).etapas.find((e) => e.anio === anio)

  it('importa los seis cruces calzados y el resultado es un registro válido', () => {
    expect(() => validarRedVial(red)).not.toThrow()
    expect(red.tramos.map((t) => t.id)).toEqual(['puente:hierro', 'puente:sucre', 'puente:dolores', 'puente:restaurador', 'puente:19-diciembre', 'puente:ayacucho'])
  })

  it('cada cruce lleva el nombre de cada época, no uno solo', () => {
    expect([1911, 1936, 1946].map((a) => etapaDe('puente:dolores', a).nombre)).toEqual(['Dolores', 'Puente Dolores', 'Puente Soublette'])
    expect([1911, 1936].map((a) => etapaDe('puente:19-diciembre', a).nombre)).toEqual(['19 de Diciembre', 'Puente 9 de Diciembre'])
    expect(etapaDe('puente:hierro', 1889).nombre).toBeNull()
  })

  it('el Ayacucho (1924) está ausente en 1911 porque el plano no lo dibuja', () => {
    expect(etapaDe('puente:ayacucho', 1911).estado).toBe('ausente')
    expect(etapaDe('puente:ayacucho', 1936).estado).toBe('existente')
  })

  it('Dolores, Restaurador y 19 de Diciembre quedan dudosos en 1911: el plano los dibuja lejos de 1936', () => {
    for (const id of ['puente:dolores', 'puente:restaurador', 'puente:19-diciembre']) {
      expect(etapaDe(id, 1911).certeza, id).toBe('dudosa')
      expect(etapaDe(id, 1911).contradicciones.length, id).toBe(1)
    }
    expect(etapaDe('puente:hierro', 1911).certeza).toBe('documentada')
  })

  it('ningún cruce tiene etapa en 1772 ni en 1843: el calce no leyó esos planos', () => {
    for (const t of red.tramos) expect(t.etapas.some((e) => e.anio < 1889)).toBe(false)
  })
})

describe('cobertura del registro del proyecto con los cruces', () => {
  it('1889, 1911, 1936 y 1946 dejan de estar vacías, cada una con lo que su plano acredita', async () => {
    const red = await registroDelProyecto()
    const cuenta = (anio) => {
      const c = redDeEpoca(red, anio)
      const puentes = (lista) => lista.filter((x) => (x.tramo ?? x).startsWith('puente:')).length
      return { tramos: puentes(c.tramos), inferidos: puentes(c.inferidos), sinMedir: puentes(c.sinMedir), ausentes: puentes(c.ausentes) }
    }
    expect(cuenta(1889)).toEqual({ tramos: 2, inferidos: 0, sinMedir: 0, ausentes: 0 })
    expect(cuenta(1911)).toEqual({ tramos: 2, inferidos: 3, sinMedir: 0, ausentes: 1 })
    expect(cuenta(1936)).toEqual({ tramos: 1, inferidos: 0, sinMedir: 5, ausentes: 0 })
    expect(cuenta(1946)).toEqual({ tramos: 0, inferidos: 0, sinMedir: 4, ausentes: 0 })
  })
})
