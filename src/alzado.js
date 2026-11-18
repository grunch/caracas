/**
 * El alzado de una casa: su huella (anillo en el marco del lote: u a lo largo del frente, v hacia el
 * fondo, en metros) y el plan de su techo (src/techos.js) dan los triángulos de sus tejados, sus
 * paredes (que suben hasta el tejado: hastiales, pretiles, tapias), los escalones entre un tejado y
 * otro más bajo, las paredes del patio y los aleros que vuelan sobre la calle.
 *
 * No sabe de buffers ni del mundo: escribe por `salida.vertice(u, v, y, normal, pared, techo)` y
 * `salida.triangulo(a, b, c, normal)`, con la normal en el marco del lote [nu, ny, nv];
 * pared = [metros a lo largo de la pared, largo de la pared (0 = sin vanos), alto de piso]; techo =
 * [s a lo largo del alero, t bajando desde la cumbrera, largo del faldón, cubierta] (src/shader/techo.js);
 * en las paredes, techo = [lo que sube este vértice con el pretil, lo que sube su pared, 0, 0].
 */
import { ShapeUtils, Vector2 } from 'three'
import { CUBIERTA, alturaDe, faldonEn } from './techos.js'
import { areaConSigno, recortarConvexo, cruces, estaDentro } from './poligono.js'

const SIN_TECHO = [0, 0, 0, CUBIERTA.PARED]
const ALTO_MINIMO_CON_VANOS_M = 2
const ESCALON_MINIMO_M = 0.03
export const PISO_PATIO_M = 0.4
const SUBIDA_DE_HASTIAL_M = 0.3
const HACIA_AFUERA = 0.7 // coseno desde el cual un lado "mira" hacia un costado del lote
const ABAJO = [0, -1, 0]

const mezcla = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const acotar = (x, a, b) => Math.min(b, Math.max(a, x))

/** El faldón que le toca a un punto de la huella (acotado al rectángulo del plan, por si se sale por un pelo). */
const faldonDe = (plan, [u, v]) => faldonEn(plan, acotar(u, 0, plan.ancho), acotar(v, 0, plan.fondo))

/** Coordenadas del tejado en el punto: s a lo largo del alero, t bajando por la pendiente desde la cumbrera. */
export function coordsFaldon(f, u, v) {
  if (f.tan === 0) return [u, v]
  const [du, dv] = [u - f.origen[0], v - f.origen[1]]
  return [dv * f.caida[0] - du * f.caida[1], (du * f.caida[0] + dv * f.caida[1]) * Math.hypot(1, f.tan)]
}

/** Largo del faldón de la cumbrera al alero, medido sobre la pendiente (sobre su `base`, si la región está estirada: src/alas.js). */
export const largoFaldon = (f) => (f.tan === 0 ? 0 : Math.max(...(f.base ?? f.region).map(([u, v]) => coordsFaldon(f, u, v)[1])))

/** Normal del faldón en el marco del lote: se inclina hacia donde cae. */
export function normalFaldon(f) {
  const k = Math.hypot(1, f.tan)
  return [(f.tan * f.caida[0]) / k, 1 / k, (f.tan * f.caida[1]) / k]
}

const sinRepetidos = (poligono) => poligono.filter((p, k) => {
  const q = poligono[(k + poligono.length - 1) % poligono.length]
  return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-5
})

/** A qué costado del lote mira un lado de la huella con esa normal (en el marco del lote). */
function costado([nu, nv]) {
  if (nv < -HACIA_AFUERA) return 'frente'
  if (nv > HACIA_AFUERA) return 'fondo'
  if (nu < -HACIA_AFUERA) return 'izq'
  return nu > HACIA_AFUERA ? 'der' : null
}

const daALaCalle = (lado, libres) => lado === 'frente' || Boolean(lado && libres[lado])

/** Cuánto vuela el alero de un faldón: lo que dice el plan si cae hacia la calle; si no, nada. */
const vueloDe = ({ plan, libres }, f) => (plan.alero > 0 && f.tan > 0 && !f.hueco && daALaCalle(costado(f.caida), libres) ? plan.alero : 0)

/** Largo del faldón con su alero: hasta ahí llega la última hilada. */
const largoConAlero = (casa, f) => largoFaldon(f) + vueloDe(casa, f) * Math.hypot(1, f.tan)

