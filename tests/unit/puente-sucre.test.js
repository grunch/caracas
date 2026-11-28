import { describe, expect, test } from 'vitest'
import { crearCoords } from '../../src/coords.js'
import { HITOS, construirHitos, validarHitos, zonasDeSupresion } from '../../src/hitos.js'
import { HITOS_GEOMETRIA } from '../../src/hitos/datos/index.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { poligonosConVida } from '../../src/hitos/datos/fases-geometricas.js'
import { puenteHierro, puentesGuaire } from '../../src/hitos/datos/puentes-guaire.js'
import { CALCE_SUR7, puenteSucre } from '../../src/hitos/datos/puentes-sur7.js'
import { APOYO } from '../../src/hitos/lienzo.js'
import { apoyosDelPuente } from '../../src/hitos/puente.js'
import { lechoDe } from '../../src/hitos/rasante.js'
import { crearPuente, estadoPuente } from '../../src/hitos/puentes-guaire-modelo.js'
import { glslSuelosPropios } from '../../src/hitos/suelos-propios.js'
import { suprimirArbolesDeHitos } from '../../src/hitos/suprimir-arboles.js'
import { puntoEnPoligono } from '../../src/hitos/suprimir.js'
import { areaConSigno } from '../../src/poligono.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { nombreEn, normalizarMarcas, validarMarcas, vivaEn } from '../../src/marcas.js'
import { FICHAS } from '../../src/fichas-datos.js'

const plano = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(plano)
const EPOCAS = [[1, 1772], [2, 1843], [3, 1889], [4, 1911], [5, 1936], [6, 1946]]
const vivo = (nace, muere, e) => nace <= e && (muere === 0 || e < muere)
/** Del marco del puente (a lo largo, a lo ancho, en metros desde el centro) a píxeles del plano. */
const [ux, uy] = puenteSucre.eje
const px = (a, b) => [puenteSucre.x + (a * ux - b * uy) / plano.metro, puenteSucre.y + (a * uy + b * ux) / plano.metro]

/** Los vértices del puente con sus atributos: [{ x, y, z, modo, mat, ancla: [ax, az, bx, bz], nace, muere }]. */
function verticesDelPuente() {
  const d = construirHitos([puenteSucre], coords)
  return Array.from({ length: d.posiciones.length / 3 }, (_, i) => ({
    x: d.posiciones[i * 3], y: d.posiciones[i * 3 + 1], z: d.posiciones[i * 3 + 2],
    modo: d.hitos[i * 4 + 3], mat: d.hitos[i * 4 + 2], ancla: [...d.anclas.slice(i * 4, i * 4 + 4)],
    nace: d.vidas[i * 2], muere: d.vidas[i * 2 + 1],
  }))
}
const vertices = verticesDelPuente()
// La huella del lote al noreste del cruce (techo 4255 de ciudad.pak, release datos-2026-11-28-c5b8180; vive desde
// 1843), en píxeles del plano: su borde oeste queda a 1 m del eje de la calzada de 1936.
const MANZANA_VECINA_PX = [[9730, 9269], [9789, 9280], [9786, 9298], [9784, 9309], [9778, 9345], [9786, 9347], [9780, 9380], [9716, 9367]]

