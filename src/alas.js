/**
 * Casas de patio: el techo de una casa a partir de sus alas (tools/geo/alas.py → ciudad.pak: marcos y
 * alas, specs/02). Como en la vista aérea del pueblo colonial (fuentes/imagenes/README.md): una crujía a
 * dos aguas sobre la calle, con la cumbrera paralela a ella; detrás, alas cruzadas a dos aguas (también
 * paralelas a la calle) y alas laterales a media agua que caen al patio, alrededor de uno, dos o tres
 * patios, y el solar al fondo. En una esquina, el ala de la otra calle se une a la crujía a inglete:
 * limatesa por fuera y limahoya por dentro.
 *
 * El plan que sale es el mismo de src/techos.js (faldones convexos con su plano; patios y solar como
 * huecos), en el marco del lote que trae el dato: lo levanta src/alzado.js. Las alas que tocan el borde
 * del lote se estiran hacia afuera, para cubrir los salientes de la huella que el rectángulo no abarca.
 */
import { CUBIERTA, ESTILOS_DE_PATIO, PRETIL_M, altoDePiso, azar, cubiertaDe } from './techos.js'

/** Tipos de ala (tools/geo/alas.py). */
export const ALA = Object.freeze({ PATIO: 0, SOLAR: 1, FRENTE: 2, CRUZADA: 3, LATERAL_IZQ: 4, LATERAL_DER: 5, ESQUINA_IZQ: 6, ESQUINA_DER: 7, FONDO: 8 })
/** Qué otros lados del lote dan a una calle (bits de `calles`). */
export const CALLE = Object.freeze({ DER: 1, FONDO: 2, IZQ: 4 })
export const CAMPOS_MARCO = 11
export const CAMPOS_ALA = 5

const COLONIAL = 0, ORILLAS = 7
const MARGEN_M = 40 // cuánto se estiran hacia afuera las alas del borde del lote
const TAPIA_M = 2.6
const TAPIA_SOLAR_M = 1.2 // entre los solares del fondo, una cerca baja: el centro de la cuadra se ve abierto
const ALTO_MINIMO_ALA_M = 2.3 // bajo el alero de un ala hay un corredor
const BAJA_EL_INTERIOR_M = 0.5 // las alas de adentro arrancan más abajo que la crujía de la calle
const SUBIDA_CRUJIA_M = 2.8
const SUBIDA_ALA_M = 1.5
const TAN_ALA = 0.38
const EPS = 1e-3

/**
 * Los marcos del pak, por número de techo: { origen [x, z], eu, ev (en el mundo), ancho, fondo, crujia (m),
 * calles { izq, der, fondo }, alas [{ tipo, u0, v0, u1, v1 } en metros; ninguna si la casa es simple] }. Sin marcos (datos viejos), un mapa vacío.
 */
export function leerMarcos({ marcos = null, alas = null }, coords) {
  const mapa = new Map()
  if (!marcos || !alas) return mapa
  if (marcos.length % CAMPOS_MARCO !== 0 || alas.length % CAMPOS_ALA !== 0) throw new Error('ciudad: los marcos o las alas vienen truncados')
  const cero = coords.aMundo(0, 0)
  const metro = coords.aMundo(1, 0).x - cero.x
  for (let k = 0; k < marcos.length; k += CAMPOS_MARCO) {
    const [techo, ox, oy, eux, euy, ancho, fondo, calles, crujia, primera, cuantas] = marcos.subarray(k, k + CAMPOS_MARCO)
    if ((primera + cuantas) * CAMPOS_ALA > alas.length) throw new Error(`ciudad: el marco del techo ${techo} apunta fuera de las alas`)
    const { x, z } = coords.aMundo(ox, oy)
    const lista = []
    for (let a = primera * CAMPOS_ALA; a < (primera + cuantas) * CAMPOS_ALA; a += CAMPOS_ALA) {
      lista.push({ tipo: alas[a], u0: alas[a + 1] * metro, v0: alas[a + 2] * metro, u1: alas[a + 3] * metro, v1: alas[a + 4] * metro })
    }
    mapa.set(techo, {
      origen: [x, z], eu: [eux, euy], ev: [-euy, eux], ancho: ancho * metro, fondo: fondo * metro, crujia: crujia * metro,
      calles: { izq: Boolean(calles & CALLE.IZQ), der: Boolean(calles & CALLE.DER), fondo: Boolean(calles & CALLE.FONDO) }, alas: lista,
    })
  }
  return mapa
}

