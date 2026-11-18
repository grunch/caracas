/**
 * Las piezas con las que se arman los hitos: cada función recibe un pintor (src/hitos/lienzo.js) y dibuja
 * en su marco local (x a lo largo, y arriba, z al frente). Medidas en metros. Todas son de pocos triángulos:
 * la silueta manda, el detalle lo pone el shader (tejas, rejas, sillares).
 */
import {
  BoxGeometry, CylinderGeometry, SphereGeometry, PlaneGeometry, Shape, ShapeGeometry, ExtrudeGeometry,
  BufferGeometry, Float32BufferAttribute, Quaternion, Vector3, Matrix4,
} from 'three'
import { MAT } from './lienzo.js'

/** La paleta (sRGB): cal, teja, piedra, bronce… Los tonos salen de las fotos y grabados de fuentes/imagenes. */
export const TONO = Object.freeze({
  CAL: 0xe9e2d0, CAL_SOMBRA: 0xcfc6b0, TEJA: 0xa9614a, TEJA_VIEJA: 0x7d4a36, PIEDRA: 0x8a8378,
  PIEDRA_OSCURA: 0x5e5850, PIEDRA_CLARA: 0xbdb6a6, BRONCE: 0x4d4a36, HIERRO: 0x23262a, MADERA: 0x5d4631,
  TIERRA: 0xb39a72, LONA: 0xd8cfb8, LOSA: 0xcbc3b0, VANO: 0x2b2622, PIZARRA: 0x4b4f55, VIDRIO: 0xf2e7b8,
  OCRE: 0xd9b25a, ZINC: 0x9aa3a6, COBRE: 0x5f8274,
})

const ARRIBA = new Vector3(0, 1, 0)
const SEGMENTOS_ARCO = 7

/** Triángulos sueltos ([[x, y, z] × 3, uv × 3 opcional]…) → geometría de caras planas. */
export function deTriangulos(triangulos) {
  const pos = []
  const uv = []
  for (const [a, b, c, ua = [0, 0], ub = [0, 0], uc = [0, 0]] of triangulos) {
    pos.push(...a, ...b, ...c)
    uv.push(...ua, ...ub, ...uc)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}

/** Un cuadrilátero a-b-c-d (en orden) como dos triángulos, con uv en metros si se dan. */
const cuadro = (a, b, c, d, [ua, ub, uc, ud] = []) => [[a, b, c, ua, ub, uc], [a, c, d, ua, uc, ud]]

/** Caja centrada en el origen del pintor, apoyada en y = 0. */
export function caja(p, { ancho, alto, fondo, color = TONO.CAL, mat = MAT.LISO, flota = false }) {
  p.geo(new BoxGeometry(ancho, alto, fondo).translate(0, alto / 2, 0), { color, mat, flota })
}

/** Tronco de n lados (cilindro, prisma ochavado, cono si radioArriba = 0), apoyado en y = 0. */
export function tronco(p, { radio, radioArriba = radio, alto, lados = 8, color = TONO.CAL, mat = MAT.LISO, flota = false }) {
  // con el giro de medio lado, un ochavo queda con sus caras (no sus aristas) hacia los ejes
  p.geo(new CylinderGeometry(radioArriba, radio, alto, lados, 1).rotateY(Math.PI / lados).translate(0, alto / 2, 0), { color, mat, flota })
}

/** Media naranja (cúpula) de n gajos: radio en la base, alto hasta la clave. */
export function cupula(p, { radio, alto = radio, lados = 8, color = TONO.PIZARRA, mat = MAT.LISO }) {
  const g = new SphereGeometry(radio, lados, 5, 0, Math.PI * 2, 0, Math.PI / 2).rotateY(Math.PI / lados).scale(1, alto / radio, 1)
  p.geo(g, { color, mat, flota: true })
}

/** Barra de sección redonda entre dos puntos locales (patas, brazos de farol, astas). */
export function barra(p, desde, hasta, { radio, radioFin = radio, lados = 5, color = TONO.HIERRO }) {
  const a = new Vector3(...desde)
  const d = new Vector3(...hasta).sub(a)
  const largo = d.length()
  if (largo < 1e-6) return
  const giro = new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(ARRIBA, d.normalize()))
  const g = new CylinderGeometry(radioFin, radio, largo, lados, 1).translate(0, largo / 2, 0).applyMatrix4(giro.setPosition(a))
  p.geo(g, { color, flota: true })
}

