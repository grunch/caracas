import { describe, expect, test } from 'vitest'
import { crearCoords } from '../../src/coords.js'
import { HITOS, construirHitos, validarHitos, zonasDeSupresion } from '../../src/hitos.js'
import { HITOS_GEOMETRIA } from '../../src/hitos/datos/index.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { poligonosConVida } from '../../src/hitos/datos/fases-geometricas.js'
import { CALCE_HIERRO, puenteHierro, puentesGuaire } from '../../src/hitos/datos/puentes-guaire.js'
import { APOYO, MAT } from '../../src/hitos/lienzo.js'
import { parteDe } from '../../src/hitos/partes.js'
import { CAPA, FONDO_MINIMO_M, apoyosDelPuente, sueloDelPuente } from '../../src/hitos/puente.js'
import { lechoDe } from '../../src/hitos/rasante.js'
import { crearPuente, estadoPuente, CATALOGO_PUENTES } from '../../src/hitos/puentes-guaire-modelo.js'
import { glslSuelosPropios } from '../../src/hitos/suelos-propios.js'
import { suprimirArbolesDeHitos } from '../../src/hitos/suprimir-arboles.js'
import { areaConSigno } from '../../src/poligono.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { validarMarcas } from '../../src/marcas.js'
import { FICHAS } from '../../src/fichas-datos.js'

const plano = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(plano)
const EPOCAS = [[1, 1772], [2, 1843], [3, 1889], [4, 1911], [5, 1936], [6, 1946]]
const vivo = (nace, muere, e) => nace <= e && (muere === 0 || e < muere)

/** Los vértices del puente con sus atributos: [{ x, y, z, modo, ancla: [ax, az, bx, bz], nace, muere }]. */
function verticesDelPuente() {
  const d = construirHitos([puenteHierro], coords)
  return Array.from({ length: d.posiciones.length / 3 }, (_, i) => ({
    x: d.posiciones[i * 3], y: d.posiciones[i * 3 + 1], z: d.posiciones[i * 3 + 2],
    modo: d.hitos[i * 4 + 3], mat: d.hitos[i * 4 + 2], ancla: [...d.anclas.slice(i * 4, i * 4 + 4)],
    nace: d.vidas[i * 2], muere: d.vidas[i * 2 + 1],
  }))
}

describe('Puente de Hierro: presencia por época', () => {
  test('está entre los hitos una sola vez, con vida de 1889 a 1936 y fuente', () => {
    expect(HITOS.filter(h => h.id === 'puente-hierro')).toHaveLength(1)
    expect(puentesGuaire).toContain(puenteHierro)
    expect([puenteHierro.nace, puenteHierro.muere]).toEqual([3, 6])
    expect(validarHitos([puenteHierro], plano)).toEqual([])
    expect(HITOS_GEOMETRIA.find(h => h.id === 'puente-hierro').partes).toEqual(puenteHierro.partes)
    expect(parteDe('puente')).toBeTypeOf('function')
  })

  test.each(EPOCAS)('en la época %i (%i) se dibuja solo si la estructura de 1875 está en pie', (epoca, anio) => {
    // Arrange
    const vertices = verticesDelPuente()
    // Act
    const dibujados = vertices.filter(v => vivo(v.nace, v.muere, epoca)).length
    // Assert
    const esperado = anio >= 1889 && anio <= 1936
    expect(dibujados > 0).toBe(esperado)
    expect(estadoPuente('hierro', anio).modelo === 'hierro').toBe(esperado)
  })

  test('cada parte dibuja la estructura que el estudio da para todas sus épocas', () => {
    for (const parte of puenteHierro.partes) {
      const años = EPOCAS.filter(([e]) => vivo(parte.nace, parte.muere, e)).map(([, a]) => a)
      expect(años.length).toBeGreaterThan(0)
      for (const anio of años) expect(estadoPuente('hierro', anio).modelo).toBe(estadoPuente('hierro', parte.anio).modelo)
    }
  })

  test('en 1946 el cruce existe pero no hay alzado: ni estructura de 1875 ni reserva', () => {
    expect(estadoPuente('hierro', 1946)).toMatchObject({ presente: true, modelo: null })
    for (const campo of ['suprime', 'sinArboles', 'sueloPropio']) {
      for (const { desde, hasta } of poligonosConVida(puenteHierro, campo)) expect(vivo(desde, hasta, 6)).toBe(false)
    }
    expect(poligonosConVida(puenteHierro, 'sueloPropio').map(z => [z.desde, z.hasta])).toEqual([[3, 5], [5, 6], [5, 6]])
    // un año sin modelo no dibuja nada, aunque alguien lo pida
    const lienzo = { geo: () => { throw new Error('no debe dibujar') }, rasante: () => lienzo, en: () => lienzo }
    expect(() => parteDe('puente')(lienzo, { ...puenteHierro.partes[0], anio: 1946 })).not.toThrow()
  })
})