/** Los tejados (y el piso de los patios): cada faldón recortado con la huella y subido a su plano. */
function tejados(casa, salida) {
  const { anillo, plan } = casa
  for (const f of plan.faldones) {
    const poligono = sinRepetidos(recortarConvexo(anillo, f.region))
    if (poligono.length < 3) continue
    const [n, largo] = [normalFaldon(f), largoConAlero(casa, f)]
    const pared = [0, 0, plan.altoPiso]
    // el patio no lleva tejado sino piso, un poco sobre el terreno para que la cuesta no lo tape
    const [alto, cubierta] = f.hueco ? [() => PISO_PATIO_M, f.piso ?? CUBIERTA.PATIO] : [(u, v) => alturaDe(f, u, v), f.cubierta]
    const indices = poligono.map(([u, v]) => salida.vertice(u, v, alto(u, v), n, pared, [...coordsFaldon(f, u, v), largo, cubierta]))
    for (const [a, b, c] of ShapeUtils.triangulateShape(poligono.map(([u, v]) => new Vector2(u, v)), [])) {
      salida.triangulo(indices[a], indices[b], indices[c], n)
    }
  }
}

/**
 * Un paño vertical entre p0 y p1, de las alturas `abajo` a las `arriba` (una por extremo), mirando hacia
 * n. `pretil` = [lo que suben sus vértices de abajo, los de arriba] cuando la fachada de la época lleva
 * pretil (lo aplica el shader): un paño que solo existe con el pretil nace sin altura.
 */
function muro(salida, p0, p1, abajo, arriba, n, pared0, pared1, pretil = null) {
  if (!pretil && arriba[0] - abajo[0] < 1e-4 && arriba[1] - abajo[1] < 1e-4) return
  const normal = [n[0], 0, n[1]]
  const sube = pretil ? Math.max(pretil[0], pretil[1]) : 0
  const techo = (k) => (pretil ? [pretil[k], sube, 0, CUBIERTA.PARED] : SIN_TECHO)
  const v = [
    salida.vertice(p0[0], p0[1], abajo[0], normal, pared0, techo(0)), salida.vertice(p1[0], p1[1], abajo[1], normal, pared1, techo(0)),
    salida.vertice(p1[0], p1[1], Math.max(arriba[1], abajo[1]), normal, pared1, techo(1)),
    salida.vertice(p0[0], p0[1], Math.max(arriba[0], abajo[0]), normal, pared0, techo(1)),
  ]
  // un paño en cuña (sin altura en una punta) es un solo triángulo; con pretil, el shader le da altura a las dos
  if (pretil || arriba[1] - abajo[1] >= 1e-4) salida.triangulo(v[0], v[1], v[2], normal)
  if (pretil || arriba[0] - abajo[0] >= 1e-4) salida.triangulo(v[0], v[2], v[3], normal)
}

/**
 * El alero: el faldón sigue `vuelo` metros más allá de la pared (a escuadra de ella, en el mismo plano
 * del tejado), con su cara de arriba y la de abajo.
 */
function alero(salida, f, p0, p1, n, vuelo) {
  const normal = normalFaldon(f)
  const largo = largoFaldon(f) + vuelo * Math.hypot(1, f.tan)
  const afuera = (p) => [p[0] + n[0] * vuelo, p[1] + n[1] * vuelo]
  const puntos = [p0, p1, afuera(p1), afuera(p0)]
  for (const [cara, cubierta] of [[normal, f.cubierta + CUBIERTA.VOLADA], [ABAJO, CUBIERTA.ALERO]]) {
    const v = puntos.map(([u, w]) => salida.vertice(u, w, alturaDe(f, u, w), cara, [0, 0, 0], [...coordsFaldon(f, u, w), largo, cubierta]))
    salida.triangulo(v[0], v[1], v[2], cara)
    salida.triangulo(v[0], v[2], v[3], cara)
  }
}

/** Dónde parten un segmento los bordes de los faldones: [0, …, 1]. */
function partes(a, b, plan) {
  const ts = [0, 1]
  for (const f of plan.faldones) ts.push(...cruces(a, b, f.region))
  ts.sort((x, y) => x - y)
  return ts.filter((t, k) => k === 0 || t - ts[k - 1] > 1e-6)
}

/** Las paredes de afuera: cada lado de la huella sube hasta su faldón (o su pretil, o su tapia). */
function paredes(casa, salida) {
  const { anillo } = casa
  const signo = areaConSigno(anillo) > 0 ? 1 : -1
  anillo.forEach((a, k) => {
    const b = anillo[(k + 1) % anillo.length]
    const largo = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (largo < 1e-6) return
    const n = [((b[1] - a[1]) / largo) * signo, (-(b[0] - a[0]) / largo) * signo]
    const aLaCalle = daALaCalle(costado(n), casa.libres)
    const ts = partes(a, b, casa.plan)
    for (let i = 0; i + 1 < ts.length; i++) tramoDePared({ casa, a, b, largo, n, aLaCalle }, ts[i], ts[i + 1], salida)
  })
}

