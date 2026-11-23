import { expect, test } from 'vitest'
import { Box3, Matrix3, Vector3 } from 'three'
import { HITOS, construirHitos, validarHitos, zonasDeSupresion, suprimirTechos } from '../../src/hitos.js'
import { crearCoords } from '../../src/coords.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { normalizarMarcas } from '../../src/marcas.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { contenidoDeFicha } from '../../src/fichas.js'
import { crearCapitolio } from '../../src/hitos/capitolio-modelo.js'
import { etapaCapitolio } from '../../src/hitos/capitolio-datos.js'

const plano = { ancho: 18600, alto: 14800, metro: .5, plaza: [8968.2, 6839] }
const coords = crearCoords(plano)
const hito = HITOS.find(h => h.id === 'capitolio')
const ANIO_DE_EPOCA = [0, 1772, 1843, 1889, 1911, 1936]
const visible = (p, epoca) => p.nace <= epoca && (!p.muere || epoca < p.muere)

const liberar = (edificio) => {
  const geos = new Set(), mats = new Set()
  edificio.traverse(o => { if (o.isMesh) { geos.add(o.geometry); mats.add(o.material) } })
  geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose())
}

test('el convento desde 1772 y las cinco fechas sin huecos ni solapamientos', () => {
  expect(hito.nace).toBe(1)
  expect(hito.muere).toBe(0)
  expect(hito.partes.every(p => p.tipo === 'capitolio')).toBe(true)
  for (let epoca = 1; epoca <= 5; epoca++) {
    const partes = hito.partes.filter(p => visible(p, epoca))
    const componentes = partes.map(p => p.componente ?? 'todo')
    expect(componentes).toEqual(epoca < 3 ? ['todo'] : ['cuerpo', 'cupula', 'palmas'])
    expect(partes.at(-1).anio, `palmas o convento de la época ${epoca}`).toBe(ANIO_DE_EPOCA[epoca])
  }
  expect(hito.partes.filter(p => visible(p, 0))).toEqual([])
  expect(validarHitos([hito], plano)).toEqual([])
})

test('la cronología no adelanta la cúpula de Malaussena ni la dorada de 1958', () => {
  expect([1772, 1843].map(a => etapaCapitolio(a).convento)).toEqual([true, true])
  expect(etapaCapitolio(1889).cupula).toBe('original-1877')
  expect([1911, 1936].map(a => etapaCapitolio(a).cupula)).toEqual(['belga-1890', 'belga-1890'])
  const cupula = p => p.componente === 'cupula'
  expect(hito.partes.filter(cupula).map(p => p.anio)).toEqual([1889, 1911])
  expect(hito.partes.some(p => p.anio >= 1958)).toBe(false)
})

test('la silueta crece donde la historia lo dice: campanario > espadaña y sobrecúpula > bóveda', () => {
  const alto = {}
  for (const anio of [1772, 1843, 1889, 1911]) {
    const { edificio } = crearCapitolio({ anio })
    alto[anio] = new Box3().setFromObject(edificio).max.y
    liberar(edificio)
  }
  expect(alto[1772]).toBeGreaterThan(alto[1843])
  expect(alto[1911]).toBeGreaterThan(alto[1889])
})

test('la cúpula queda en el ala norte, la manzana cabe en su planta y el ancla es la del hito', () => {
  const d = construirHitos([hito], coords), origen = coords.aMundo(hito.x, hito.y)
  const [ex, ez] = hito.eje.map(v => v / Math.hypot(...hito.eje))
  const vidas = new Set()
  let maxA = 0, maxB = 0, alto = 0, cupula = 0, errorAncla = 0
  for (let i = 0; i < d.vidas.length / 2; i++) {
    vidas.add(`${d.vidas[i * 2]}:${d.vidas[i * 2 + 1]}`)
    const x = d.posiciones[i * 3] - origen.x, z = d.posiciones[i * 3 + 2] - origen.z, y = d.posiciones[i * 3 + 1]
    const a = x * ex + z * ez, b = -x * ez + z * ex
    maxA = Math.max(maxA, Math.abs(a)); maxB = Math.max(maxB, Math.abs(b)); alto = Math.max(alto, y)
    if (y > 24) { expect(b, 'lo más alto es la cúpula del Salón Elíptico, al norte').toBeLessThan(-20); cupula++ }
    errorAncla = Math.max(errorAncla, Math.abs(d.anclas[i * 4] - origen.x), Math.abs(d.anclas[i * 4 + 1] - origen.z))
  }
  expect(cupula).toBeGreaterThan(0)
  expect([...vidas].sort()).toEqual(['1:2', '2:3', '3:0', '3:4', '4:0', '4:5', '5:0'])
  // El modelo llena la manzana del original (131,4 × 123,4 m): llega a sus bordes este y oeste, y la escalinata del
  // Palacio Legislativo baja ~4,3 m a la acera sur (b ≈ 66), lejos de la Universidad.
  expect(maxA).toBeGreaterThan(64); expect(maxA).toBeLessThan(67.5)
  expect(maxB).toBeGreaterThan(60); expect(maxB).toBeLessThan(66.5); expect(alto).toBeLessThan(36)
  expect(errorAncla).toBeLessThan(.001)
  expect(d.posiciones.every(Number.isFinite)).toBe(true)
  expect(d.normales.every(Number.isFinite)).toBe(true)
}, 20_000)

