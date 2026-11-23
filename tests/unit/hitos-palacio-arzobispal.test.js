import { expect, test } from 'vitest'
import { Group, Matrix3, Vector3 } from 'three'
import { HITOS, construirHitos, validarHitos, zonasDeSupresion, suprimirTechos } from '../../src/hitos.js'
import { crearCoords } from '../../src/coords.js'
import { MAT } from '../../src/hitos/lienzo.js'
import { METRO } from '../../src/hitos/datos/marco.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { normalizarMarcas } from '../../src/marcas.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { contenidoDeFicha } from '../../src/fichas.js'
import { crearPalacioArzobispal } from '../../src/hitos/palacio-arzobispal-modelo.js'
import { etapaArzobispal, ANIOS_ARZOBISPAL } from '../../src/hitos/palacio-arzobispal-datos.js'
import { piezasDelArzobispal } from '../../src/hitos/palacio-arzobispal.js'
import esquinas from '../../tools/geo/esquinas/1936-esquinas.json'

const plano = { ancho: 18600, alto: 14800, metro: .5, plaza: [8968.2, 6839] }
const coords = crearCoords(plano)
const hito = HITOS.find(h => h.id === 'palacio-arzobispal')
const ANIO_DE_EPOCA = [0, 1772, 1843, 1889, 1911, 1936]
const visible = (p, epoca) => p.nace <= epoca && (!p.muere || epoca < p.muere)
const triangulos = (g) => (g.index?.count ?? g.attributes.position.count) / 3

const liberar = (edificio) => {
  const geos = new Set(), mats = new Set()
  edificio.traverse(o => { if (o.isMesh) { geos.add(o.geometry); mats.add(o.material) } })
  geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose())
}

/** Vértices del hito en su marco: a hacia el este (eje del damero), b hacia el sur, y arriba. */
function enMarco(d, h) {
  const origen = coords.aMundo(h.x, h.y), [ex, ez] = h.eje.map(v => v / Math.hypot(...h.eje))
  const puntos = []
  for (let i = 0; i < d.posiciones.length / 3; i++) {
    const x = d.posiciones[i * 3] - origen.x, z = d.posiciones[i * 3 + 2] - origen.z
    puntos.push({ a: x * ex + z * ez, b: -x * ez + z * ex, y: d.posiciones[i * 3 + 1], i })
  }
  return { puntos, origen }
}

test('el palacio desde 1772: la envolvente colonial hasta 1843 y la de 1876–1877 después, sin huecos', () => {
  expect(hito.nace).toBe(1)
  expect(hito.muere).toBe(0)
  expect(hito.partes.every(p => p.tipo === 'palacioArzobispal')).toBe(true)
  for (let epoca = 1; epoca <= 5; epoca++) {
    const partes = hito.partes.filter(p => visible(p, epoca))
    expect(partes.map(p => p.componente)).toEqual(['comun', 'epoca'])
    expect(etapaArzobispal(partes[1].anio).colonial, `envolvente de ${ANIO_DE_EPOCA[epoca]}`).toBe(epoca < 3)
  }
  expect(hito.partes.filter(p => visible(p, 0))).toEqual([])
  expect(validarHitos([hito], plano)).toEqual([])
})

test('la cronología: Palacio Episcopal antes de 1803, reforma guzmancista desde 1889 y nada moderno', () => {
  expect(etapaArzobispal(1772).nombre).toBe('Palacio Episcopal')
  expect(etapaArzobispal(1843).nombre).toBe('Palacio Arzobispal')
  expect([1772, 1843].map(a => etapaArzobispal(a).colonial)).toEqual([true, true])
  expect([1889, 1911, 1936].map(a => etapaArzobispal(a).id)).toEqual(['guzmancista', 'guzmancista', 'guzmancista'])
  expect(Math.max(...ANIOS_ARZOBISPAL)).toBeLessThanOrEqual(1936)
  expect(() => etapaArzobispal(1980)).toThrow(RangeError)
  expect(hito.partes.some(p => p.anio > 1936)).toBe(false)
})

test('al lado sur de la Catedral, frente a la plaza y en la esquina de Gradillas', () => {
  const [catedral, plaza] = ['catedral', 'plaza-bolivar'].map(id => HITOS.find(h => h.id === id))
  const [gx, gy] = esquinas.find(e => e.nombre === 'Las Gradillas').px
  expect(hito.x).toBeGreaterThan(plaza.x + 43 / METRO) // al este de la plaza
  expect(hito.y).toBeGreaterThan(catedral.y) // al sur de la Catedral
  expect(Math.hypot(hito.x - gx, hito.y - gy) * METRO).toBeLessThan(45)
  expect(hito.verificar.length).toBeGreaterThan(2)
})

