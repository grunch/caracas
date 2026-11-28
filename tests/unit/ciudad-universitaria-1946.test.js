// Ciudad Universitaria en 1946 (#264): la lectura del plano y la cronología por edificio tienen forma comprobable,
// y el mapa de 1946 la muestra en construcción, sin el campus terminado.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { HITOS } from '../../src/hitos.js'
import { normalizarMarcas, nombreEn, vivaEn } from '../../src/marcas.js'
import { contenidoDeFicha } from '../../src/fichas.js'
import { crearCoords } from '../../src/coords.js'
import { puntoEnPoligono } from '../../src/hitos/suprimir.js'

const UCV = JSON.parse(readFileSync(new URL('../../tools/geo/referencias/1946-ciudad-universitaria.json', import.meta.url), 'utf8'))
const [EPOCA_1936, EPOCA_1946] = [5, 6]
const TIFF = { ancho: 14954, alto: 9952 }
const coords = crearCoords(JSON.parse(readFileSync(new URL('../../public/datos/ciudad.json', import.meta.url), 'utf8')).plano)
const marcas = normalizarMarcas(MARCAS, { hitos: HITOS, coords })
const marca = (id) => marcas.find((m) => m.id === id)
const textoDe = (id, epoca) => contenidoDeFicha({ marca: marca(id), ficha: FICHAS[id], epoca }).parrafos.filter((p) => p.rige).map((p) => p.texto).join(' ')
const elemento = (id) => UCV.elementos.find((e) => e.id === id)

describe('lectura de la Ciudad Universitaria en el plano de 1946', () => {
  it('cada elemento dice su trazo y cae dentro de la hoja', () => {
    const mal = UCV.elementos.filter(({ trazo, caja_original: [x0, y0, x1, y1] }) => !['lleno', 'discontinuo'].includes(trazo)
      || !(x0 >= 0 && y0 >= 0 && x1 > x0 && y1 > y0 && x1 <= TIFF.ancho && y1 <= TIFF.alto))

    expect(UCV.elementos.length).toBeGreaterThanOrEqual(15)
    expect(mal.map((e) => e.id)).toEqual([])
  })

  it('transcribe los siete rótulos de edificio que trae el plano', () => {
    const rotulos = UCV.elementos.map((e) => e.rotulo).filter(Boolean)

    expect(rotulos).toEqual(['HOSPITAL CLINICO', 'INST. ANATOMICO', 'INST. DE CIRUGIA EXPERIMENTAL', 'INSTITUTO ANATOMOPATOLOGICO',
      'INSTITUTO DE HIGIENE', 'LAVANDERIA', 'ESCUELA TECNICA INDUSTRIAL'])
  })

  it('las plantas de trazo lleno traen su contorno dentro de su caja', () => {
    // Arrange
    const llenas = UCV.elementos.filter((e) => e.plantas_original)

    // Act
    const fuera = llenas.filter(({ caja_original: [x0, y0, x1, y1], plantas_original }) =>
      plantas_original.flat().some(([x, y]) => x < x0 || x > x1 || y < y0 || y > y1))

    // Assert
    expect(llenas.length).toBeGreaterThanOrEqual(8)
    expect(fuera.map((e) => e.id)).toEqual([])
  })
})

