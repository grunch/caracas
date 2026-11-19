/**
 * Los tipos de parte de un hito: cada definición (src/hitos/datos/*.js) lista `partes` con un `tipo`, y acá
 * está quién la dibuja. Una parte recibe el pintor del hito ya con su vida (nace, muere) y sus medidas en
 * metros, en el marco del hito: a a lo largo del eje, b a su derecha.
 */
import { miraflores } from './miraflores.js'
import { MAT } from './lienzo.js'
import { TONO, losa, zocalo, verja, escalinata, cuerpo } from './piezas.js'
import { farol, estatuaEcuestre, puesto, tramoDeGaleria, portada } from './objetos.js'
import { torre, fachadaBarroca, portadaLateral, cupulaConTambor, ventanas, iglesia } from './iglesias.js'
import { palacio, portico, remateConEscudo, frenteNeogotico } from './palacios.js'

const ALTO_LOSA_M = 0.25
const MARGEN_TOLDO_M = 0.7 // lo que un toldo pasa de su largo: el alero y el giro
/** Los pisos de una terraza: material y parámetros del dibujo (van en el color del vértice). */
const PISOS = Object.freeze({ tierra: [MAT.TIERRA, 0], jardin: [MAT.JARDIN, 0], damero: [MAT.JARDIN, 1] })

