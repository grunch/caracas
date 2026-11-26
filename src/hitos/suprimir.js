/**
 * Donde hay un hito modelado a mano, la casa genérica que el vectorizador levantó en ese lugar sobra. Acá
 * se decide cuáles: las que pisan la zona de supresión de un hito (polígonos en píxeles del plano). No se
 * borran: se les cambia la vida (src/epocas.js) para que no nazcan mientras el hito esté en pie.
 */
import { ALA, CAMPOS_MARCO, CAMPOS_ALA, esDePatio } from '../alas.js'
import { recortarConvexo, areaConSigno } from '../poligono.js'

const ETAPAS_POR_VIDA = 8 // vida = nace + 8 · muere (ver src/ciudad.js)
// Un intervalo vacío: nace y muere en la época 7, que no existe (hay 6: 0–5). No alcanza con "nace en 7":
// sin línea de tiempo el visor pone la época en 99 (SIN_LINEA_DE_TIEMPO) y esa casa aparecería.
export const NUNCA = 7 + ETAPAS_POR_VIDA * 7

/** ¿Está el punto dentro del polígono [[x, y]…]? (regla par‑impar) */
export function puntoEnPoligono([x, y], poligono) {
  let dentro = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i]
    const [xj, yj] = poligono[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro
  }
  return dentro
}

const centroDe = (poligono) => [0, 1].map((k) => poligono.reduce((s, v) => s + v[k], 0) / poligono.length)
const centroEnAmbos = (p, q) => { const c = centroDe(p); return puntoEnPoligono(c, p) && puntoEnPoligono(c, q) }
const giro = ([ax, ay], [bx, by], [cx, cy]) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
const seCruzan = (a, b, c, d) => giro(a, b, c) * giro(a, b, d) < 0 && giro(c, d, a) * giro(c, d, b) < 0

/** ¿Se pisan dos polígonos simples? (un vértice de uno dentro del otro, o dos lados que se cruzan) */
export function seSolapan(p, q) {
  if (p.some((v) => puntoEnPoligono(v, q)) || q.some((v) => puntoEnPoligono(v, p))) return true
  // calcados uno sobre el otro, los vértices caen en el borde y los lados no se cruzan: decide el centro
  // (solo si el centro es de su polígono: el de una huella cóncava puede caer afuera, sobre un vecino)
  if (centroEnAmbos(p, q) || centroEnAmbos(q, p)) return true
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      if (seCruzan(p[i], p[(i + 1) % p.length], q[j], q[(j + 1) % q.length])) return true
    }
  }
  return false
}

const BORDE = 1e-6
const sobreElBorde = (v, poligono) => poligono.some((a, i) => {
  const b = poligono[(i + 1) % poligono.length]
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
  const largo = dx * dx + dy * dy
  const t = largo ? Math.min(1, Math.max(0, ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / largo)) : 0
  return Math.hypot(v[0] - a[0] - t * dx, v[1] - a[1] - t * dy) <= BORDE
})
const adentroDeVerdad = (v, poligono) => puntoEnPoligono(v, poligono) && !sobreElBorde(v, poligono)

/**
 * ¿Comparten área dos polígonos simples, aunque sean cóncavos? Como seSolapan, pero un vértice sobre el borde
 * del otro no cuenta: la casa que solo toca el recinto por un lado o una esquina no lo pisa.
 */
export function compartenArea(p, q) {
  if (p.some((v) => adentroDeVerdad(v, q)) || q.some((v) => adentroDeVerdad(v, p))) return true
  const centroInterior = (a, b) => { const c = centroDe(a); return adentroDeVerdad(c, a) && adentroDeVerdad(c, b) }
  if (centroInterior(p, q) || centroInterior(q, p)) return true
  const orientacion = Math.sign(areaConSigno(p)) * Math.sign(areaConSigno(q))
  return p.some((a, i) => q.some((c, j) => {
    const b = p[(i + 1) % p.length], d = q[(j + 1) % q.length]
    if (seCruzan(a, b, c, d)) return true
    // Lados colineales con tramo común: hay área sólo si ambos interiores
    // quedan del mismo lado. Funciona también con anillos cóncavos e invertidos.
    const dx = b[0] - a[0], dy = b[1] - a[1], largo = Math.hypot(dx, dy)
    if (largo <= BORDE || Math.abs(giro(a, b, c)) > BORDE * largo || Math.abs(giro(a, b, d)) > BORDE * largo) return false
    const producto = dx * (d[0] - c[0]) + dy * (d[1] - c[1])
    if (producto * orientacion <= 0) return false
    const proyectar = v => ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / largo
    const u = proyectar(c), v = proyectar(d)
    return Math.min(largo, Math.max(u, v)) - Math.max(0, Math.min(u, v)) > BORDE
  }))
}

// Fracción de la huella de una casa que tiene que caer en la zona de un hito para suprimirla: la que apenas la roza
// sigue en pie (si no, el hito deja un vacío artificial alrededor; fase 4 de specs/08, I1772-004).
export const PISA_MINIMO = 0.25

/**
 * ¿Se pisan de verdad la huella (anillo) y la zona (polígono convexo, como las de rectanguloPx)? Lo común tiene que
 * ser al menos PISA_MINIMO del más chico de los dos: una casa que apenas roza un hito grande sigue en pie, y una que
 * contiene un monumento chico se suprime aunque él sea una fracción de su lote.
 */
export function pisaLaZona(anillo, zona) {
  const area = Math.min(Math.abs(areaConSigno(anillo)), Math.abs(areaConSigno(zona)))
  if (area === 0) return seSolapan(anillo, zona)
  const dentro = recortarConvexo(anillo, zona)
  return dentro.length >= 3 && Math.abs(areaConSigno(dentro)) >= PISA_MINIMO * area
}

