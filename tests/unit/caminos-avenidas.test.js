import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { documentoDe, validarCatalogo } from '../../tools/catalogo-evidencias.mjs'

const texto = (ruta) => readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8')
const leer = (ruta) => JSON.parse(texto(ruta))
const catalogo = leer('docs/evidencias/caminos-avenidas.json')
const documento = texto('docs/caminos-avenidas-evidencia.md')
const calles1772 = leer('tools/geo/referencias/1772-calles-1936.json').tramos
const esquinas = leer('tools/geo/esquinas/1936-esquinas.json')
const posteriores = leer('tools/geo/referencias/vialidad-posterior-1946.json').tramos
const medicion = leer('docs/mediciones/vialidad/secciones-modernas.json')
const leyenda = texto('specs/auditoria-1843/leyenda.json')
const de = (id) => catalogo.tramos.find((t) => t.id === id)
const etapa = (id, anio) => de(id).etapas.find((e) => e.anio === anio)
const METRO = 0.5
const eje1772 = (linea) => calles1772.find((t) => t.tramo.startsWith(`${linea}:`)).puntos

/** Distancia en metros de un punto a una poligonal, las dos en píxeles del mosaico. */
function distanciaAlEje([x, y], puntos) {
  let menor = Infinity
  for (let i = 0; i + 1 < puntos.length; i++) {
    const [ax, ay] = puntos[i], [bx, by] = puntos[i + 1]
    const dx = bx - ax, dy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
    menor = Math.min(menor, Math.hypot(x - ax - t * dx, y - ay - t * dy))
  }
  return menor * METRO
}