/** ¿La casa de ese estilo, en esa época, es de patio? (teja y fachada colonial, republicana, guzmancista o de orillas) */
export const esDePatio = (estilo, semilla, epoca) => ESTILOS_DE_PATIO.includes(estilo) && cubiertaDe(estilo, semilla, epoca) === CUBIERTA.TEJA

const caja = ({ u0, u1, v0, v1 }) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]
// `base` es la región sin estirar: de ahí sale el largo del faldón (src/alzado.js)
const faldon = (region, base, cubierta, cumbre, origen, caida, tan, extra = {}) => ({ region, base, cubierta, cumbre, origen, caida, tan, borde: 0, ...extra })
const hueco = (a, e, piso) => faldon(caja(e), caja(a), CUBIERTA.PARED, 0, [a.u0, a.v0], [0, 0], 0, {
  borde: piso === CUBIERTA.SOLAR ? TAPIA_SOLAR_M : TAPIA_M, hueco: true, piso,
})

/** Dos aguas con la cumbrera a lo largo de u (paralela a la calle), en el medio del ala. */
function dosAguas(a, e, alero, tan, cubierta) {
  const vm = (a.v0 + a.v1) / 2
  const cumbre = alero + (vm - a.v0) * tan
  return [
    faldon(caja({ ...e, v1: vm }), caja({ ...a, v1: vm }), cubierta, cumbre, [a.u0, vm], [0, -1], tan),
    faldon(caja({ ...e, v0: vm }), caja({ ...a, v0: vm }), cubierta, cumbre, [a.u0, vm], [0, 1], tan),
  ]
}

/** Media agua: un plano que baja desde `alto`, en el borde de arriba, en el sentido `hacia`. */
function mediaAgua(a, e, alto, hacia, cubierta) {
  const ancho = hacia[0] !== 0 ? a.u1 - a.u0 : a.v1 - a.v0
  const tan = Math.max(0.05, Math.min(TAN_ALA, (alto - ALTO_MINIMO_ALA_M) / ancho))
  const origen = [hacia[0] < 0 ? a.u1 : a.u0, hacia[1] < 0 ? a.v1 : a.v0]
  return faldon(caja(e), caja(a), cubierta, alto, origen, hacia, tan)
}

/**
 * La crujía del frente y, en una esquina, el ala de la otra calle: dos aguas del mismo ancho unidas a
 * inglete (la limatesa sale por la diagonal de la esquina; la limahoya, por la de adentro).
 */
function frenteYEsquinas({ frente, izq, der, L, D, alto, tan, cubierta }) {
  const [c, M] = [frente.v1, MARGEN_M]
  const h = c / 2
  const cumbre = alto + h * tan
  const I = izq ? { afuera: [-M, -M], cumbrera: [h, h], adentro: [c, c] } : { afuera: [-M, -M], cumbrera: [-M, h], adentro: [-M, c] }
  const R = der ? { afuera: [L + M, -M], cumbrera: [L - h, h], adentro: [L - c, c] } : { afuera: [L + M, -M], cumbrera: [L + M, h], adentro: [L + M, c] }
  const lista = [
    faldon([I.afuera, R.afuera, R.cumbrera, I.cumbrera], caja({ u0: 0, u1: L, v0: 0, v1: h }), cubierta, cumbre, [0, h], [0, -1], tan),
    faldon([I.cumbrera, R.cumbrera, R.adentro, I.adentro], caja({ u0: 0, u1: L, v0: h, v1: c }), cubierta, cumbre, [0, h], [0, 1], tan),
  ]
  const hasta = (a) => (a.v1 >= D - EPS ? D + M : a.v1)
  if (izq) {
    const v1 = hasta(izq)
    lista.push(
      faldon([[-M, -M], [h, h], [h, v1], [-M, v1]], caja({ u0: 0, u1: h, v0: 0, v1: izq.v1 }), cubierta, cumbre, [h, c], [-1, 0], tan),
      faldon([[h, h], [c, c], [c, v1], [h, v1]], caja({ u0: h, u1: c, v0: h, v1: izq.v1 }), cubierta, cumbre, [h, c], [1, 0], tan),
    )
  }
  if (der) {
    const v1 = hasta(der)
    lista.push(
      faldon([[L + M, -M], [L + M, v1], [L - h, v1], [L - h, h]], caja({ u0: L - h, u1: L, v0: 0, v1: der.v1 }), cubierta, cumbre, [L - h, c], [1, 0], tan),
      faldon([[L - h, h], [L - h, v1], [L - c, v1], [L - c, c]], caja({ u0: L - c, u1: L - h, v0: h, v1: der.v1 }), cubierta, cumbre, [L - h, c], [-1, 0], tan),
    )
  }
  return lista
}