function tramoDePared({ casa, a, b, largo, n, aLaCalle }, t0, t1, salida) {
  const { plan } = casa
  const [p0, p1] = [mezcla(a, b, t0), mezcla(a, b, t1)]
  const f = faldonDe(plan, mezcla(p0, p1, 0.5))
  const techo = f ? [alturaDe(f, ...p0), alturaDe(f, ...p1)] : [plan.alto, plan.alto]
  // el pretil de la azotea o la tapia del patio van hechos; el de la fachada lo sube el shader en su época
  const arriba = f?.borde ? techo.map((h) => h + f.borde) : techo
  // (un hastial que da a la calle no lleva pretil: sube liso hasta la cumbrera)
  const esHastial = Math.max(techo[0], techo[1]) > plan.alto + SUBIDA_DE_HASTIAL_M
  const pretil = !f?.borde && aLaCalle && plan.pretil > 0 && !esHastial ? plan.pretil : 0
  const bajo = Math.min(arriba[0], arriba[1])
  const conVanos = !f?.hueco && bajo >= ALTO_MINIMO_CON_VANOS_M
  const altoPiso = aLaCalle || bajo >= plan.alto ? plan.altoPiso : bajo / plan.pisos
  const pared = (t) => [t * largo, conVanos ? largo : 0, altoPiso]
  const lisa = [0, 0, plan.altoPiso]
  muro(salida, p0, p1, [0, 0], arriba, n, pared(t0), pared(t1), pretil ? [0, pretil] : null)
  // la cara de adentro de lo que sobresale del tejado (pretil, tapia)
  if (pretil) muro(salida, p0, p1, techo, techo, [-n[0], -n[1]], lisa, lisa, [0, pretil])
  else if (arriba[0] > techo[0] + 1e-4 || arriba[1] > techo[1] + 1e-4) muro(salida, p0, p1, techo, arriba, [-n[0], -n[1]], lisa, lisa)
  const vuelo = f && aLaCalle ? vueloDe(casa, f) : 0
  if (vuelo > 0 && f.caida[0] * n[0] + f.caida[1] * n[1] > HACIA_AFUERA) alero(salida, f, p0, p1, n, vuelo)
}

/**
 * Los escalones: donde un faldón queda más alto que su vecino (la crujía sobre el ala, el ala sobre el
 * patio), la pared que baja del uno al otro. Las que dan al patio llevan sus vanos.
 */
function escalones({ anillo, plan }, salida) {
  for (const f of plan.faldones) {
    if (f.hueco) continue
    const giro = areaConSigno(f.region) > 0 ? 1 : -1
    f.region.forEach((p, k) => {
      const q = f.region[(k + 1) % f.region.length]
      const largo = Math.hypot(q[0] - p[0], q[1] - p[1])
      if (largo < 1e-6) return
      const n = [((q[1] - p[1]) / largo) * giro, (-(q[0] - p[0]) / largo) * giro] // hacia afuera del faldón
      const ts = [0, 1, ...cruces(p, q, anillo)]
      for (const g of plan.faldones) if (g !== f) ts.push(...cruces(p, q, g.region))
      ts.sort((x, y) => x - y)
      for (let i = 0; i + 1 < ts.length; i++) {
        if (ts[i + 1] - ts[i] > 1e-6) escalon({ anillo, plan, f, n }, mezcla(p, q, ts[i]), mezcla(p, q, ts[i + 1]), salida)
      }
    })
  }
}

function escalon({ anillo, plan, f, n }, p0, p1, salida) {
  const medio = mezcla(p0, p1, 0.5)
  if (!estaDentro(anillo, medio[0], medio[1])) return
  const vecino = faldonEn(plan, medio[0] + n[0] * 1e-3, medio[1] + n[1] * 1e-3)
  if (!vecino || vecino === f) return
  const arriba = [alturaDe(f, ...p0), alturaDe(f, ...p1)]
  const abajo = [Math.min(alturaDe(vecino, ...p0), arriba[0]), Math.min(alturaDe(vecino, ...p1), arriba[1])]
  if (arriba[0] - abajo[0] < ESCALON_MINIMO_M && arriba[1] - abajo[1] < ESCALON_MINIMO_M) return
  const largo = Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
  const bajo = Math.min(arriba[0], arriba[1])
  const conVanos = Boolean(vecino.hueco) && bajo >= ALTO_MINIMO_CON_VANOS_M
  const altoPiso = Math.min(bajo / plan.pisos, plan.altoPiso)
  muro(salida, p0, p1, abajo, arriba, n, [0, conVanos ? largo : 0, altoPiso], [largo, conVanos ? largo : 0, altoPiso])
}

/**
 * Levanta una casa. `anillo`: su huella en el marco del lote; `plan`: planDeTecho(); `libres`: qué
 * costados dan a la calle además del frente ({ izq, der, fondo }).
 */
export function alzarCasa({ anillo, plan, libres = {} }, salida) {
  const casa = { anillo, plan, libres }
  tejados(casa, salida)
  paredes(casa, salida)
  escalones(casa, salida)
}