describe('Puente de Hierro: calce', () => {
  test('el marco sale de las dos cabezas medidas, no del ancla aproximada de la marca', () => {
    const [[nx, ny], [sx, sy]] = CALCE_HIERRO.cabezas
    expect(puenteHierro.x).toBeCloseTo((nx + sx) / 2, 6)
    expect(puenteHierro.y).toBeCloseTo((ny + sy) / 2, 6)
    expect(Math.hypot(sx - nx, sy - ny) * plano.metro).toBeCloseTo(puenteHierro.largo, 6)
    // el símbolo a escala de Mestre: entre 75 y 78 m según se mida en el original o sobre el calce
    expect(puenteHierro.largo).toBeGreaterThan(74)
    expect(puenteHierro.largo).toBeLessThan(79)
    // la marca vieja quedaba a pocos metros: sirve de control grueso
    expect(Math.hypot(puenteHierro.x - 9430, puenteHierro.y - 9440) * plano.metro).toBeLessThan(10)
    expect(CALCE_HIERRO.errorM).toBeGreaterThan(7)
  })

  test('la marca y la ficha existentes quedan enlazadas al hito y siguen en 1946', () => {
    const marca = MARCAS.find(m => m.id === 'puente-hierro')
    expect(marca.hito).toBe('puente-hierro')
    expect(marca.nace).toBe(3)
    expect(marca.muere ?? 0).toBe(0)
    expect(validarMarcas(MARCAS, { hitos: HITOS, plano })).toEqual([])
    expect(FICHAS['puente-hierro'].textos.map(([e]) => e)).toEqual([3, 6])
  })
})

describe('Puente de Hierro: rasante y apoyos', () => {
  test('toda la estructura comparte una rasante: las dos cabezas medidas', () => {
    // Arrange
    const [n, s] = CALCE_HIERRO.cabezas.map(([x, y]) => coords.aMundo(x, y))
    // Act
    const enRasante = verticesDelPuente().filter(v => v.modo === APOYO.RASANTE)
    // Assert
    expect(enRasante.length).toBeGreaterThan(10000)
    for (const v of enRasante) {
      expect(v.ancla[0]).toBeCloseTo(n.x, 3)
      expect(v.ancla[1]).toBeCloseTo(n.z, 3)
      expect(v.ancla[2]).toBeCloseTo(s.x, 3)
      expect(v.ancla[3]).toBeCloseTo(s.z, 3)
    }
  })

  test('el tablero y las barandas no se deforman: quedan a la altura del estudio sobre la rasante', () => {
    const { metadatos } = crearPuente({ id: 'hierro', anio: 1889, nivelDetalle: 'ciudad', largo: puenteHierro.largo })
    const enRasante = verticesDelPuente().filter(v => v.modo === APOYO.RASANTE)
    const alturas = enRasante.map(v => v.y)
    // del pie de las columnas bajo el tablero al remate de los faroles: nada sigue el relieve vértice a vértice
    expect(Math.max(...alturas)).toBeCloseTo(3.775, 2)
    expect(Math.min(...alturas)).toBeGreaterThan(-metadatos.cotaTablero)
    expect(verticesDelPuente().some(v => v.modo === APOYO.PIE)).toBe(false)
  })

  test('las pilas llegan al lecho por separado y las que quedarían enterradas no se dibujan', () => {
    const [estructura, ...cauces] = puenteHierro.partes
    expect(cauces.map(c => [c.capa, c.nace, c.muere])).toEqual([[CAPA.CAUCE, 3, 5], [CAPA.CAUCE, 5, 6]])
    for (const cauce of cauces) {
      const apoyos = apoyosDelPuente(cauce)
      const pilas = apoyos.filter(a => !a.estribo)
      expect(pilas.length).toBe(18) // nueve apoyos intermedios, dos columnas cada uno
      for (const pila of pilas) expect(pila.dibujada).toBe(pila.fondo >= FONDO_MINIMO_M)
      expect(pilas.filter(p => p.dibujada).length).toBeGreaterThanOrEqual(6)
      expect(apoyos.some(a => a.estribo && a.dibujada)).toBe(false)
    }
    // con el cauce abierto de cabeza a cabeza (1889 y 1911), los nueve apoyos se ven
    expect(apoyosDelPuente(cauces[0]).filter(a => !a.estribo && a.dibujada)).toHaveLength(18)
    // los dos estribos van con la estructura, que es una sola de 1889 a 1936
    expect([estructura.capa, estructura.nace, estructura.muere]).toEqual([CAPA.ESTRUCTURA, 3, 6])
    expect(apoyosDelPuente(estructura).filter(a => a.dibujada).map(a => a.estribo)).toEqual([true, true])
    expect(() => parteDe('puente')({}, { ...estructura, capa: 'techo' })).toThrow(/capa/)
  })

  test('el pie de cada apoyo sigue el suelo dibujado bajo sí mismo, hundido lo que mide el lecho', () => {
    // el agua del lecho también es lisa (mat 0), pero su color la distingue; acá, solo piedra y hierro
    const alSuelo = verticesDelPuente().filter(v => v.modo === APOYO.SUELO && v.mat === 0)
    expect(alSuelo.length).toBeGreaterThan(100)
    for (const v of alSuelo) {
      expect(v.ancla).toEqual([v.x, v.z, v.x, v.z])
      expect(v.y).toBeLessThanOrEqual(0)
    }
  })
})