/** Elipsoide (cuerpos de la estatua, perillones, faroles de globo), centrado en `centro`. */
export function bulto(p, centro, [rx, ry, rz], { color = TONO.BRONCE, lados = 7, giro = null, mat = MAT.LISO } = {}) {
  const g = new SphereGeometry(1, lados, 5).scale(rx, ry, rz)
  if (giro) g.applyMatrix4(giro)
  p.geo(g.translate(...centro), { color, mat, flota: true })
}

/**
 * Tejado centrado, con la cumbrera a lo largo de x. `tipo`: 'dos' aguas (con hastiales de pared), 'cuatro'
 * aguas o 'una' (cae hacia +z). El alero vuela `alero` metros. uv en metros: u a lo largo, v pendiente abajo.
 */
export function tejado(p, { largo, ancho, alto, tipo = 'dos', alero = 0.45, color = TONO.TEJA, hastial = TONO.CAL, mat = MAT.TEJA }) {
  const [L, W] = [largo / 2 + (tipo === 'dos' ? 0 : alero), ancho / 2 + alero]
  const faldon = Math.hypot(W, alto)
  const tris = []
  if (tipo === 'una') {
    const f = Math.hypot(2 * W, alto)
    tris.push(...cuadro([-L, alto, -W], [L, alto, -W], [L, 0, W], [-L, 0, W], [[-L, 0], [L, 0], [L, f], [-L, f]]))
    p.geo(deTriangulos(tris), { color, mat, flota: true })
    p.geo(deTriangulos([[[-L, 0, -W], [-L, alto, -W], [-L, 0, W]], [[L, 0, -W], [L, alto, -W], [L, 0, W]],
      ...cuadro([-L, 0, -W], [L, 0, -W], [L, alto, -W], [-L, alto, -W])]), { color: hastial, flota: true })
    return
  }
  // cumbrera: en cuatro aguas se acorta medio ancho por lado (pirámide si la planta es cuadrada)
  const c = tipo === 'cuatro' ? Math.max(0, L - W) : L
  for (const s of [-1, 1]) {
    tris.push(...cuadro([-c, alto, 0], [c, alto, 0], [L, 0, s * W], [-L, 0, s * W], [[-c, 0], [c, 0], [L, faldon], [-L, faldon]]))
  }
  if (tipo === 'cuatro') {
    for (const s of [-1, 1]) tris.push([[s * c, alto, 0], [s * L, 0, -W], [s * L, 0, W], [0, 0], [-W, faldon], [W, faldon]])
  }
  p.geo(deTriangulos(tris), { color, mat, flota: true })
  if (tipo === 'dos') {
    const w = ancho / 2
    p.geo(deTriangulos([-1, 1].map((s) => [[s * largo / 2, 0, -w], [s * largo / 2, alto * (w / W), 0], [s * largo / 2, 0, w]])), { color: hastial, flota: true })
  }
}

/** Un cuerpo: caja de paredes con su tejado encima. */
export function cuerpo(p, { largo, ancho, alto, techo = 'dos', altoTecho = ancho * 0.3, color = TONO.CAL, teja = TONO.TEJA, alero }) {
  caja(p, { ancho: largo, alto, fondo: ancho, color })
  if (techo !== 'plano') tejado(p.en(0, alto, 0), { largo, ancho, alto: altoTecho, tipo: techo, color: teja, hastial: color, alero })
}

