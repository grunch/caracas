import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { crearCoords } from '../../src/coords.js'
import { HITOS, construirHitos, validarHitos, zonasDeSupresion } from '../../src/hitos.js'
import { HITOS_GEOMETRIA } from '../../src/hitos/datos/index.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { poligonosConVida } from '../../src/hitos/datos/fases-geometricas.js'
import { puentesGuaire } from '../../src/hitos/datos/puentes-guaire.js'
import { CALCE_DOLORES, CALCE_RESTAURADOR, puenteDolores, puenteRestaurador } from '../../src/hitos/datos/puentes-dolores-restaurador.js'
import { APOYO } from '../../src/hitos/lienzo.js'
import { apoyosDelPuente, sueloDelPuente } from '../../src/hitos/puente.js'
import { lechoDe } from '../../src/hitos/rasante.js'
import { crearPuente, estadoPuente } from '../../src/hitos/puentes-guaire-modelo.js'
import { suprimirArbolesDeHitos } from '../../src/hitos/suprimir-arboles.js'
import { puntoEnPoligono } from '../../src/hitos/suprimir.js'
import { areaConSigno } from '../../src/poligono.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { normalizarMarcas, validarMarcas, vivaEn } from '../../src/marcas.js'

const plano = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(plano)
const CALCE = JSON.parse(readFileSync(new URL('../../docs/puentes-guaire-calce.json', import.meta.url), 'utf8'))
const EPOCAS = [[1, 1772], [2, 1843], [3, 1889], [4, 1911], [5, 1936], [6, 1946]]
const vivo = (nace, muere, e) => nace <= e && (muere === 0 || e < muere)
const PUENTES = [
  ['puente-dolores', puenteDolores, CALCE_DOLORES, 'dolores', 60],
  ['puente-restaurador', puenteRestaurador, CALCE_RESTAURADOR, 'restaurador', 100.5],
]
/** Del marco de un puente (a lo largo, a lo ancho, en metros desde el centro) a píxeles del plano. */
const px = (h, a, b) => [h.x + (a * h.eje[0] - b * h.eje[1]) / plano.metro, h.y + (a * h.eje[1] + b * h.eje[0]) / plano.metro]

function verticesDe(hito) {
  const d = construirHitos([hito], coords)
  return Array.from({ length: d.posiciones.length / 3 }, (_, i) => ({
    y: d.posiciones[i * 3 + 1], modo: d.hitos[i * 4 + 3], ancla: [...d.anclas.slice(i * 4, i * 4 + 4)], nace: d.vidas[i * 2], muere: d.vidas[i * 2 + 1],
  }))
}