describe('Puente de Hierro: reserva limitada', () => {
  const area = poligono => Math.abs(areaConSigno(poligono)) * plano.metro ** 2

  test('reserva solo el cauce bajo el tablero, con sus fechas, no la manzana', () => {
    const zonas = zonasDeSupresion([puenteHierro])
    expect(zonas.map(z => [z.desde, z.hasta])).toEqual([[3, 5], [5, 6]])
    for (const z of zonas) {
      expect(area(z.poligono)).toBeLessThan(puenteHierro.largo * 34)
      expect(z.solarCompleto).toBeUndefined()
    }
    // en 1936 el plano dibuja dos edificaciones pegadas a la calzada en el tramo norte: ahí no hay reserva
    expect(area(zonas[1].poligono)).toBeLessThan(area(zonas[0].poligono) * 0.7)
  })

  test('no es un obstáculo para caminar: sin planta de colisión', () => {
    expect(hitosConPlanta().some(h => h.id === 'puente-hierro')).toBe(false)
    expect(puenteHierro.planta).toEqual([])
  })

  test('quita los árboles del cauce y conserva los ajenos, antes y después de la estructura', () => {
    // Arrange: en el marco del puente (a lo largo, a lo ancho, en metros) → píxeles
    const [ux, uy] = puenteHierro.eje
    const px = (a, b) => [puenteHierro.x + (a * ux - b * uy) / plano.metro, puenteHierro.y + (a * uy + b * ux) / plano.metro]
    const casos = [
      [[10, 0], [1, 3]], // bajo el tablero
      [[10, 22], [1, 3]], // al borde del cauce: su copa taparía el tablero
      [[-puenteHierro.largo / 2 - 8, 2], [1, 3]], // en el acceso norte, sobre la calzada
      [[puenteHierro.largo / 2 + 8, -2], [1, 3]], // en el acceso sur
      [[10, 40], [1, 0]], // a 40 m del eje: ajeno
      [[-puenteHierro.largo / 2 - 8, 12], [1, 0]], // al lado del acceso, fuera de la calzada: ajeno
      [[puenteHierro.largo / 2 + 30, 0], [1, 0]], // sobre la calle, más allá del acceso: ajeno
    ]
    const puntos = casos.map(([[a, b]]) => px(a, b))
    const datos = { n: casos.length, x: Float32Array.from(puntos, p => p[0]), y: Float32Array.from(puntos, p => p[1]), nace: new Uint16Array(casos.length).fill(1), muere: new Uint16Array(casos.length) }
    // Act
    const salida = suprimirArbolesDeHitos(datos, [puenteHierro])
    // Assert
    casos.forEach(([, vida], i) => expect([salida.nace[i], salida.muere[i]], `árbol ${i}`).toEqual(vida))
  })

  test('en 1936, junto al tramo a ras, solo se despeja la calzada: los árboles de los patios vecinos siguen', () => {
    const [ux, uy] = puenteHierro.eje
    const px = (a, b) => [puenteHierro.x + (a * ux - b * uy) / plano.metro, puenteHierro.y + (a * uy + b * ux) / plano.metro]
    // nacidos en 1936: uno en un patio a 12 m del eje, frente al tramo a ras; otro sobre la calzada de ese tramo
    const puntos = [px(-23, -12), px(-23, 0)]
    const datos = { n: 2, x: Float32Array.from(puntos, p => p[0]), y: Float32Array.from(puntos, p => p[1]), nace: Uint16Array.of(5, 5), muere: Uint16Array.of(6, 6) }
    const salida = suprimirArbolesDeHitos(datos, [puenteHierro])
    expect([salida.nace[0], salida.muere[0]]).toEqual([5, 6])
    expect(salida.nace[1]).toBeGreaterThanOrEqual(6) // no llega a nacer mientras el puente está en pie
    for (const { desde, hasta } of poligonosConVida(puenteHierro, 'sinArboles')) expect(vivo(desde, hasta, 6)).toBe(false)
  })

  test('el lecho empalma con el terreno en el borde y lleva la franja del río de lado a lado', () => {
    // Arrange
    const [, cauce] = puenteHierro.partes
    const lecho = lechoDe({ vano: cauce.vano, ancho: cauce.anchoCauce, fondo: 5 })
    // Act
    const { orilla, agua } = sueloDelPuente(lecho, cauce.vano, cauce.anchoCauce, cauce.agua)
    const puntos = g => Array.from({ length: g.attributes.position.count }, (_, i) => [g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i)])
    // Assert
    const borde = puntos(orilla).filter(([x, , z]) => x === cauce.vano[0] || x === cauce.vano[1] || Math.abs(z) === cauce.anchoCauce / 2)
    expect(borde.length).toBeGreaterThan(50)
    // el borde queda 0,2 m bajo el suelo dibujado: el material levanta los hitos 0,12 m y así no asoma un labio
    expect(borde.every(([, y]) => Math.abs(y + 0.2) < 1e-6)).toBe(true)
    expect(Math.min(...puntos(orilla).map(([, y]) => y))).toBeCloseTo(-5.2, 3)
    const mojados = puntos(agua)
    expect(Math.min(...mojados.map(p => p[0]))).toBeCloseTo(cauce.agua[0], 6)
    expect(Math.max(...mojados.map(p => p[0]))).toBeCloseTo(cauce.agua[1], 6)
    expect(Math.max(...mojados.map(p => Math.abs(p[2])))).toBeCloseTo(cauce.anchoCauce / 2, 6)
    for (const g of [orilla, agua]) {
      expect([...g.attributes.suelo.array].every(s => s === 1)).toBe(true)
      for (let i = 0; i < g.attributes.normal.count; i++) expect(g.attributes.normal.getY(i)).toBeGreaterThan(0.5)
    }
    // sin franja de río no hay agua; y un lecho que es todo agua no tiene orilla ni rompe el dibujo
    expect(sueloDelPuente(lecho, cauce.vano, cauce.anchoCauce).agua).toBeNull()
    expect(sueloDelPuente(lecho, cauce.vano, cauce.anchoCauce, [cauce.vano[0] - 1, cauce.vano[1] + 1]).orilla).toBeNull()
    expect(() => construirHitos([{ ...puenteHierro, partes: [{ ...cauce, agua: [cauce.vano[0] - 1, cauce.vano[1] + 1] }] }], coords)).not.toThrow()
  })

  test('en 1936 el tramo norte va a ras, con suelo propio bajo el tablero, y conserva lo edificado al lado', () => {
    const [, , cauce1936] = puenteHierro.partes
    expect(cauce1936.aRas[0]).toBeCloseTo(-puenteHierro.largo / 2 - 1, 6)
    expect(cauce1936.aRas[1]).toBe(cauce1936.vano[0])
    expect(cauce1936.anchoRas).toBeLessThan(10) // apenas más que el tablero de 7 m
    expect(zonasDeSupresion([puenteHierro])).toHaveLength(2) // el tramo a ras no suprime casas
    // el cauce de 1936 es más angosto (hay una manzana al oeste) y bajo las pilas sigue llegando al fondo
    expect(cauce1936.anchoCauce).toBeLessThan(puenteHierro.partes[1].anchoCauce)
    const lecho1936 = lechoDe({ vano: cauce1936.vano, ancho: cauce1936.anchoCauce, fondo: 5, taludAncho: cauce1936.taludAncho })
    expect(lecho1936(10, 2.4)).toBeCloseTo(5, 6)
    expect(lecho1936(10, cauce1936.anchoCauce / 2)).toBe(0)
    // el terraplén va bajo el tablero, sobre la rasante: ni un vértice suyo sigue el suelo ni pasa de la losa
    const terraplen = verticesDelPuente().filter(v => v.nace === 5 && v.mat === MAT.JARDIN && v.modo === APOYO.RASANTE)
    expect(terraplen).toHaveLength(24)
    expect(Math.max(...terraplen.map(v => v.y))).toBeCloseTo(-0.3, 6)
  })

  test('el suelo se abre solo en el cauce y solo mientras el puente está en pie', () => {
    const glsl = glslSuelosPropios(plano, plano.metro)
    const [x, z] = [(puenteHierro.x - plano.plaza[0]) * plano.metro, (puenteHierro.y - plano.plaza[1]) * plano.metro]
    expect(glsl).toContain(`vec2(3.00000,5.00000)`)
    expect(glsl).toContain(`vec2(5.00000,6.00000)`)
    expect(glsl).toContain((Math.hypot(x, z)).toFixed(5))
  })
})