describe('cronología por edificio', () => {
  it('cada elemento declara su estado en 1946 con un valor del vocabulario', () => {
    const estados = Object.keys(UCV.estados)

    expect(UCV.elementos.filter((e) => !estados.includes(e.cronologia.estado1946)).map((e) => e.id)).toEqual([])
  })

  it('toda afirmación fechada cita una fuente registrada con enlace', () => {
    // Arrange
    const sigla = (cita) => cita.split(' ')[0]
    const fechados = UCV.elementos.filter((e) => e.cronologia.obra || e.cronologia.terminacion || e.cronologia.proyecto)

    // Act
    const sinFuente = [...fechados.map((e) => [e.id, e.cronologia.fuentes]), ...UCV.posteriores.map((p) => [p.nombre, p.fuentes])]
      .filter(([, fuentes]) => fuentes.length === 0 || fuentes.some((f) => !UCV.fuentes[sigla(f)]))

    // Assert
    expect(sinFuente.map(([id]) => id)).toEqual([])
    expect(Object.values(UCV.fuentes).filter((f) => !/^https:\/\//.test(f.url) || !f.documento)).toEqual([])
  })

  it('lo que ninguna fuente fecha queda como desconocido, con su nota', () => {
    const sinFechas = UCV.elementos.filter((e) => e.cronologia.fuentes.length === 0)

    expect(sinFechas.every((e) => e.cronologia.estado1946 === 'desconocido' && e.cronologia.nota)).toBe(true)
    expect(sinFechas.map((e) => e.id)).toContain('lavanderia')
  })

  it('ningún edificio figura como terminado en 1946', () => {
    const años = (texto) => (texto?.match(/\b(19\d{2})\b/g) ?? []).map(Number)
    const terminados = UCV.elementos.filter((e) => años(e.cronologia.terminacion).some((a) => a <= 1946))

    expect(terminados.map((e) => e.id)).toEqual([])
  })

  it('la Escuela Técnica Industrial está dibujada con relleno aunque su obra es posterior', () => {
    const eti = elemento('escuela-tecnica-industrial')

    expect(eti.trazo).toBe('lleno')
    expect(eti.cronologia.estado1946).toBe('no-construido')
  })
})

describe('el mapa de 1946 la muestra en construcción', () => {
  it('la marca nace en 1946 y se llama como el rótulo del plano', () => {
    const ucv = marca('ciudad-universitaria')

    expect(ucv).toBeDefined()
    for (let e = 0; e < EPOCA_1946; e++) expect(vivaEn(ucv, e), `época ${e}`).toBe(false)
    expect(vivaEn(ucv, EPOCA_1946)).toBe(true)
    expect(nombreEn(ucv, EPOCA_1946).nombre).toBe('Ciudad Universitaria (en construcción)')
  })

  it('la marca va sobre el rótulo del plano', () => {
    const ucv = MARCAS.find((m) => m.id === 'ciudad-universitaria')

    expect([ucv.x, ucv.y]).toEqual(UCV.rotulo.centro_mosaico)
  })

  it('en 1936 el lugar es la hacienda Ibarra, que deja de nombrarse en 1946', () => {
    const hacienda = marca('hacienda-ibarra')

    expect(hacienda).toBeDefined()
    expect(vivaEn(hacienda, EPOCA_1936 - 1)).toBe(false)
    expect(vivaEn(hacienda, EPOCA_1936)).toBe(true)
    expect(vivaEn(hacienda, EPOCA_1946)).toBe(false)
  })

  it('la ficha dice qué estaba en obra y que nada estaba terminado', () => {
    const texto = textoDe('ciudad-universitaria', EPOCA_1946)

    expect(texto).toContain('1943')
    expect(texto).toContain('Hospital Clínico')
    expect(texto).toMatch(/[Nn]ingún edificio estaba terminado/)
    expect(FICHAS['ciudad-universitaria'].dudas).toBeTruthy()
  })

  it('no hay hitos del campus: ni la zona médica ni los edificios posteriores', () => {
    const campus = /universitaria|ucv|aula-magna|clinico|anatomic|estadio-olimpico|biblioteca-central/

    expect(UCV.decision.volumenesEn1946).toBe(false)
    expect(HITOS.filter((h) => campus.test(h.id)).map((h) => h.id)).toEqual([])
  })

  it('ninguna marca nombra lo que se construyó después', () => {
    const posterior = /aula magna|plaza cubierta|biblioteca central|estadio ol[ií]mpico|jard[ií]n bot[aá]nico/i

    expect(MARCAS.filter((m) => posterior.test(JSON.stringify(m.nombres ?? m.nombre))).map((m) => m.id)).toEqual([])
  })
})