/**
 * El plan del techo de una casa de patio (o de una de sus etapas), en el marco de su lote. `alas`: las
 * del dato, en metros. Devuelve lo mismo que planDeTecho (src/techos.js): medidas y faldones.
 */
export function planDeAlas({
  ancho: L, fondo: D, alas, estilo, pisos, semilla, nace = 5, conAlero = estilo === COLONIAL || estilo === ORILLAS, conPretil = !conAlero,
}) {
  const altoPiso = altoDePiso(estilo, semilla)
  const alto = pisos * altoPiso
  const cubierta = cubiertaDe(estilo, semilla, nace)
  const tan = Math.tan(((25 + 5 * azar(semilla, 11)) * Math.PI) / 180)
  // las alas de adentro son de un piso y arrancan algo más abajo que la crujía: sus tejados se meten bajo su alero
  const bajo = Math.max(altoPiso - BAJA_EL_INTERIOR_M, ALTO_MINIMO_ALA_M + 0.6)
  const estirada = (a) => ({
    u0: a.u0 <= EPS ? -MARGEN_M : a.u0, u1: a.u1 >= L - EPS ? L + MARGEN_M : a.u1,
    v0: a.v0 <= EPS ? -MARGEN_M : a.v0, v1: a.v1 >= D - EPS ? D + MARGEN_M : a.v1,
  })
  const de = (tipo) => alas.find((a) => a.tipo === tipo)
  const frente = de(ALA.FRENTE)
  if (!frente) throw new Error('alas: la casa no trae la crujía del frente')
  const tanFrente = Math.min(tan, SUBIDA_CRUJIA_M / (frente.v1 / 2))
  const faldones = frenteYEsquinas({ frente, izq: de(ALA.ESQUINA_IZQ), der: de(ALA.ESQUINA_DER), L, D, alto, tan: tanFrente, cubierta })
  for (const a of alas) {
    const e = estirada(a)
    if (a.tipo === ALA.PATIO) faldones.push(hueco(a, e, CUBIERTA.PATIO))
    else if (a.tipo === ALA.SOLAR) faldones.push(hueco(a, e, CUBIERTA.SOLAR))
    else if (a.tipo === ALA.CRUZADA) faldones.push(...dosAguas(a, e, bajo, Math.min(tan, SUBIDA_ALA_M / ((a.v1 - a.v0) / 2)), cubierta))
    else if (a.tipo === ALA.LATERAL_IZQ) faldones.push(mediaAgua(a, e, bajo, [1, 0], cubierta))
    else if (a.tipo === ALA.LATERAL_DER) faldones.push(mediaAgua(a, e, bajo, [-1, 0], cubierta))
    else if (a.tipo === ALA.FONDO) faldones.push(mediaAgua(a, e, bajo, [0, -1], cubierta))
  }
  return {
    ancho: L, fondo: D, alto, altoPiso, pisos, alero: conAlero ? 0.5 + 0.3 * azar(semilla, 9) : 0, pretil: conPretil ? PRETIL_M : 0, faldones,
  }
}