/** El contorno de un vano: rectángulo con arco de medio punto (o recto), desde (x0, 0). */
function trazarVano(forma, x0, ancho, alto, arco) {
  const r = ancho / 2
  forma.lineTo(x0, 0)
  if (!arco) { forma.lineTo(x0, alto); forma.lineTo(x0 + ancho, alto) } else {
    forma.lineTo(x0, alto - r)
    forma.absarc(x0 + r, alto - r, r, Math.PI, 0, true)
  }
  forma.lineTo(x0 + ancho, 0)
}

/**
 * Arquería: un muro de `largo` × `alto` y `espesor` de fondo, calado por `arcos` vanos de medio punto que
 * llegan al piso. Va de x = 0 a x = largo, en el plano xy, con el frente en z = espesor.
 */
export function arqueria(p, { largo, alto, arcos, luz, altoArco, espesor = 0.6, color = TONO.CAL, arco = true }) {
  const paso = largo / arcos
  if (!(luz < paso)) throw new Error('arquería: la luz del arco no entra en su tramo')
  const forma = new Shape()
  forma.moveTo(0, 0)
  for (let i = 0; i < arcos; i++) trazarVano(forma, i * paso + (paso - luz) / 2, luz, altoArco, arco)
  forma.lineTo(largo, 0)
  forma.lineTo(largo, alto)
  forma.lineTo(0, alto)
  p.geo(new ExtrudeGeometry(forma, { depth: espesor, bevelEnabled: false, curveSegments: SEGMENTOS_ARCO }), { color })
}

/** Un vano pintado (puerta, ventana, nicho): calcomanía oscura apenas delante del plano xy, centrada en x. */
export function vano(p, { ancho, alto, arco = true, color = TONO.VANO, mat = MAT.LISO, saliente = 0.06 }) {
  const forma = new Shape()
  forma.moveTo(-ancho / 2, 0)
  trazarVano(forma, -ancho / 2, ancho, alto, arco)
  p.geo(new ShapeGeometry(forma, SEGMENTOS_ARCO).translate(0, 0, saliente), { color, mat, flota: true })
}

/** Disco de frente (reloj, óculo), centrado en el origen del pintor. */
export function disco(p, { radio, color = TONO.VANO, mat = MAT.LISO, saliente = 0.06, lados = 16 }) {
  const forma = new Shape().absarc(0, 0, radio, 0, Math.PI * 2)
  const g = new ShapeGeometry(forma, lados).translate(0, 0, saliente)
  const { position, uv } = g.attributes
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / radio, position.getY(i) / radio)
  p.geo(g, { color, mat, flota: true })
}

/** Frontón triangular de frente, centrado en x, de `fondo` metros hacia atrás. */
export function fronton(p, { ancho, alto, fondo = 0.5, color = TONO.CAL }) {
  const forma = new Shape().moveTo(-ancho / 2, 0).lineTo(ancho / 2, 0).lineTo(0, alto).closePath()
  p.geo(new ExtrudeGeometry(forma, { depth: fondo, bevelEnabled: false }).translate(0, 0, -fondo), { color, flota: true })
}

/**
 * Frontón barroco de volutas: el remate curvo de las fachadas coloniales (Catedral, capillas). Dos roleos
 * cóncavos suben desde los hombros hasta un cuerpo central de medio punto.
 */
