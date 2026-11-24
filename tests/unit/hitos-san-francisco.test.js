import { expect, test } from 'vitest'
import { Matrix3, Vector3 } from 'three'
import { HITOS, construirHitos, validarHitos, zonasDeSupresion, suprimirTechos } from '../../src/hitos.js'
import { crearCoords } from '../../src/coords.js'
import { MAT } from '../../src/hitos/lienzo.js'
import { METRO } from '../../src/hitos/datos/marco.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { normalizarMarcas } from '../../src/marcas.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { contenidoDeFicha } from '../../src/fichas.js'
import { crearSanFrancisco } from '../../src/hitos/san-francisco-modelo.js'
import { etapaSanFrancisco, ANIOS_SAN_FRANCISCO } from '../../src/hitos/san-francisco-datos.js'
import esquinas from '../../tools/geo/esquinas/1936-esquinas.json'

const plano = { ancho: 18600, alto: 14800, metro: .5, plaza: [8968.2, 6839] }
const coords = crearCoords(plano)
const hito = HITOS.find(h => h.id === 'san-francisco')
const ANIO_DE_EPOCA = [0, 1772, 1843, 1889, 1911, 1936]
const visible = (p, epoca) => p.nace <= epoca && (!p.muere || epoca < p.muere)
const triangulos = (g) => (g.index?.count ?? g.attributes.position.count) / 3
const esquina = (nombre) => esquinas.find(e => e.nombre === nombre).px

const liberar = (edificio) => {
  const geos = new Set(), mats = new Set()
  edificio.traverse(o => { if (o.isMesh) { geos.add(o.geometry); mats.add(o.material) } })
  geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose())
}

/** Vértices visibles en una época, en el marco del hito: a hacia el sur (entra en la nave), b hacia el oeste, y arriba. */
function enMarco(d, h, epoca) {
  const origen = coords.aMundo(h.x, h.y), [ex, ez] = h.eje.map(v => v / Math.hypot(...h.eje))
  const puntos = []
  for (let i = 0; i < d.posiciones.length / 3; i++) {
    if (!visible({ nace: d.vidas[i * 2], muere: d.vidas[i * 2 + 1] }, epoca)) continue
    const x = d.posiciones[i * 3] - origen.x, z = d.posiciones[i * 3 + 2] - origen.z
    puntos.push({ a: x * ex + z * ez, b: -x * ez + z * ex, y: d.posiciones[i * 3 + 1] })
  }
  const min = k => Math.min(...puntos.map(p => p[k])), max = k => Math.max(...puntos.map(p => p[k]))
  return { puntos, min, max }
}

test('la iglesia desde 1772: portada de 1745 en 1772 y 1843, fachada de Hurtado Manrique desde 1889, sin huecos', () => {
  expect(hito.nace).toBe(1)
  expect(hito.muere).toBe(0)
  expect(hito.partes.every(p => p.tipo === 'sanFrancisco')).toBe(true)
  for (let epoca = 1; epoca <= 5; epoca++) {
    const partes = hito.partes.filter(p => visible(p, epoca))
    expect(partes, `época ${epoca}`).toHaveLength(1)
    expect(etapaSanFrancisco(partes[0].anio).colonial, `fachada de ${ANIO_DE_EPOCA[epoca]}`).toBe(epoca < 3)
  }
  expect(hito.partes.find(p => visible(p, 2)).anio).toBe(1843) // los contrafuertes después del terremoto de 1812
  expect(hito.partes.filter(p => visible(p, 0))).toEqual([])
  expect(validarHitos([hito], plano)).toEqual([])
})

test('la cronología: cinco años del mapa, nada después de 1936', () => {
  expect(ANIOS_SAN_FRANCISCO).toEqual([1772, 1843, 1889, 1911, 1936])
  expect([1772, 1843].map(a => etapaSanFrancisco(a).colonial)).toEqual([true, true])
  expect([1889, 1911, 1936].map(a => etapaSanFrancisco(a).colonial)).toEqual([false, false, false])
  expect(etapaSanFrancisco(1843).postTerremoto).toBe(true)
  expect(() => etapaSanFrancisco(1953)).toThrow(RangeError)
  expect(hito.partes.some(p => p.anio > 1936)).toBe(false)
})

test('entre las esquinas de San Francisco y La Bolsa, al sur del Capitolio y al este de la Universidad', () => {
  const [capitolio, universidad] = ['capitolio', 'universidad'].map(id => HITOS.find(h => h.id === id))
  expect(Math.hypot(hito.x - esquina('San Francisco')[0], hito.y - esquina('San Francisco')[1]) * METRO).toBeLessThan(80)
  expect(Math.hypot(hito.x - esquina('La Bolsa')[0], hito.y - esquina('La Bolsa')[1]) * METRO).toBeLessThan(140)
  expect(hito.y).toBeGreaterThan(capitolio.y)
  expect(hito.x).toBeGreaterThan(universidad.x)
  expect(hito.verificar.length).toBeGreaterThan(2)
})