describe('modelos del estudio de Miraflores', () => {
  test.each(Object.entries(CATALOGO_PUENTES))('%s: geometría finita, con tablero y apoyos por separado', (id, ficha) => {
    const { edificio, tablero, apoyos, etapa, metadatos } = crearPuente({ id, anio: ficha.anioVista, nivelDetalle: 'ciudad' })
    expect(etapa.modelo).toBeTruthy()
    let vertices = 0
    edificio.traverse(o => { if (o.isMesh) { vertices += o.geometry.attributes.position.count; expect([...o.geometry.attributes.position.array].every(Number.isFinite)).toBe(true) } })
    expect(vertices).toBeGreaterThan(100)
    expect(tablero.children.length).toBeGreaterThan(0)
    expect(apoyos.children.filter(g => g.userData.estribo)).toHaveLength(2)
    expect(apoyos.parent).toBe(edificio)
    expect(metadatos.largoMedido).toBe(false)
  })

  test('el largo medido reemplaza al nominal sin escalar el ancho ni la altura', () => {
    const nominal = crearPuente({ id: 'hierro', anio: 1889 }).metadatos
    const medido = crearPuente({ id: 'hierro', anio: 1889, largo: 95.5 }).metadatos
    expect([nominal.largo, medido.largo]).toEqual([90, 95.5])
    expect([medido.ancho, medido.cotaTablero, medido.apoyosIntermedios]).toEqual([nominal.ancho, nominal.cotaTablero, 9])
    expect(() => crearPuente({ id: 'hierro', anio: 1889, largo: -1 })).toThrow(RangeError)
  })

  test('rechaza año, id y detalle inválidos; sin modelo devuelve el cruce vacío', () => {
    for (const opts of [{ anio: 1925 }, { id: 'inexistente' }, { nivelDetalle: 'bajo' }]) expect(() => crearPuente(opts)).toThrow(RangeError)
    expect(crearPuente({ id: 'sucre', anio: 1936 }).edificio.children).toHaveLength(1)
    expect(estadoPuente('sucre', 1889).modelo).toBe('constitucion')
    expect(estadoPuente('dolores', 1936).presente).toBeNull()
  })
})
