/**
 * Los triángulos de techo de una época, como los dibuja el visor (fase 6 de specs/08, T33j.6a). Reproduce en CPU lo
 * que hace el shader con la geometría de src/ciudad.js (extruirTechos): las casas en pie en la época, la altura con
 * los pisos de esa época (aHistoria) y el terreno del ancla de la casa; sin los aleros que la fachada de pretil
 * esconde. Es el método de T33j.1l (specs/auditoria-1772/cruces-cubiertas-3d.md), hecho módulo. No lee el GPU.
 */
import { createHash } from 'node:crypto'
import { extruirTechos, historiaEnEpoca } from '../src/ciudad.js'
import { CUBIERTA } from '../src/techos.js'

const DE_TECHO = [CUBIERTA.TEJA, CUBIERTA.AZOTEA, CUBIERTA.ZINC, CUBIERTA.ALERO]
const DE_PRETIL = [1, 2, 3]   // republicano, guzmancista, ecléctico: el shader quita el alero (conPretil)
const CUMBRE_M = 1e-3          // aTecho.t a menos de esto: el vértice está en la cumbrera

const clave = (x, z) => `${Math.fround(x)},${Math.fround(z)}`

/** {techo de cada ancla}: el centroide de la huella en metros, como leerCasas en src/ciudad.js. */
function techosPorAncla({ vertices, techos }, coords) {
  const ids = new Map()
  for (let t = 0; t < techos.length; t += 4) {
    const [inicio, n] = [techos[t], techos[t + 1]]
    let x = 0, z = 0
    for (let k = 0; k < n; k++) {
      const p = coords.aMundo(vertices[(inicio + k) * 2], vertices[(inicio + k) * 2 + 1])
      x += p.x / n
      z += p.z / n
    }
    const k = clave(x, z)
    if (ids.has(k)) throw new Error(`cubiertas: dos casas con el mismo ancla (techos ${ids.get(k)} y ${t / 4})`)
    ids.set(k, t / 4)
  }
  return ids
}

/**
 * {triangulos: [{techo, tipo, cumbre: [bool × 3], puntos: [[px, py, y] × 3]}]} de la época `epoca`: x y z del mundo
 * llevados a píxeles del plano (coords.aPixel), y en metros sobre la referencia del relieve (`altura(x, z)`).
 */
export function cubiertasDeEpoca(datos, coords, { epoca, altura }) {
  const ids = techosPorAncla(datos, coords)
  const g = extruirTechos(datos, coords)
  const triangulos = []
  for (let j = 0; j < g.indices.length; j += 3) {
    const vs = [g.indices[j], g.indices[j + 1], g.indices[j + 2]]
    const v = vs[0]
    const [nace, muere, tipo] = [g.vidas[v * 2], g.vidas[v * 2 + 1], g.cubiertas[v * 4 + 3]]
    if (nace > epoca || (muere && muere <= epoca) || !DE_TECHO.includes(tipo % 8)) continue
    const h = historiaEnEpoca([g.historias[v * 2], g.historias[v * 2 + 1]], epoca)
    if ((tipo === CUBIERTA.ALERO || tipo >= CUBIERTA.VOLADA) && DE_PRETIL.includes(h.estilo)) continue
    const [ax, az] = [g.anclas[v * 2], g.anclas[v * 2 + 1]]
    const techo = ids.get(clave(ax, az))
    if (techo === undefined) throw new Error('cubiertas: un vértice con un ancla que no es de ninguna casa')
    const suelo = altura(ax, az)
    const puntos = vs.map((i) => {
      const { px, py } = coords.aPixel(g.posiciones[i * 3], g.posiciones[i * 3 + 2])
      const y = (g.posiciones[i * 3 + 1] * h.pisos) / g.info[i * 4 + 3] + suelo
      return [px, py, y]
    })
    triangulos.push({ techo, tipo, cumbre: vs.map((i) => Math.abs(g.cubiertas[i * 4 + 1]) < CUMBRE_M), puntos })
  }
  return { triangulos }
}

/**
 * La procedencia de las huellas: sha256 de los vértices (Float32) y de [primer vértice, cuántos] de cada techo (Uint32,
 * little endian), lo mismo que tools/geo/cierre_fase6.py (huellas_sha256) calcula sobre la ciudad que mide.
 */
export function huellasSha256({ vertices, techos }) {
  const inicios = new Uint32Array(techos.length / 2)
  for (let t = 0; t < techos.length / 4; t++) [inicios[t * 2], inicios[t * 2 + 1]] = [techos[t * 4], techos[t * 4 + 1]]
  const vista = (a) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
  return createHash('sha256').update(vista(Float32Array.from(vertices))).update(vista(inicios)).digest('hex')
}