describe.each(PUENTES)('%s: la estructura de 1911, y solo en 1911', (id, hito, calce, modelo, largo) => {
  const vertices = verticesDe(hito)

  test('es un hito de los puentes del Guaire, con vida de 1911 a 1936 y fuente', () => {
    expect(HITOS.filter(h => h.id === id)).toHaveLength(1)
    expect(puentesGuaire).toContain(hito)
    expect([hito.nace, hito.muere]).toEqual([4, 5])
    expect(validarHitos([hito], plano)).toEqual([])
    expect(HITOS_GEOMETRIA.find(h => h.id === id).partes).toEqual(hito.partes)
    expect(hito.fuente).toMatch(/Silva Contreras/)
    expect(hito.verificar.length).toBeGreaterThan(3)
  })

  test.each(EPOCAS)('en la época %i (%i) se dibuja solo si el estudio tiene alzado de ese año', (epoca, anio) => {
    const dibujados = vertices.filter(v => vivo(v.nace, v.muere, epoca))
    expect(dibujados.length > 0).toBe(anio === 1911)
    // el estudio de Miraflores solo restituye la estructura de 1911: después hay reformas sin alzado
    expect(estadoPuente(modelo, anio).modelo).toBe(anio === 1911 ? modelo : null)
  })

  test('la parte lleva el año de su estructura y no vive en una época sin alzado', () => {
    expect(hito.partes.map(p => [p.tipo, p.id, p.anio, p.nace, p.muere])).toEqual([['puente', modelo, 1911, 4, 5]])
  })

  test('el largo es el documentado y el centro, el del calce', () => {
    expect(hito.largo).toBeCloseTo(largo, 6)
    expect(crearPuente({ id: modelo, anio: 1911, nivelDetalle: 'ciudad', largo: hito.partes[0].largo }).metadatos.largo).toBeCloseTo(largo, 6)
    expect(crearPuente({ id: modelo, anio: 1911 }).metadatos.largo).toBeCloseTo(largo, 6) // el del estudio: no se escala
    const adoptado = CALCE[id].adoptado
    expect([hito.x, hito.y]).toEqual(adoptado.centro.mosaico)
    expect(adoptado.largo_m).toBe(largo)
    hito.cabezas.forEach((cabeza, k) => {
      const escrita = adoptado[k === 0 ? 'cabeza_norte' : 'cabeza_sur'].mosaico
      expect(Math.hypot(cabeza[0] - escrita[0], cabeza[1] - escrita[1]) * plano.metro).toBeLessThan(0.1)
    })
    expect(calce.errorM).toBe(adoptado.error_m)
    // las dos cabezas, sobre la calzada del plano base: a menos de 1 m del medio de sus dos bordes
    for (const [x, y] of hito.cabezas) {
      const [[ax, ay], [bx, by]] = calce.medioCalzada1936
      const medio = ax + ((bx - ax) * (y - ay)) / (by - ay)
      expect(Math.abs(x - medio) * plano.metro).toBeLessThan(1)
    }
  })

  test('toda la estructura comparte una rasante entre las dos cabezas; nada se ancla como una casa', () => {
    const [n, s] = hito.cabezas.map(([x, y]) => coords.aMundo(x, y))
    const enRasante = vertices.filter(v => v.modo === APOYO.RASANTE)
    expect(enRasante.length).toBeGreaterThan(5000)
    for (const v of enRasante) [n.x, n.z, s.x, s.z].forEach((c, k) => expect(v.ancla[k]).toBeCloseTo(c, 3))
    expect(vertices.some(v => v.modo === APOYO.PIE)).toBe(false)
  })

  test('reserva solo el cauce bajo el tablero y solo en 1911; en 1936 y 1946, ni estructura ni reserva', () => {
    const zonas = zonasDeSupresion([hito])
    expect(zonas.map(z => [z.desde, z.hasta])).toEqual([[4, 5]])
    expect(Math.abs(areaConSigno(zonas[0].poligono)) * plano.metro ** 2).toBeLessThan((largo + 2) * 33)
    for (const campo of ['suprime', 'sinArboles', 'sueloPropio']) {
      const reservas = poligonosConVida(hito, campo)
      expect(reservas.length).toBeGreaterThan(0)
      for (const { desde, hasta } of reservas) expect([5, 6].some(e => vivo(desde, hasta, e))).toBe(false)
    }
    expect(hitosConPlanta().some(h => h.id === id)).toBe(false)
    expect(hito.planta).toEqual([])
  })

  test('quita los árboles de la huella y de los accesos, conserva los ajenos y no toca los que nacen en 1936', () => {
    const L = hito.largo
    const casos = [
      [[5, 0], 1, [1, 4]], // bajo el tablero: vuelve cuando ya no hay puente dibujado
      [[5, 12], 1, [1, 4]], // a 8 m del tablero: su copa lo taparía
      [[-L / 2 - 8, 2], 1, [1, 4]], // en el acceso norte
      [[L / 2 + 8, -2], 1, [1, 4]], // en el acceso sur
      [[5, 15], 1, [1, 0]], // en la orilla del cauce, a 11 m del tablero: ajeno
      [[-L / 2 - 8, 15], 1, [1, 0]], // al lado del acceso: ajeno
      [[L / 2 + 20, 0], 1, [1, 0]], // sobre el camino, más allá del acceso: ajeno
      [[5, 0], 5, [5, 0]], // nace en 1936
    ]
    const puntos = casos.map(([[a, b]]) => px(hito, a, b))
    const datos = { n: casos.length, x: Float32Array.from(puntos, p => p[0]), y: Float32Array.from(puntos, p => p[1]), nace: Uint16Array.from(casos, c => c[1]), muere: new Uint16Array(casos.length) }
    const salida = suprimirArbolesDeHitos(datos, [hito])
    casos.forEach(([, , vida], i) => expect([salida.nace[i], salida.muere[i]], `árbol ${i}`).toEqual(vida))
  })

  test('la marca del cruce apunta al hito y sigue cuando ya no hay estructura dibujada', () => {
    const fila = MARCAS.find(m => m.id === id)
    const [marca] = normalizarMarcas([fila], { hitos: HITOS, coords })
    expect(fila.hito).toBe(id)
    expect(validarMarcas(MARCAS, { hitos: HITOS, plano })).toEqual([])
    expect([marca.px, marca.py]).toEqual([hito.x, hito.y])
    expect([1, 2, 3, 4, 5, 6].map(e => vivaEn(marca, e))).toEqual([false, false, false, true, true, true])
  })
})

describe('Dolores: 60 m centrados en el símbolo del plano de 1936', () => {
  test('el símbolo (43,6 m) queda dentro del tablero, con lo mismo de cada lado', () => {
    const [norte, sur] = CALCE_DOLORES.simbolo1936
    const a = ([x, y]) => ((x - puenteDolores.x) * puenteDolores.eje[0] + (y - puenteDolores.y) * puenteDolores.eje[1]) * plano.metro
    expect(a(norte)).toBeGreaterThan(-30)
    expect(a(sur)).toBeLessThan(30)
    expect(Math.abs(a(norte) + a(sur))).toBeLessThan(1.5) // centrado
    expect(puenteDolores.verificar.join(' ')).toMatch(/43,6 m/)
  })

  test('armadura superior sin apoyos intermedios: 60 m de luz', () => {
    const apoyos = apoyosDelPuente(puenteDolores.partes[0])
    expect(apoyos.filter(a => !a.estribo)).toHaveLength(0)
    expect(apoyos.filter(a => a.estribo && a.dibujada)).toHaveLength(2)
    expect(Math.max(...verticesDe(puenteDolores).filter(v => v.modo === APOYO.RASANTE).map(v => v.y))).toBeGreaterThan(6.5)
  })
})

