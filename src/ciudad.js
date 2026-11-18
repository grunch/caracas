/**
 * La ciudad levantada: huellas de los techos (polígonos en píxeles del plano) extruidas
 * en una sola geometría. Cada vértice lleva aInfo = (distancia de su casa a la plaza,
 * semilla, estilo, pisos) para que el shader haga la ola y el estilo de la fachada,
 * aAncla = (x, z) del centroide de su casa: la altura del terreno a la que sube entera, y
 * aPared = (metros desde la esquina de arranque de su pared, largo de esa pared): las coordenadas
 * con las que el shader dibuja la fachada (src/shader/fachada.js); los techos llevan (0, 0), y
 * aHistoria = el estilo y los pisos de su casa en cada época (empacarHistoria): el shader elige los de
 * la época que rige y lleva la altura, hecha con los pisos de `techos`, a los de esa época.
 *
 * Datos (ciudad.pak): vertices Float32 [px, py, …]; techos Uint32 de a 4:
 * [primer vértice, cuántos, empacarTecho({pisos, estilo}), semilla]; historia (opcional) Uint8 de a 6:
 * por techo, un byte por época = estilo + 16·pisos (specs/02).
 */
import { ShapeUtils, Vector2, BufferGeometry, BufferAttribute } from 'three'

export const ALTO_PISO = 4.2 // m: casas coloniales y republicanas de techo alto

const SIN_PARED = [0, 0]

export const empacarTecho = ({ pisos, estilo }) => ((estilo & 0xff) << 8) | (pisos & 0xff)
export const desempacarTecho = (v) => ({ pisos: v & 0xff, estilo: (v >> 8) & 0xff })

export const EPOCAS_HISTORIA = 6 // un byte por época de la línea de tiempo: estilo + 16·pisos
/** Los 6 bytes de la historia de una casa → 2 números de 3 bytes (exactos en Float32): el atributo aHistoria. */
export const empacarHistoria = (b) => [b[0] + 256 * b[1] + 65536 * b[2], b[3] + 256 * b[4] + 65536 * b[5]]
/** Espejo de enEpoca() del shader (src/shader/vertice.js): estilo y pisos en la época e (se redondea y se acota). */
export function historiaEnEpoca([h0, h1], e) {
  const k = Math.min(EPOCAS_HISTORIA - 1, Math.max(0, Math.round(e)))
  const byte = Math.floor((k < 3 ? h0 : h1) / 256 ** (k % 3)) % 256
  return { estilo: byte % 16, pisos: Math.floor(byte / 16) }
}