test('compartir el cuerpo neoclásico no omite ni duplica piezas respecto al modelo de cada año', () => {
  const d = construirHitos([hito], coords)
  for (let epoca = 1; epoca <= 5; epoca++) {
    let visibles = 0, esperados = 0
    for (let j = 0; j < d.indices.length; j += 3) {
      const v = d.indices[j]
      if (visible({ nace: d.vidas[v * 2], muere: d.vidas[v * 2 + 1] }, epoca)) visibles++
    }
    const { edificio } = crearCapitolio({ anio: ANIO_DE_EPOCA[epoca] })
    edificio.traverse(o => { if (o.isMesh) esperados += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 })
    liberar(edificio)
    expect(visibles, `triángulos visibles en ${ANIO_DE_EPOCA[epoca]}`).toBe(esperados)
  }
}, 20_000)

test('las casas genéricas de la manzana se apagan desde 1772 sin mutar sus datos', () => {
  const zonas = zonasDeSupresion([hito])
  expect(zonas[0]).toMatchObject({ desde: 1, hasta: 0 })
  const casa = { vertices: new Float32Array(hito.planta[0].flat()), techos: new Uint32Array([0, 4, 1, 0]), vida: new Uint32Array([0]) }
  expect([...suprimirTechos(casa, zonas)]).toEqual([8])
  expect([...casa.vida]).toEqual([0])
})

test('el convento ocupa la manzana entera del original: las casas de sus costados se apagan desde 1772', () => {
  // la manzana medida sobre el 1772 calzado (los ejes de la referencia, hasta el borde de la manzana roja): 131,4 × 123,4 m
  const [p] = hito.planta
  const lado = (i) => Math.hypot(p[(i + 1) % 4][0] - p[i][0], p[(i + 1) % 4][1] - p[i][1]) * plano.metro
  expect(lado(0)).toBeCloseTo(131.4, 0); expect(lado(1)).toBeCloseTo(123.4, 0)
  // una casa de la franja oeste (entre la planta vieja de 92 m y la calle), que antes quedaba en pie
  const casaOeste = [[8552, 7060], [8572, 7064], [8576, 7044], [8556, 7040]]
  const casa = { vertices: new Float32Array(casaOeste.flat()), techos: new Uint32Array([0, 4, 1, 0]), vida: new Uint32Array([0]) }
  expect([...suprimirTechos(casa, zonasDeSupresion([hito]))]).toEqual([8])
})

test('la ficha nombra el convento hasta 1843 y el Capitolio después, con sus fuentes y dudas', () => {
  const marca = normalizarMarcas(MARCAS, { hitos: HITOS, coords }).find(m => m.id === hito.id)
  for (const [epoca, titulo] of [[1, 'Convento de las Concepciones'], [2, 'Convento de las Concepciones'], [3, 'Capitolio'], [4, 'Capitolio'], [5, 'Capitolio']]) {
    const ficha = contenidoDeFicha({ marca, ficha: FICHAS[hito.id], epoca })
    expect(ficha.existe).toBe(true); expect(ficha.titulo).toBe(titulo)
    expect(ficha.dudas).toMatch(/interpreta/)
  }
  const textos = Object.fromEntries(FICHAS[hito.id].textos)
  expect(textos[2]).toContain('1812')
  expect(textos[3]).toContain('Urdaneta')
  expect(textos[4]).toContain('Malaussena')
  expect(FICHAS[hito.id].hoy).toContain('1958')
})

test('las vertientes de teja del convento tienen la normal hacia arriba', () => {
  for (const anio of [1772, 1843]) {
    const edificio = crearCapitolio({ anio }).edificio
    edificio.updateMatrixWorld(true)
    let vertientes = 0, invertidas = 0
    edificio.traverse(o => {
      if (!o.isMesh || !/^Techo a (dos|media) agua/.test(o.parent?.name) || o.geometry.type !== 'BufferGeometry') return
      const giro = new Matrix3().getNormalMatrix(o.matrixWorld), n = o.geometry.attributes.normal
      for (let i = 0; i < n.count; i += 3) {
        const y = new Vector3().fromBufferAttribute(n, i).applyMatrix3(giro).y
        if (y > .01) vertientes++; else if (y < -.01) invertidas++
      }
    })
    expect(vertientes).toBeGreaterThan(0); expect(invertidas).toBe(0)
    liberar(edificio)
  }
})