describe('caminos de salida, alcabalas y avenidas del oeste (#270, #275)', () => {
  it('el catálogo cumple la ficha de evidencias y el documento se genera desde él', () => {
    expect(validarCatalogo(catalogo)).toBe(catalogo)
    expect(documentoDe(catalogo, documento)).toBe(documento)
  })

  it('camino colonial, carretera de 1845 y autopista de 1953 son tres vías distintas', () => {
    expect(de('camino:la-guaira-colonial').tipo).toBe('camino de recuas')
    expect(de('camino:carretera-la-guaira').tipo).toBe('carretera de carruajes')
    expect(posteriores.find((t) => t.id === 'moderno:autopista-la-guaira').desde).toBe(1953)
    expect(de('camino:carretera-la-guaira').cronologia.find((c) => c.tipo === 'apertura').fecha).toEqual({ desde: 1845, hasta: 1845 })
  })

  it('en 1843 la carretera de La Guaira está en obra, no inaugurada, y eso es una inferencia', () => {
    const e = etapa('camino:carretera-la-guaira', 1843)
    expect([e.estado, e.certeza, e.nombre]).toEqual(['obra', 'inferida', null])
    expect(de('camino:carretera-la-guaira').desconocido.join(' ')).toMatch(/Qué tramo estaba abierto en 1843/)
  })

  it('cada eje de 1772 que cita es el del registro: mismos extremos y misma banda de error', () => {
    for (const [id, linea] of [['camino:la-guaira-colonial', 'L1772-0077'], ['camino:catia', 'L1772-0076'], ['camino:la-vega', 'L1772-0083'], ['camino:el-valle', 'L1772-0084']]) {
      const e = etapa(id, 1772), puntos = eje1772(linea), tramo = calles1772.find((t) => t.tramo.startsWith(`${linea}:`))
      expect(e.lectura, id).toContain(linea)
      for (const [x, y] of [puntos[0], puntos.at(-1)]) expect(e.lectura, id).toContain(`(${Math.round(x)}, ${Math.round(y)})`)
      expect(e.error_m, id).toBe(tramo.banda_m)
      expect(e.ancho_m, id).toBeNull()
      const [x0, y0, x1, y1] = e.recorte.caja
      for (const [x, y] of puntos) expect(x >= x0 && x <= x1 && y >= y0 && y <= y1, `${id}: (${x}, ${y})`).toBe(true)
    }
  })

  it('el camino de La Vega de 1772 pasa a menos de 10 m de la esquina «Cruz de la Vega» leída en 1936', () => {
    // Arrange: la esquina, leída en un recorte del mosaico
    const cruzDeLaVega = [6230, 8700]

    // Act
    const metros = distanciaAlEje(cruzDeLaVega, eje1772('L1772-0083'))

    // Assert
    expect(metros).toBeLessThan(10)
    expect(etapa('camino:la-vega', 1936).nombre).toBe('Sur Ocho')
  })

  it('las esquinas de alcabala de 1936 son las del diccionario de esquinas y quedan como topónimos, no como alcabalas', () => {
    const esquina = (nombre) => esquinas.find((e) => e.nombre === nombre).px
    for (const [id, nombre] of [['alcabala:candelaria', 'Alcabala'], ['alcabala:el-valle', 'Alcabala Vieja']]) {
      const e = etapa(id, 1936), [x, y] = esquina(nombre)
      expect([e.estado, e.nombre], id).toEqual(['desconocido', nombre])
      expect(e.lectura, id).toContain(`(${Math.round(x)}, ${Math.round(y)})`)
    }
    // el extremo norte del camino del Valle de 1772 queda a unos 165 m de «Alcabala Vieja»
    const norte = eje1772('L1772-0084').at(-1), [x, y] = esquina('Alcabala Vieja')
    expect(Math.round(Math.hypot(norte[0] - x, norte[1] - y) * METRO / 5) * 5).toBe(165)
    const [ax] = esquina('Alcabala'), [px] = esquina('Puente Anauco')
    expect(Math.round((px - ax) * METRO / 10) * 10).toBe(140)
  })

  it('lo que cita de la leyenda de 1843 está en la transcripción', () => {
    for (const nombre of ['Puerta de La Guaira', 'Alcabala del Valle', 'Alcabala de Candelaria', 'Camino de Sabana Grande', 'Camino de La Guaira', 'Camino de Catia', 'Camino de la Vega']) {
      expect(leyenda, nombre).toContain(`"nombre": "${nombre}"`)
    }
    expect(etapa('camino:catia', 1843).certeza).toBe('dudosa')
  })

  it('las avenidas llevan su nombre desde 1922 y sus ensanches no entran en 1936 ni 1946', () => {
    for (const id of ['avenida:sucre', 'avenida:san-martin']) {
      const t = de(id)
      expect(t.nombres.find((n) => n.nombre.startsWith('Avenida')).desde, id).toBe(1922)
      for (const e of t.etapas) expect([e.estado, e.ancho_m], `${id} ${e.anio}`).toEqual(['existente', null])
      expect(t.desconocido.join(' '), id).toMatch(/ancho anterior a 195[24]/)
    }
    expect(posteriores.find((t) => t.id === 'moderno:sucre-tercer-tramo-1952').desde).toBe(1952)
    expect(posteriores.find((t) => t.id === 'moderno:san-martin-ampliacion-1954').desde).toBe(1954)
  })

  it('los anchos medianos que cita el documento son los de la medición de #303', () => {
    const via = (id) => medicion.vias.find((v) => v.id === id).epocas
    const sucre = via('moderno:sucre-tercer-tramo-1952'), sanMartin = via('moderno:san-martin-ampliacion-1954')
    expect([sucre[1936].ancho_mediana_m, sucre[1946].ancho_mediana_m, sucre[1936].dentro_pct]).toEqual([22, 22, 15])
    expect([sanMartin[1936].ancho_mediana_m, sanMartin[1946].ancho_mediana_m, sanMartin[1936].dentro_pct]).toEqual([21, 23, 19])
    expect(documento).toContain('de 22 m para la avenida\nSucre en 1936 y 1946, y de 21 y 23 m para la San Martín; el 15 % y el 19 %')
  })

  it('la plaza de Catia guarda la contradicción de su nombre en 1936 y no tiene estatua antes de 1951', () => {
    const plaza = de('avenida:plaza-catia')
    expect(etapa('avenida:plaza-catia', 1936).nombre).toBe('Plaza La Libertad')
    expect(plaza.contradicciones.map((c) => [c.asunto, c.estado])).toEqual([['Nombre de la plaza en 1936', 'pendiente']])
    expect(plaza.cronologia.find((c) => /estatua/.test(c.dice)).fecha.desde).toBe(1951)
  })

  it('una crónica sin referencias no acredita nada como documentado', () => {
    for (const t of catalogo.tramos) {
      for (const c of t.cronologia) {
        if (c.fuentes.every((id) => catalogo.fuentes[id].clase === 'crónica sin referencias')) expect(c.certeza, `${t.id}: ${c.dice}`).toBe('dudosa')
        for (const id of c.fuentes) expect(Object.keys(catalogo.clases_de_fuente), id).toContain(catalogo.fuentes[id].clase)
      }
    }
  })
})