/** Generador determinista (mulberry32): los puestos del mercado caen siempre en el mismo lugar. */
export function azarDe(semilla) {
  let s = semilla >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Reparte un lado [desde, hasta] en tramos sin los huecos [centro, ancho]: devuelve [[inicio, fin]…]. */
export function tramosSinHuecos(desde, hasta, huecos = []) {
  const cortes = huecos.map(([c, w]) => [c - w / 2, c + w / 2]).sort((x, y) => x[0] - y[0])
  const tramos = []
  let cursor = desde
  for (const [h0, h1] of cortes) {
    if (h0 > cursor) tramos.push([cursor, Math.min(h0, hasta)])
    cursor = Math.max(cursor, h1)
  }
  if (cursor < hasta) tramos.push([cursor, hasta])
  return tramos.filter(([x, y]) => y - x > 1e-6)
}

/** Los cuatro lados de un rectángulo centrado: [nombre, centro (a, b), dirección del lado, hacia afuera, largo]. */
const ladosDe = (ancho, fondo) => [
  ['norte', [0, -fondo / 2], [1, 0], [0, -1], ancho], ['sur', [0, fondo / 2], [1, 0], [0, 1], ancho],
  ['oeste', [-ancho / 2, 0], [0, 1], [-1, 0], fondo], ['este', [ancho / 2, 0], [0, 1], [1, 0], fondo],
]

/** El pintor en (a, b) mirando hacia `mira` = [da, db] (por omisión, hacia +b). */
const frente = (p, { a = 0, b = 0, h = 0, mira = [0, 1] }) => p.mirando(a, h, b, mira[0], mira[1])

/** El constructor de un tipo de parte, o undefined: solo los registrados (no lo heredado de Object, como 'constructor'). */
export const parteDe = (tipo) => (Object.hasOwn(PARTES, tipo) ? PARTES[tipo] : undefined)

export const PARTES = Object.freeze({
  miraflores(p) { miraflores(p) },
  /** Un cuerpo de edificio centrado en (a, b): paredes, tejado y, si se piden, ventanas altas en los dos largos. */
  cuerpo(p, { a = 0, b = 0, giro = 0, ventanas: v = null, ...medidas }) {
    const q = p.en(a, 0, b, giro)
    cuerpo(q, medidas)
    if (v) for (const s of [-1, 1]) ventanas(q.mirando(0, 0, (s * medidas.ancho) / 2, 0, s), { largo: medidas.largo * 0.86, ...v })
  },

  /** Torre de cuerpos apilados con su remate, con el centro en (a, b). */
  torre(p, { a = 0, b = 0, ...medidas }) { torre(p.en(a, 0, b), medidas) },

  /** Fachada barroca de columnas pareadas y frontón de volutas, centrada en (a, b) y mirando a `mira`. */
  fachadaBarroca(p, { a, b, mira, ...medidas }) { fachadaBarroca(frente(p, { a, b, mira }), medidas) },

  /** Portada lateral de columnas y frontón sobre un muro. */
  portadaLateral(p, { a, b, mira, ...medidas }) { portadaLateral(frente(p, { a, b, mira }), medidas) },

  /** Hilera de ventanas (con balcón y tejadillo si se pide) sobre un muro. */
  ventanas(p, { a, b, mira, ...medidas }) { ventanas(frente(p, { a, b, mira }), medidas) },

  /** Cúpula sobre tambor, con el arranque a la altura h. */
  cupula(p, { a = 0, b = 0, h = 0, ...medidas }) { cupulaConTambor(p.en(a, h, b), medidas) },

  /** Iglesia paramétrica (nave, fachada, torres, cúpula) en el marco del hito: el origen, al pie de la fachada. */
  iglesia(p, medidas) { iglesia(p, medidas) },

  /** Palacio de crujías alrededor de un patio, centrado en (a, b). */
  palacio(p, { a = 0, b = 0, ...medidas }) { palacio(p.en(a, 0, b), medidas) },

  /** Pórtico de columnas con frontón sobre un frente. */
  portico(p, { a, b, mira, ...medidas }) { portico(frente(p, { a, b, mira }), medidas) },

  /** Remate central con escudo y asta, a la altura h de un frente. */
  remateConEscudo(p, { a, b, h, mira, ...medidas }) { remateConEscudo(frente(p, { a, b, h, mira }), medidas) },

  /** Cuerpo de frente neogótico centrado en (a, b), con el frente hacia `mira`. */
  frenteNeogotico(p, { a, b, mira, ...medidas }) { frenteNeogotico(frente(p, { a, b, mira }), medidas) },

  /**
   * Terraza: una losa que es plana donde el terreno baja y lo sigue donde sube, con su zócalo de piedra.
   * `piso`: 'tierra' (la plaza del mercado), 'jardin' (canteros en X y caminos lisos) o 'damero' (lo mismo
   * con el piso de mosaico de ~1900).
   */
  terraza(p, { ancho, fondo, piso = 'tierra', zocalo: tono = TONO.PIEDRA }) {
    const [mat, variante] = PISOS[piso] ?? (() => { throw new Error(`terraza: piso desconocido "${piso}"`) })()
    const q = p.siguiendo()
    // el dibujo del piso lo hace el shader: el "color" lleva la mitad del ancho, la del fondo y la variante
    losa(q.en(0, ALTO_LOSA_M, 0), { ancho, fondo, mat, color: mat === MAT.JARDIN ? [ancho / 2, fondo / 2, variante] : TONO.TIERRA })
    zocalo(q, { ancho, fondo, alto: ALTO_LOSA_M, color: tono })
  },

  /** Reja perimetral sobre un murete, con `huecos` por lado: { norte: [[centro, ancho]…], sur, este, oeste }. */
  verjaPerimetral(p, { ancho, fondo, alto = 1.25, huecos = {} }) {
    const q = p.siguiendo()
    for (const [nombre, [ca, cb], [da, db], , largo] of ladosDe(ancho, fondo)) {
      for (const [t0, t1] of tramosSinHuecos(-largo / 2, largo / 2, huecos[nombre])) {
        // el paño arranca en t0 y corre a lo largo del lado: su +x es la dirección del lado
        verja(q.mirando(ca + da * t0, ALTO_LOSA_M, cb + db * t0, -db, da), { largo: t1 - t0, alto })
      }
    }
  },

  /** Escalinatas que bajan de la terraza: `en` = [[a, b, hacia a, hacia b, ancho]…]. */
  escalinatas(p, { en, peldaños = 12 }) {
    for (const [a, b, da, db, ancho] of en) {
      escalinata(p.mirando(a, ALTO_LOSA_M, b, da, db).apoyado(), { ancho, peldaños })
    }
  },

  /** Faroles: `puntos` = [[a, b]…]; `brazos` = 0 (de pie) o cuántos brazos. */
  faroles(p, { puntos, brazos = 0 }) {
    for (const [a, b] of puntos) farol(p.en(a, 0, b).apoyado(), { brazos })
  },

  /** Estatua ecuestre en (a, b), con el caballo mirando hacia `mira` = [da, db]. */
  estatuaEcuestre(p, { a = 0, b = 0, mira = [1, 0], ...resto }) {
    // el frente del caballo es +x local: se gira el marco para que +x caiga sobre `mira`
    estatuaEcuestre(p.mirando(a, ALTO_LOSA_M, b, -mira[1], mira[0]).apoyado(), resto)
  },

  /**
   * Las galerías del mercado alrededor de la plaza: en cada lado, portada de esquina · tramos de arcos ·
   * portada del medio · tramos · portada de esquina (grabado de 1852).
   */
  galeriasDeMercado(p, { ancho, fondo, profundidad = 4.2, esquina = 6.4, medio = 8, tramo = 11 }) {
    const borde = profundidad / 2 + 2 // las portadas y sus columnas sobresalen de la galería
    for (const [, [ca, cb], [da, db], [na, nb], largo] of ladosDe(ancho - 2 * borde, fondo - 2 * borde)) {
      const libre = (largo - esquina - medio) / 2 // de la portada de esquina a la del medio
      const n = Math.max(1, Math.round(libre / tramo))
      for (const s of [-1, 1]) {
        for (let i = 0; i < n; i++) {
          const t = s * (medio / 2 + ((i + 0.5) / n) * libre)
          const q = p.mirando(ca + da * t, 0, cb + db * t, -na, -nb).apoyado() // el frente, hacia la plaza
          tramoDeGaleria(q, { largo: libre / n, fondo: profundidad, arcos: Math.max(2, Math.round(libre / n / 2.9)) })
        }
      }
      portada(p.mirando(ca, 0, cb, -na, -nb).apoyado(), { ancho: medio, fondo: profundidad + 0.8 })
    }
    for (const sa of [-1, 1]) {
      for (const sb of [-1, 1]) {
        portada(p.en(sa * (ancho / 2 - borde), 0, sb * (fondo / 2 - borde)).apoyado(), { ancho: esquina, fondo: esquina, alto: 5.8, caras: 4 })
      }
    }
  },

  /** Los puestos del mercado: hileras de toldos de lona a lo largo de a, con huecos y desorden. */
  puestos(p, { ancho, fondo, filas = 6, paso = 4.1, semilla = 1852, falta = 0.14, pasillo = 6 }) {
    if (!(Number.isFinite(paso) && paso > 0)) throw new Error(`puestos: el paso debe ser mayor que cero (vino ${paso})`)
    const azar = azarDe(semilla)
    const porFila = Math.floor(ancho / paso)
    for (let f = 0; f < filas; f++) {
      const b = -fondo / 2 + ((f + 0.5) / filas) * fondo
      for (let k = 0; k < porFila; k++) {
        const a = -ancho / 2 + (k + 0.5) * paso
        const [r1, r2, r3, r4] = [azar(), azar(), azar(), azar()]
        const [donde, largo] = [a + (r2 - 0.5) * 0.8, 3.1 + r2 * 0.9]
        // el pasillo del medio queda libre (el toldo entero, con su alero y su giro, no solo su centro) y algunos faltan
        if (Math.abs(donde) - largo / 2 - MARGEN_TOLDO_M < pasillo / 2 || r1 < falta) continue
        const q = p.en(donde, 0, b + (r3 - 0.5) * 1.2, (r4 - 0.5) * 0.24).apoyado()
        puesto(q, { largo, ancho: 2.5 + r3 * 0.9, alto: 1.9 + r4 * 0.45, lona: r1 > 0.7 ? TONO.CAL_SOMBRA : TONO.LONA })
      }
    }
  },
})