describe('Constitución y Sucre: dos estructuras en el mismo cruce', () => {
  test('el cruce de la calle Sur 7 es un solo hito, con vida de 1889 a 1911 y fuente', () => {
    expect(HITOS.filter(h => h.id === 'puente-sucre')).toHaveLength(1)
    expect(puentesGuaire.slice(0, 2)).toEqual([puenteHierro, puenteSucre])
    expect([puenteSucre.nace, puenteSucre.muere]).toEqual([3, 5])
    expect(validarHitos([puenteSucre], plano)).toEqual([])
    expect(HITOS_GEOMETRIA.find(h => h.id === 'puente-sucre').partes).toEqual(puenteSucre.partes)
    expect(puenteSucre.fuente).toMatch(/Silva Contreras/)
    expect(puenteSucre.verificar.length).toBeGreaterThan(3)
  })

  test.each(EPOCAS)('en la época %i (%i) se dibuja solo la estructura que estaba en pie', (epoca, anio) => {
    // Act
    const dibujados = vertices.filter(v => vivo(v.nace, v.muere, epoca))
    // Assert: Constitución en 1889, Sucre metálico en 1911; antes no hay puente y después falta el alzado
    const modelo = { 1889: 'constitucion', 1911: 'bowstring' }[anio] ?? null
    expect(dibujados.length > 0).toBe(modelo !== null)
    expect(anio >= 1889 ? estadoPuente('sucre', anio).modelo : null).toBe(modelo)
    if (modelo) expect(new Set(dibujados.map(v => `${v.nace}/${v.muere}`))).toEqual(new Set([`${epoca}/${epoca + 1}`]))
  })

  test('cada parte lleva la estructura que el estudio da para su época, y ninguna vive sin alzado', () => {
    expect(puenteSucre.partes.map(p => [p.tipo, p.id, p.anio, p.nace, p.muere])).toEqual([
      ['puente', 'sucre', 1889, 3, 4],
      ['puente', 'sucre', 1911, 4, 5],
    ])
    for (const parte of puenteSucre.partes) {
      for (const [e, anio] of EPOCAS) if (vivo(parte.nace, parte.muere, e)) expect(anio).toBe(parte.anio)
    }
  })

  test('las dos estructuras se distinguen: tablero bajo con dos apoyos, y armadura superior sin apoyos', () => {
    // Arrange
    const [constitucion, sucre] = puenteSucre.partes
    const alto = e => Math.max(...vertices.filter(v => v.nace === e && v.modo === APOYO.RASANTE).map(v => v.y))
    // Act
    const pilas = parte => apoyosDelPuente(parte).filter(a => !a.estribo)
    // Assert: del Constitución, vigas rectas en tramos cortos; del Sucre, «60 metros de luz sin apoyos intermedios»
    expect(pilas(constitucion)).toHaveLength(4) // dos apoyos, dos columnas cada uno
    expect(pilas(constitucion).every(p => p.dibujada)).toBe(true)
    expect(pilas(sucre)).toHaveLength(0)
    for (const parte of puenteSucre.partes) expect(apoyosDelPuente(parte).filter(a => a.estribo && a.dibujada)).toHaveLength(2)
    expect(alto(3)).toBeLessThan(4) // lo más alto son los faroles
    expect(alto(4)).toBeCloseTo(8, 0) // la armadura sube 8 m sobre el tablero (interpretativo)
  })

  test('en 1936 y 1946 el cruce existe, pero el puente de concreto no tiene alzado: ni estructura ni reserva', () => {
    for (const anio of [1936, 1946]) expect(estadoPuente('sucre', anio)).toMatchObject({ presente: true, modelo: null })
    for (const campo of ['suprime', 'sinArboles', 'sueloPropio']) {
      const zonas = poligonosConVida(puenteSucre, campo)
      expect(zonas.length).toBeGreaterThan(0)
      for (const { desde, hasta } of zonas) expect([5, 6].some(e => vivo(desde, hasta, e))).toBe(false)
    }
  })
})