/** Devuelve arrays planos (posiciones, normales, info, vidas, anclas, paredes, historias, indices); sin three.js de por medio. */
export function extruirTechos({ vertices, techos, vida = null, historia = null }, coords) {
  if (historia && historia.length !== (techos.length / 4) * EPOCAS_HISTORIA) {
    throw new Error(`ciudad: la historia trae ${historia.length} bytes y hacen falta ${EPOCAS_HISTORIA} por techo`)
  }
  const posiciones = []
  const normales = []
  const info = []
  const vidas = [] // [nace, muere] por vértice (src/epocas.js); sin vida, siempre visible
  const anclas = []
  const paredes = [] // [u, largo] por vértice: dónde está en su pared (0, 0 en los techos)
  const historias = [] // empacarHistoria de su casa, por vértice
  const indices = []
  let vidaTecho = [0, 0]
  let historiaTecho = [0, 0]

  const vertice = (x, y, z, n, datos, ancla, pared = SIN_PARED) => {
    posiciones.push(x, y, z)
    normales.push(n[0], n[1], n[2])
    info.push(...datos)
    vidas.push(vidaTecho[0], vidaTecho[1])
    anclas.push(ancla.x, ancla.y)
    paredes.push(pared[0], pared[1])
    historias.push(historiaTecho[0], historiaTecho[1])
    return posiciones.length / 3 - 1
  }
  // agrega el triángulo con el giro que haga que su cara mire hacia n
  const triangulo = (a, b, c, n) => {
    const p = (k) => [posiciones[k * 3], posiciones[k * 3 + 1], posiciones[k * 3 + 2]]
    const [pa, pb, pc] = [p(a), p(b), p(c)]
    const u = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]]
    const v = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]]
    const cruz = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    const mira = cruz[0] * n[0] + cruz[1] * n[1] + cruz[2] * n[2]
    indices.push(...(mira >= 0 ? [a, b, c] : [a, c, b]))
  }

  for (let t = 0; t < techos.length; t += 4) {
    const [inicio, cuantos, empacado, semilla] = [techos[t], techos[t + 1], techos[t + 2], techos[t + 3]]
    const { pisos, estilo } = desempacarTecho(empacado)
    const v = vida ? vida[t / 4] : 0
    vidaTecho = [v % 8, Math.floor(v / 8)]
    // sin historia (datos viejos, la ciudad de demostración), todas las épocas valen lo de `techos`
    historiaTecho = empacarHistoria(historia
      ? historia.subarray((t / 4) * EPOCAS_HISTORIA, (t / 4 + 1) * EPOCAS_HISTORIA)
      : Array(EPOCAS_HISTORIA).fill((estilo & 15) + 16 * Math.min(pisos, 15)))
    const alto = pisos * ALTO_PISO
    const anillo = []
    for (let k = 0; k < cuantos; k++) {
      const { x, z } = coords.aMundo(vertices[(inicio + k) * 2], vertices[(inicio + k) * 2 + 1])
      anillo.push(new Vector2(x, z))
    }
    const centro = anillo.reduce((s, p) => s.add(p), new Vector2()).divideScalar(cuantos)
    const datos = [centro.length(), semilla & 0xffff, estilo, pisos]

    // techo
    const arriba = [0, 1, 0]
    const base = anillo.map((p) => vertice(p.x, alto, p.y, arriba, datos, centro))
    for (const [a, b, c] of ShapeUtils.triangulateShape(anillo, [])) triangulo(base[a], base[b], base[c], arriba)

    // paredes: normal hacia afuera según el sentido de giro del anillo
    const signo = ShapeUtils.area(anillo) > 0 ? 1 : -1
    for (let k = 0; k < cuantos; k++) {
      const a = anillo[k]
      const b = anillo[(k + 1) % cuantos]
      const largo = a.distanceTo(b)
      if (largo < 1e-6) continue
      const n = [((b.y - a.y) / largo) * signo, 0, (-(b.x - a.x) / largo) * signo]
      const [enA, enB] = [[0, largo], [largo, largo]]
      const [v0, v1, v2, v3] = [vertice(a.x, 0, a.y, n, datos, centro, enA), vertice(b.x, 0, b.y, n, datos, centro, enB),
        vertice(b.x, alto, b.y, n, datos, centro, enB), vertice(a.x, alto, a.y, n, datos, centro, enA)]
      triangulo(v0, v1, v2, n)
      triangulo(v0, v2, v3, n)
    }
  }
  return {
    posiciones: new Float32Array(posiciones),
    normales: new Float32Array(normales),
    info: new Float32Array(info),
    vidas: new Float32Array(vidas),
    anclas: new Float32Array(anclas),
    paredes: new Float32Array(paredes),
    historias: new Float32Array(historias),
    indices: posiciones.length / 3 > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
  }
}

export function geometriaCiudad(datos, coords) {
  const { posiciones, normales, info, vidas, anclas, paredes, historias, indices } = extruirTechos(datos, coords)
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(posiciones, 3))
  g.setAttribute('normal', new BufferAttribute(normales, 3))
  g.setAttribute('aInfo', new BufferAttribute(info, 4))
  g.setAttribute('aVida', new BufferAttribute(vidas, 2))
  g.setAttribute('aAncla', new BufferAttribute(anclas, 2))
  g.setAttribute('aPared', new BufferAttribute(paredes, 2))
  g.setAttribute('aHistoria', new BufferAttribute(historias, 2))
  g.setIndex(new BufferAttribute(indices, 1))
  g.computeBoundingSphere()
  return g
}