describe('Restaurador: 100,50 m con la plazoleta de 1936 en el medio', () => {
  test('el cauce es más angosto que en Dolores: no llega al árbol del plano de 1936 que queda a 14,6 m del eje', () => {
    const arbol = [8543, 9818] // arboles.bin, release datos-2026-11-28-c5b8180: vive en todas las épocas, no es del monte
    const datos = { n: 1, x: Float32Array.of(arbol[0]), y: Float32Array.of(arbol[1]), nace: Uint16Array.of(0), muere: Uint16Array.of(0) }
    expect(puenteRestaurador.partes[0].anchoCauce).toBe(28)
    expect(puenteDolores.partes[0].anchoCauce).toBe(32)
    for (const { poligono } of zonasDeSupresion([puenteRestaurador])) expect(puntoEnPoligono(arbol, poligono)).toBe(false)
    const salida = suprimirArbolesDeHitos(datos, [puenteRestaurador])
    expect([salida.nace[0], salida.muere[0]]).toEqual([0, 0])
  })

  test('el centro es el de la plazoleta que dibuja el plano de 1936', () => {
    expect([puenteRestaurador.x, puenteRestaurador.y]).toEqual(CALCE['puente-restaurador']['1936'].plazoleta.centro)
  })

  test('ocho apoyos intermedios, todos con lecho para estar de pie', () => {
    const pilas = apoyosDelPuente(puenteRestaurador.partes[0]).filter(a => !a.estribo)
    expect(pilas).toHaveLength(16) // dos columnas por apoyo
    expect(pilas.every(p => p.dibujada)).toBe(true)
  })
})

describe('el río cruza estos puentes al sesgo', () => {
  test.each(PUENTES)('%s: la franja de agua queda dentro del vano en todo el ancho del cauce', (id, hito) => {
    const { vano, anchoCauce, agua, sesgoAgua } = hito.partes[0]
    expect(sesgoAgua).not.toBe(0)
    for (const z of [-anchoCauce / 2, anchoCauce / 2]) {
      expect(agua[0] + sesgoAgua * z).toBeGreaterThan(vano[0] + 7)
      expect(agua[1] + sesgoAgua * z).toBeLessThan(vano[1] - 7)
    }
  })

  test('sueloDelPuente corre la franja a lo largo según el lado: sesgo en metros por metro de ancho', () => {
    // Arrange
    const [vano, ancho, agua, sesgo] = [[-30, 30], 32, [-5, 5], 0.5]
    const lecho = lechoDe({ vano, ancho, fondo: 5 })
    const puntos = g => Array.from({ length: g.attributes.position.count }, (_, i) => [g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i)])
    // Act
    const recto = sueloDelPuente(lecho, vano, ancho, agua)
    const sesgado = sueloDelPuente(lecho, vano, ancho, agua, sesgo)
    // Assert: en cada borde del cauce la franja está corrida ±8 m; hacia el eje, cada vez menos
    const mojados = puntos(sesgado.agua)
    const anchos = [...new Set(mojados.map(p => p[2]))]
    expect(anchos.length).toBeGreaterThan(10)
    expect([Math.min(...anchos), Math.max(...anchos)]).toEqual([-16, 16])
    for (const z of anchos) {
      const xs = mojados.filter(p => Math.abs(p[2] - z) < 1e-6).map(p => p[0])
      expect(Math.min(...xs)).toBeCloseTo(agua[0] + sesgo * z, 6)
      expect(Math.max(...xs)).toBeCloseTo(agua[1] + sesgo * z, 6)
    }
    // el borde del cauce no se mueve y la malla cubre lo mismo: ni huecos ni triángulos de más
    const todos = [...puntos(sesgado.orilla), ...mojados]
    expect(Math.min(...todos.map(p => p[0]))).toBeCloseTo(vano[0], 6)
    expect(Math.max(...todos.map(p => p[0]))).toBeCloseTo(vano[1], 6)
    expect(todos.length).toBe(puntos(recto.orilla).length + puntos(recto.agua).length)
    // cada vértice baja lo que dice el lecho en su lugar ya corrido
    for (const [x, y, z] of todos) expect(y).toBeCloseTo(-lecho(x, z) - 0.2, 5)
    // una franja que al correrse se saldría del vano no se puede dibujar
    expect(() => sueloDelPuente(lecho, vano, ancho, [-28, 5], 0.5)).toThrow(/sesgo/)
  })
})