describe('Constitución y Sucre: calce', () => {
  const [[nx, ny], [sx, sy]] = CALCE_SUR7.cabezas

  test('el marco sale de las dos cabezas, sobre el eje de la calzada de 1936', () => {
    expect(puenteSucre.cabezas).toEqual(CALCE_SUR7.cabezas)
    expect(puenteSucre.x).toBeCloseTo((nx + sx) / 2, 6)
    expect(puenteSucre.y).toBeCloseTo((ny + sy) / 2, 6)
    // las dos cabezas están sobre la calzada que dibuja el plano base: a menos de 1 m de su eje
    const [[ex, ey], [dx, dy]] = [CALCE_SUR7.eje1936.punto, CALCE_SUR7.eje1936.direccion]
    for (const [x, y] of CALCE_SUR7.cabezas) expect(Math.abs((x - ex) * dy - (y - ey) * dx) * plano.metro).toBeLessThan(1)
    // la marca vieja quedaba a pocos metros: sirve de control grueso
    expect(Math.hypot(puenteSucre.x - 9710, puenteSucre.y - 9430) * plano.metro).toBeLessThan(6)
    expect(CALCE_SUR7.errorM).toBeGreaterThanOrEqual(7)
  })

  test('el largo es el documentado: 60 m de luz; las dos estructuras van de cabeza a cabeza', () => {
    expect(puenteSucre.largo).toBeCloseTo(60, 6)
    const [constitucion, sucre] = puenteSucre.partes.map(({ id, anio, largo }) => crearPuente({ id, anio, nivelDetalle: 'ciudad', largo }).metadatos)
    expect(sucre.largo).toBeCloseTo(60, 6)
    expect(constitucion.largo).toBeCloseTo(60, 6)
    // el estudio le da 59,56 m al Constitución (sin fuente localizada) y el símbolo de Mestre, 60,7 m: el mismo paso
    expect(Math.abs(crearPuente({ id: 'sucre', anio: 1889 }).metadatos.largo - puenteSucre.largo)).toBeLessThan(0.5)
    const [[mx, my], [px2, py2]] = CALCE_SUR7.cabezasMestre1889
    expect(Math.abs(Math.hypot(px2 - mx, py2 - my) * plano.metro - puenteSucre.largo)).toBeLessThan(1)
    // el ancho no se escala con el largo
    expect([constitucion.ancho, sucre.ancho]).toEqual([6.76, 8])
  })

  test('la cabeza norte es la de los pedestales de Razetti (1911), y no la del símbolo de Mestre', () => {
    const { pedestalesNorte1911, cabezasMestre1889 } = CALCE_SUR7
    expect(Math.hypot(nx - pedestalesNorte1911[0], ny - pedestalesNorte1911[1]) * plano.metro).toBeLessThan(6)
    expect(Math.abs(ny - pedestalesNorte1911[1]) * plano.metro).toBeLessThan(1.5)
    // el símbolo de Mestre queda unos 19 m al norte: más que el error de su calce; queda dicho en `verificar`
    const centroMestre = [0, 1].map(k => (cabezasMestre1889[0][k] + cabezasMestre1889[1][k]) / 2)
    const corrido = Math.hypot(puenteSucre.x - centroMestre[0], puenteSucre.y - centroMestre[1]) * plano.metro
    expect(corrido).toBeGreaterThan(15)
    expect(corrido).toBeLessThan(22)
    expect(puenteSucre.verificar.join(' ')).toMatch(/Mestre/)
  })

  test('la marca del cruce queda en el centro medido, con sus tres nombres, y sigue cuando ya no hay estructura', () => {
    // Arrange
    const fila = MARCAS.find(m => m.id === 'puente-sucre')
    // Act
    const [marca] = normalizarMarcas([fila], { hitos: HITOS, coords })
    // Assert
    expect(fila.hito).toBe('puente-sucre')
    expect(validarMarcas(MARCAS, { hitos: HITOS, plano })).toEqual([])
    expect([marca.px, marca.py]).toEqual([puenteSucre.x, puenteSucre.y])
    expect([1, 2, 3, 4, 5, 6].map(e => vivaEn(marca, e))).toEqual([false, false, true, true, true, true])
    expect([3, 4, 5, 6].map(e => nombreEn(marca, e).nombre)).toEqual(['Puente Constitución', 'Puente Sucre', 'Puente Sucre', 'Puente Sucre'])
    expect(FICHAS['puente-sucre'].textos.map(([e]) => e)).toEqual([3, 4, 5])
  })

  test('toda la estructura comparte una rasante entre las dos cabezas', () => {
    const [n, s] = CALCE_SUR7.cabezas.map(([x, y]) => coords.aMundo(x, y))
    const enRasante = vertices.filter(v => v.modo === APOYO.RASANTE)
    expect(enRasante.length).toBeGreaterThan(5000)
    for (const v of enRasante) {
      expect(v.ancla[0]).toBeCloseTo(n.x, 3)
      expect(v.ancla[1]).toBeCloseTo(n.z, 3)
      expect(v.ancla[2]).toBeCloseTo(s.x, 3)
      expect(v.ancla[3]).toBeCloseTo(s.z, 3)
    }
    expect(vertices.some(v => v.modo === APOYO.PIE)).toBe(false) // ni un vértice anclado como una casa
  })
})