test('la fachada de seis balcones mira al oeste, a la plaza, y la lateral da a la calle del sur', () => {
  const d = construirHitos([hito], coords)
  const { puntos } = enMarco(d, hito)
  const balcones = puntos.filter(p => p.y > 4.6 && p.y < 6)
  const min = k => Math.min(...puntos.map(p => p[k])), max = k => Math.max(...puntos.map(p => p[k]))
  // balcones volados sobre la calle de la plaza (−a) y sobre la del sur (+b); medianera ciega al norte
  expect(Math.min(...balcones.map(p => p.a))).toBeLessThan(-18.5)
  expect(Math.max(...balcones.map(p => p.b))).toBeGreaterThan(17.8)
  expect(min('a')).toBeGreaterThan(-19.3); expect(max('a')).toBeLessThan(18.7) // el alero colonial del fondo
  expect(min('b')).toBeGreaterThan(-17.6); expect(max('b')).toBeLessThan(18.3)
  expect(max('y')).toBeGreaterThan(10); expect(max('y')).toBeLessThan(12)
  const origen = coords.aMundo(hito.x, hito.y)
  let errorAncla = 0
  for (let i = 0; i < d.anclas.length / 4; i++) errorAncla = Math.max(errorAncla, Math.abs(d.anclas[i * 4] - origen.x), Math.abs(d.anclas[i * 4 + 1] - origen.z))
  expect(errorAncla).toBeLessThan(.001)
  expect(d.posiciones.every(Number.isFinite)).toBe(true)
  expect(d.normales.every(Number.isFinite)).toBe(true)
}, 20_000)

test('compartir lo común no omite ni duplica piezas respecto al modelo de cada año', () => {
  const d = construirHitos([hito], coords)
  for (let epoca = 1; epoca <= 5; epoca++) {
    let visibles = 0, esperados = 0
    for (let j = 0; j < d.indices.length; j += 3) {
      const v = d.indices[j]
      if (visible({ nace: d.vidas[v * 2], muere: d.vidas[v * 2 + 1] }, epoca)) visibles++
    }
    const { edificio } = crearPalacioArzobispal({ anio: ANIO_DE_EPOCA[epoca] })
    edificio.traverse(o => { if (o.isMesh) esperados += triangulos(o.geometry) })
    liberar(edificio)
    expect(visibles, `triángulos visibles en ${ANIO_DE_EPOCA[epoca]}`).toBe(esperados)
  }
  // a escala de ciudad: liviano, con las tejas del lienzo en vez de una barra por canal
  expect(d.indices.length / 3).toBeLessThan(30_000)
  expect([...d.hitos].filter((_, i) => i % 4 === 2).some(m => m === MAT.TEJA)).toBe(true)
}, 20_000)

test('lo que cambia de color o de forma con la época no queda en lo común', () => {
  for (const anio of [1772, 1889]) {
    const { edificio } = crearPalacioArzobispal({ anio })
    const comun = piezasDelArzobispal(edificio, 'comun'), epoca = piezasDelArzobispal(edificio, 'epoca')
    let total = 0
    edificio.traverse(o => { if (o.isMesh) total++ })
    expect(comun.length + epoca.length).toBe(total)
    expect(comun.some(m => m.material.name === 'muro' || m.material.name === 'teja')).toBe(false)
    liberar(edificio)
  }
  expect(() => piezasDelArzobispal(new Group(), 'comun')).toThrow(/Envolvente/)
  const { edificio } = crearPalacioArzobispal({ anio: 1889 })
  expect(() => piezasDelArzobispal(edificio, 'patios')).toThrow(RangeError)
  liberar(edificio)
})

test('los faldones de teja tienen la normal hacia arriba', () => {
  for (const anio of [1772, 1889]) {
    const { edificio, cubiertas } = crearPalacioArzobispal({ anio })
    edificio.updateMatrixWorld(true)
    let faldones = 0, invertidas = 0
    cubiertas.traverse(o => {
      if (!o.isMesh || o.geometry.type !== 'BufferGeometry') return
      const giro = new Matrix3().getNormalMatrix(o.matrixWorld), n = o.geometry.attributes.normal
      for (let i = 0; i < n.count; i++) {
        if (new Vector3().fromBufferAttribute(n, i).applyMatrix3(giro).y > .01) faldones++; else invertidas++
      }
    })
    expect(faldones).toBeGreaterThan(0); expect(invertidas).toBe(0)
    liberar(edificio)
  }
})

test('las casas genéricas del solar se apagan desde 1772 sin mutar sus datos', () => {
  const zonas = zonasDeSupresion([hito])
  expect(zonas[0]).toMatchObject({ desde: 1, hasta: 0 })
  const casa = { vertices: new Float32Array(hito.planta[0].flat()), techos: new Uint32Array([0, 4, 1, 0]), vida: new Uint32Array([0]) }
  expect([...suprimirTechos(casa, zonas)]).toEqual([8])
  expect([...casa.vida]).toEqual([0])
})

test('la ficha: Palacio Episcopal en 1772, Palacio Arzobispal después, con fuentes y dudas', () => {
  const marca = normalizarMarcas(MARCAS, { hitos: HITOS, coords }).find(m => m.id === hito.id)
  for (const [epoca, titulo] of [[1, 'Palacio Episcopal'], [2, 'Palacio Arzobispal'], [3, 'Palacio Arzobispal'], [5, 'Palacio Arzobispal']]) {
    const ficha = contenidoDeFicha({ marca, ficha: FICHAS[hito.id], epoca })
    expect(ficha.existe).toBe(true); expect(ficha.titulo).toBe(titulo)
    expect(ficha.dudas).toMatch(/hipótesis|interpreta/)
  }
  expect(contenidoDeFicha({ marca, ficha: FICHAS[hito.id], epoca: 0 }).existe).toBe(false)
  const textos = Object.fromEntries(FICHAS[hito.id].textos)
  expect(textos[2]).toContain('1803')
  expect(textos[3]).toContain('1876')
  expect(FICHAS[hito.id].hoy).toContain('1980')
  expect(MARCAS.find(m => m.id === hito.id).fuente).toContain('iamvenezuela.org')
})