/** Las zonas de supresión de una lista de hitos: [{ poligono, desde, hasta }] (hasta = 0: para siempre). */
export function zonasDeSupresion(hitos) {
  return hitos.flatMap((h) => (h.suprime ?? []).map((poligono) => ({ poligono, desde: h.nace ?? 0, hasta: h.muere ?? 0, ...(h.solarCompleto ? {solarCompleto:true} : {}) })))
}

/**
 * La vida de cada techo con los hitos puestos: un array nuevo (no toca el original). Al techo que pisa una
 * zona (al menos PISA_MINIMO de su huella: pisaLaZona) se le quitan las épocas en que el hito está en pie
 * (ver vidaSinHito).
 * Sin `vida` (la ciudad de demostración), todos los techos vivían siempre.
 */
export function suprimirTechos({ vertices, techos, vida = null, marcos = null, alas = null, historia = null }, zonas) {
  const n = techos.length / 4
  const salida = vida ? Uint32Array.from(vida) : new Uint32Array(n)
  if (!zonas.length) return salida
  const porTecho = new Map()
  if (marcos && alas) {
    for (let k = 0; k < marcos.length; k += CAMPOS_MARCO) {
      if (marcos[k + 10] > 0) porTecho.set(marcos[k], marcos.subarray(k, k + CAMPOS_MARCO))
    }
  }
  const cajas = zonas.map(({ poligono }) => cajaDe(poligono))
  for (let t = 0; t < n; t++) {
    const [inicio, cuantos] = [techos[t * 4], techos[t * 4 + 1]]
    const anillo = Array.from({ length: cuantos }, (_, k) => [vertices[(inicio + k) * 2], vertices[(inicio + k) * 2 + 1]])
    const caja = cajaDe(anillo)
    let construidas = null
    zonas.forEach(({ poligono, desde, hasta, solarCompleto }, z) => {
      if (!cajasSePisan(caja, cajas[z]) || !(solarCompleto ? compartenArea(anillo, poligono) : pisaLaZona(anillo, poligono))) return
      const marco = porTecho.get(t)
      if (marco && !solarCompleto) {
        construidas ??= huellasConstruidas(anillo, marco, alas)
        if (!construidas.some((huella) => seSolapan(huella, poligono))) {
          // El solar puede quedar bajo el hito sin borrar la fachada. Si una etapa
          // posterior ocupa el lote entero, vuelve a regir la supresión normal.
          for (let e = desde; e < (hasta || 7); e++) {
            const estilo = historia ? historia[t * 6 + Math.min(e, 5)] % 16 : (techos[t * 4 + 2] >> 8) & 255
            if (!esDePatio(estilo, techos[t * 4 + 3], e)) {
              salida[t] = vidaSinHito(salida[t], e, !hasta && e === 6 ? 0 : e + 1)
            }
          }
          return
        }
      }
      salida[t] = vidaSinHito(salida[t], desde, hasta)
    })
  }
  return salida
}

/** Solo las alas techadas, recortadas con la huella como en el alzado del visor. */
function huellasConstruidas(anillo, marco, alas) {
  const [, ox, oy, eux, euy, ancho, fondo, , , primera, cuantas] = marco
  const local = anillo.map(([x,y]) => [(x - ox) * eux + (y - oy) * euy, -(x - ox) * euy + (y - oy) * eux])
  const us = local.map((p) => p[0]), vs = local.map((p) => p[1])
  const [uMin, uMax, vMin, vMax] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)]
  const construidas = []
  for (let k = primera * CAMPOS_ALA; k < (primera + cuantas) * CAMPOS_ALA; k += CAMPOS_ALA) {
    let [tipo, u0, v0, u1, v1] = alas.subarray(k, k + CAMPOS_ALA)
    if (tipo === ALA.SOLAR || tipo === ALA.PATIO) continue
    // El alzado estira las alas del borde hasta la huella real del lote.
    if (u0 <= .04) u0 = Math.min(u0, uMin)
    if (v0 <= .04) v0 = Math.min(v0, vMin)
    if (u1 >= ancho - .04) u1 = Math.max(u1, uMax)
    if (v1 >= fondo - .04) v1 = Math.max(v1, vMax)
    const recorte = recortarConvexo(local, [[u0,v0],[u1,v0],[u1,v1],[u0,v1]])
    if (recorte.length < 3 || Math.abs(areaConSigno(recorte)) < 1e-8) continue
    construidas.push(recorte.map(([u,v]) => [ox + u * eux - v * euy, oy + u * euy + v * eux]))
  }
  return construidas
}

/**
 * La vida de una casa [nace, muere) menos las épocas [desde, hasta) de un hito (0 = sin fin). Si le queda
 * un rato antes del hito, vive ese (la casa que el hito reemplazó); si no, el de después; si no, nunca.
 */
export function vidaSinHito(vida, desde, hasta) {
  const [nace, muere] = [vida % ETAPAS_POR_VIDA, Math.floor(vida / ETAPAS_POR_VIDA)]
  const fin = muere > 0 ? muere : Infinity
  if (nace < desde) return nace + ETAPAS_POR_VIDA * Math.min(fin, desde)
  const despues = hasta > 0 ? Math.max(nace, hasta) : Infinity
  return despues < fin ? despues + ETAPAS_POR_VIDA * muere : NUNCA
}

function cajaDe(poligono) {
  const xs = poligono.map((v) => v[0])
  const ys = poligono.map((v) => v[1])
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

const cajasSePisan = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]