export function frontonDeVolutas(p, { ancho, alto, fondo = 0.6, color = TONO.CAL }) {
  const [w, h] = [ancho / 2, alto]
  const r = Math.min(w * 0.4, h * 0.4) // el cuerpo central, de medio punto, llega justo al alto pedido
  const yc = h - r
  const forma = new Shape().moveTo(-w, 0).lineTo(w, 0)
  forma.lineTo(w, h * 0.12)
  forma.quadraticCurveTo(w * 0.86, yc * 0.62, w * 0.6, yc * 0.55) // la voluta: sube y se enrosca hacia adentro
  forma.quadraticCurveTo(r * 1.05, yc * 0.58, r, yc)
  forma.absarc(0, yc, r, 0, Math.PI)
  forma.quadraticCurveTo(-r * 1.05, yc * 0.58, -w * 0.6, yc * 0.55)
  forma.quadraticCurveTo(-w * 0.86, yc * 0.62, -w, h * 0.12)
  forma.closePath()
  p.geo(new ExtrudeGeometry(forma, { depth: fondo, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -fondo), { color, flota: true })
}

/** Columna con basa y capitel, de pie en el origen. */
export function columna(p, { radio, alto, color = TONO.CAL, lados = 8 }) {
  caja(p, { ancho: radio * 2.8, alto: radio * 0.9, fondo: radio * 2.8, color })
  tronco(p.en(0, radio * 0.9, 0), { radio, radioArriba: radio * 0.85, alto: alto - radio * 1.8, lados, color, flota: true })
  caja(p.en(0, alto - radio * 0.9, 0), { ancho: radio * 2.8, alto: radio * 0.9, fondo: radio * 2.8, color, flota: true })
}

/** Cornisa: una faja saliente alrededor de una planta de `largo` × `ancho`, a la altura del pintor. */
export function cornisa(p, { largo, ancho, alto = 0.35, vuelo = 0.3, color = TONO.CAL }) {
  caja(p, { ancho: largo + 2 * vuelo, alto, fondo: ancho + 2 * vuelo, color, flota: true })
}

/**
 * Escalinata que baja hacia +z desde el borde de una terraza: el pintor está en el borde, a la altura del
 * piso de arriba. Los peldaños son macizos y siguen bajo tierra: donde el terreno está más alto, quedan enterrados.
 */
export function escalinata(p, { ancho, peldaños, huella = 0.36, contrahuella = 0.17, color = TONO.PIEDRA_CLARA, macizo = 4 }) {
  for (let i = 0; i < peldaños; i++) {
    const arriba = -(i + 1) * contrahuella
    const g = new BoxGeometry(ancho, macizo, huella).translate(0, arriba - macizo / 2, (i + 0.5) * huella)
    p.geo(g, { color, flota: true })
  }
}

/** Reja de hierro: un paño de `largo` × `alto` (de x = 0 a largo); los barrotes los dibuja el shader. */
export function verja(p, { largo, alto, color = TONO.HIERRO, tramo = 3 }) {
  const n = Math.max(1, Math.round(largo / tramo))
  const g = new PlaneGeometry(largo, alto, n, 1).translate(largo / 2, alto / 2, 0)
  const { position, uv } = g.attributes
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i), position.getY(i)) // en metros
  p.geo(g, { color, mat: MAT.VERJA, flota: true })
}

/** Losa horizontal de `ancho` × `fondo` en cuadros de ~`celda` m, con uv = (x, z) locales en metros. */
export function losa(p, { ancho, fondo, celda = 4, color = TONO.LOSA, mat = MAT.LISO }) {
  const g = new PlaneGeometry(ancho, fondo, Math.ceil(ancho / celda), Math.ceil(fondo / celda)).rotateX(-Math.PI / 2)
  const { position, uv } = g.attributes
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i), position.getZ(i))
  p.geo(g, { color, mat, flota: true })
}

/** Zócalo: la pared que baja del borde de una losa (a la altura `alto`) hasta el terreno, por sus cuatro lados. */
export function zocalo(p, { ancho, fondo, alto, celda = 4, color = TONO.PIEDRA }) {
  const [w, f] = [ancho / 2, fondo / 2]
  const lados = [[[-w, -f], [w, -f]], [[w, -f], [w, f]], [[w, f], [-w, f]], [[-w, f], [-w, -f]]]
  const tris = []
  for (const [[x0, z0], [x1, z1]] of lados) {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / celda)
    for (let i = 0; i < n; i++) {
      const [ta, tb] = [i / n, (i + 1) / n]
      const [ax, az, bx, bz] = [x0 + (x1 - x0) * ta, z0 + (z1 - z0) * ta, x0 + (x1 - x0) * tb, z0 + (z1 - z0) * tb]
      tris.push(...cuadro([ax, 0, az], [bx, 0, bz], [bx, alto, bz], [ax, alto, az]))
    }
  }
  p.geo(deTriangulos(tris), { color, mat: MAT.SILLAR })
}
