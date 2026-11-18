/**
 * La ciudad levantada: huellas de los techos (polígonos en píxeles del plano) extruidas
 * en una sola geometría. Cada vértice lleva aInfo = (distancia de su casa a la plaza,
 * semilla, estilo, pisos) para que el shader haga la ola y el estilo de la fachada.
 *
 * Datos (ciudad.pak): vertices Float32 [px, py, …]; techos Uint32 de a 4:
 * [primer vértice, cuántos, empacarTecho({pisos, estilo}), semilla].
 */
import { ShapeUtils, Vector2, BufferGeometry, BufferAttribute } from 'three'

export const ALTO_PISO = 4.2 // m: casas coloniales y republicanas de techo alto

export const empacarTecho = ({ pisos, estilo }) => ((estilo & 0xff) << 8) | (pisos & 0xff)
export const desempacarTecho = (v) => ({ pisos: v & 0xff, estilo: (v >> 8) & 0xff })

/** Devuelve arrays planos (posiciones, normales, info, indices); sin three.js de por medio. */
export function extruirTechos({ vertices, techos }, coords) {
  const posiciones = []
  const normales = []
  const info = []
  const indices = []

  const vertice = (x, y, z, n, datos) => {
    posiciones.push(x, y, z)
    normales.push(n[0], n[1], n[2])
    info.push(...datos)
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
    const base = anillo.map((p) => vertice(p.x, alto, p.y, arriba, datos))
    for (const [a, b, c] of ShapeUtils.triangulateShape(anillo, [])) triangulo(base[a], base[b], base[c], arriba)

    // paredes: normal hacia afuera según el sentido de giro del anillo
    const signo = ShapeUtils.area(anillo) > 0 ? 1 : -1
    for (let k = 0; k < cuantos; k++) {
      const a = anillo[k]
      const b = anillo[(k + 1) % cuantos]
      const largo = a.distanceTo(b)
      if (largo < 1e-6) continue
      const n = [((b.y - a.y) / largo) * signo, 0, (-(b.x - a.x) / largo) * signo]
      const [v0, v1, v2, v3] = [vertice(a.x, 0, a.y, n, datos), vertice(b.x, 0, b.y, n, datos),
        vertice(b.x, alto, b.y, n, datos), vertice(a.x, alto, a.y, n, datos)]
      triangulo(v0, v1, v2, n)
      triangulo(v0, v2, v3, n)
    }
  }
  return {
    posiciones: new Float32Array(posiciones),
    normales: new Float32Array(normales),
    info: new Float32Array(info),
    indices: posiciones.length / 3 > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
  }
}

export function geometriaCiudad(datos, coords) {
  const { posiciones, normales, info, indices } = extruirTechos(datos, coords)
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(posiciones, 3))
  g.setAttribute('normal', new BufferAttribute(normales, 3))
  g.setAttribute('aInfo', new BufferAttribute(info, 4))
  g.setIndex(new BufferAttribute(indices, 1))
  g.computeBoundingSphere()
  return g
}