test('la fachada mira al norte; el campanario de tres arcos al oeste solo en 1772 y 1843; el frontón partido desde 1889', () => {
  const d = construirHitos([hito], coords)
  for (const epoca of [1, 2]) {
    const m = enMarco(d, hito, epoca)
    expect(m.min('a'), `${ANIO_DE_EPOCA[epoca]}`).toBeGreaterThan(-1.5) // la portada sobre la calle
    expect(m.max('a')).toBeLessThan(63) // el testero plano, al sur
    expect(m.max('b')).toBeGreaterThan(13.5) // el campanario, hacia el convento
    expect(m.min('b')).toBeGreaterThan(-11.5) // los contrafuertes del costado este
    expect(m.max('y')).toBeGreaterThan(15); expect(m.max('y')).toBeLessThan(16.5) // la cruz del frontón
  }
  for (const epoca of [3, 4, 5]) {
    const m = enMarco(d, hito, epoca)
    expect(m.min('a'), `${ANIO_DE_EPOCA[epoca]}`).toBeGreaterThan(-1.5)
    expect(m.max('b')).toBeLessThan(11) // sin torre campanario
    expect(m.max('y')).toBeGreaterThan(17.5); expect(m.max('y')).toBeLessThan(19) // la peineta y su jarrón
  }
  const origen = coords.aMundo(hito.x, hito.y)
  let errorAncla = 0
  for (let i = 0; i < d.anclas.length / 4; i++) errorAncla = Math.max(errorAncla, Math.abs(d.anclas[i * 4] - origen.x), Math.abs(d.anclas[i * 4 + 1] - origen.z))
  expect(errorAncla).toBeLessThan(.001)
  expect(d.posiciones.every(Number.isFinite)).toBe(true)
  expect(d.normales.every(Number.isFinite)).toBe(true)
}, 20_000)

test('en cada época se ve el modelo de su año, entero y una sola vez, liviano y con las tejas del lienzo', () => {
  const d = construirHitos([hito], coords)
  for (let epoca = 1; epoca <= 5; epoca++) {
    let visibles = 0, esperados = 0
    for (let j = 0; j < d.indices.length; j += 3) {
      const v = d.indices[j]
      if (visible({ nace: d.vidas[v * 2], muere: d.vidas[v * 2 + 1] }, epoca)) visibles++
    }
    const { edificio } = crearSanFrancisco({ anio: hito.partes.find(p => visible(p, epoca)).anio })
    edificio.traverse(o => { if (o.isMesh) esperados += triangulos(o.geometry) })
    liberar(edificio)
    expect(visibles, `triángulos visibles en ${ANIO_DE_EPOCA[epoca]}`).toBe(esperados)
  }
  expect(d.indices.length / 3).toBeLessThan(15_000)
  expect([...d.hitos].filter((_, i) => i % 4 === 2).some(m => m === MAT.TEJA)).toBe(true)
}, 20_000)

test('a escala de ciudad no van el interior, la plataforma ni la Ceiba (es de la capa de árboles)', () => {
  for (const anio of [1772, 1936]) {
    const { edificio, ceiba } = crearSanFrancisco({ anio })
    expect(edificio.getObjectByName('Interior de tres naves')).toBeUndefined()
    expect(ceiba.children).toHaveLength(0)
    liberar(edificio)
    const estudio = crearSanFrancisco({ anio, nivelDetalle: 'estudio' })
    expect(estudio.edificio.getObjectByName('Interior de tres naves')).toBeDefined()
    liberar(estudio.edificio)
  }
})

test('los faldones de teja y el tímpano trasero miran hacia afuera', () => {
  for (const anio of [1772, 1936]) {
    const { edificio, cubiertas } = crearSanFrancisco({ anio })
    edificio.updateMatrixWorld(true)
    let faldones = 0, invertidas = 0, timpanos = 0
    cubiertas.traverse(o => {
      if (!o.isMesh || o.geometry.type !== 'BufferGeometry') return
      const giro = new Matrix3().getNormalMatrix(o.matrixWorld), n = o.geometry.attributes.normal
      const teja = o.userData.mat === 'teja'
      for (let i = 0; i < n.count; i++) {
        const v = new Vector3().fromBufferAttribute(n, i).applyMatrix3(giro)
        if (teja) { if (v.y > .01) faldones++; else invertidas++ } else if (v.z < -.99) timpanos++; else invertidas++
      }
    })
    expect(faldones).toBeGreaterThan(0); expect(timpanos).toBeGreaterThan(0); expect(invertidas).toBe(0)
    liberar(edificio)
  }
})

test('las casas genéricas del solar, campanario incluido, se apagan desde 1772 sin mutar sus datos', () => {
  const zonas = zonasDeSupresion([hito])
  expect(zonas[0]).toMatchObject({ desde: 1, hasta: 0 })
  for (const planta of hito.planta) {
    const casa = { vertices: new Float32Array(planta.flat()), techos: new Uint32Array([0, 4, 1, 0]), vida: new Uint32Array([0]) }
    expect([...suprimirTechos(casa, zonas)]).toEqual([8])
    expect([...casa.vida]).toEqual([0])
  }
})

test('la ficha cuenta la portada de 1745, el Libertador en 1813 y la reforma de Hurtado Manrique, con sus dudas', () => {
  const marca = normalizarMarcas(MARCAS, { hitos: HITOS, coords }).find(m => m.id === hito.id)
  for (const epoca of [1, 2, 3, 5]) {
    const ficha = contenidoDeFicha({ marca, ficha: FICHAS[hito.id], epoca })
    expect(ficha.existe).toBe(true)
    expect(ficha.dudas).toMatch(/interpretativ/)
  }
  const textos = Object.fromEntries(FICHAS[hito.id].textos)
  expect(textos[1]).toContain('1745')
  expect(textos[2]).toContain('1813')
  expect(textos[3]).toContain('Hurtado Manrique')
  expect(FICHAS[hito.id].hoy).toContain('1956')
})