describe('Constitución y Sucre: reserva limitada', () => {
  const area = poligono => Math.abs(areaConSigno(poligono)) * plano.metro ** 2

  test('reserva solo el cauce bajo el tablero, mientras hay puente dibujado', () => {
    const zonas = zonasDeSupresion([puenteSucre])
    expect(zonas.map(z => [z.desde, z.hasta])).toEqual([[3, 5]])
    expect(area(zonas[0].poligono)).toBeLessThan(62 * 33)
    expect(zonas[0].solarCompleto).toBeUndefined()
    expect(poligonosConVida(puenteSucre, 'sueloPropio').map(z => [z.desde, z.hasta])).toEqual([[3, 5]])
  })

  test('ningún hito va encima de una manzana: tablero, cabezas y cauce quedan fuera de la vecina', () => {
    // Arrange: una grilla de medio metro sobre el cruce, en el marco del puente
    const muestras = []
    for (let a = -32; a <= 32; a += 0.5) for (let b = -16; b <= 16; b += 0.5) muestras.push([a, b])
    const enElCauce = ([a, b]) => puntoEnPoligono(px(a, b), zonasDeSupresion([puenteSucre])[0].poligono)
    const enLaEstructura = ([a, b]) => Math.abs(a) <= 31 && Math.abs(b) <= 4.5 // tablero de 8 m y estribos de 9 m
    // Act
    const pisan = muestras.filter(m => (enElCauce(m) || enLaEstructura(m)) && puntoEnPoligono(px(...m), MANZANA_VECINA_PX))
    // Assert
    expect(muestras.filter(enElCauce).length).toBeGreaterThan(5000)
    expect(pisan).toEqual([])
    // y con margen: la esquina del lote queda a más de 3 m de la cabeza norte
    const esquina = MANZANA_VECINA_PX.reduce((s, p) => (Math.hypot(p[0] - CALCE_SUR7.cabezas[0][0], p[1] - CALCE_SUR7.cabezas[0][1]) < Math.hypot(s[0] - CALCE_SUR7.cabezas[0][0], s[1] - CALCE_SUR7.cabezas[0][1]) ? p : s))
    expect(Math.hypot(esquina[0] - CALCE_SUR7.cabezas[0][0], esquina[1] - CALCE_SUR7.cabezas[0][1]) * plano.metro).toBeGreaterThan(3)
  })

  test('no es un obstáculo para caminar: sin planta de colisión', () => {
    expect(hitosConPlanta().some(h => h.id === 'puente-sucre')).toBe(false)
    expect(puenteSucre.planta).toEqual([])
  })

  test('quita los árboles de la huella y de los accesos, y conserva los ajenos', () => {
    // Arrange: [a lo largo, a lo ancho] en metros → vida esperada de un árbol que vivía siempre
    const L = puenteSucre.largo
    const casos = [
      [[5, 0], [1, 3]], // bajo el tablero
      [[5, 22], [1, 3]], // al borde del cauce: su copa taparía el tablero
      [[-L / 2 - 8, 2], [1, 3]], // en el acceso norte, sobre la calzada
      [[L / 2 + 8, -2], [1, 3]], // en el acceso sur
      [[5, 40], [1, 0]], // a 40 m del eje: ajeno
      [[-L / 2 - 8, 12], [1, 0]], // al lado del acceso, fuera de la calzada: ajeno
      [[L / 2 + 30, 0], [1, 0]], // sobre el camino, más allá del acceso: ajeno
    ]
    const puntos = casos.map(([[a, b]]) => px(a, b))
    const datos = { n: casos.length, x: Float32Array.from(puntos, p => p[0]), y: Float32Array.from(puntos, p => p[1]), nace: new Uint16Array(casos.length).fill(1), muere: new Uint16Array(casos.length) }
    // Act
    const salida = suprimirArbolesDeHitos(datos, [puenteSucre])
    // Assert
    casos.forEach(([, vida], i) => expect([salida.nace[i], salida.muere[i]], `árbol ${i}`).toEqual(vida))
  })

  test('un árbol que nace en 1936 no se toca: en esa época no hay puente dibujado', () => {
    const [x, y] = px(5, 0)
    const datos = { n: 1, x: Float32Array.of(x), y: Float32Array.of(y), nace: Uint16Array.of(5), muere: Uint16Array.of(0) }
    const salida = suprimirArbolesDeHitos(datos, [puenteSucre])
    expect([salida.nace[0], salida.muere[0]]).toEqual([5, 0])
  })

  test('el lecho es el mismo para las dos estructuras y lleva la franja del río que pinta el suelo', () => {
    const [constitucion, sucre] = puenteSucre.partes
    for (const campo of ['vano', 'anchoCauce', 'agua']) expect(constitucion[campo]).toEqual(sucre[campo])
    expect(sucre.vano[0]).toBeLessThan(-puenteSucre.largo / 2)
    expect(sucre.vano[1]).toBeGreaterThan(puenteSucre.largo / 2)
    // el río del plano de 1936 sobre el eje (y = 9422–9445 px), dentro del vano y lejos de las dos cabezas
    const [desde, hasta] = sucre.agua
    expect(px(desde, 0)[1]).toBeCloseTo(9422, 0)
    expect(px(hasta, 0)[1]).toBeCloseTo(9445, 0)
    const lecho = lechoDe({ vano: sucre.vano, ancho: sucre.anchoCauce, fondo: 5 })
    expect(lecho(desde, 0)).toBeCloseTo(5, 6)
    expect(lecho(hasta, 0)).toBeCloseTo(5, 6)
    // las columnas del Constitución caen en las orillas, no en el agua
    for (const pila of apoyosDelPuente(constitucion).filter(a => !a.estribo)) expect(pila.x < desde || pila.x > hasta).toBe(true)
  })

  test('el suelo se abre solo en el cauce y solo de 1889 a 1911', () => {
    const glsl = glslSuelosPropios(plano, plano.metro)
    const [x, z] = [(puenteSucre.x - plano.plaza[0]) * plano.metro, (puenteSucre.y - plano.plaza[1]) * plano.metro]
    expect(glsl).toContain((Math.hypot(x, z)).toFixed(5))
    expect(glsl.split((Math.hypot(x, z)).toFixed(5))).toHaveLength(2) // un solo polígono
  })
})
