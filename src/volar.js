/**
 * En avión (T61): la cuenta del vuelo, sin DOM ni three.js (el modo está en src/volar-modo.js). Mundo en metros
 * con la plaza en el origen; rumbo 0 apunta hacia −z (el norte del plano) y crece hacia la derecha.
 */

export const VELOCIDAD = Object.freeze({ crucero: 60, rapido: 160 }) // m/s: una avioneta, y apurada
export const ALTURA = Object.freeze({ inicial: 300, minima: 40, techo: 2500 }) // m: sobre el suelo / sobre el mar
const GIRO_RAD_S = 0.6
const SUBIDA_M_S = 40
const ALABEO_MAX = 0.6
const ALABEO_SUAVE = 3 // 1/s: cuánto tarda en inclinarse o enderezarse
const LEJOS_M = 3000
const DETRAS_M = 70
const ARRIBA_M = 22
const IZQUIERDA = new Set(['KeyA', 'ArrowLeft'])
const DERECHA = new Set(['KeyD', 'ArrowRight'])
const SUBE = new Set(['KeyW', 'ArrowUp'])
const BAJA = new Set(['KeyS', 'ArrowDown'])
const ACELERA = new Set(['ShiftLeft', 'ShiftRight'])

const acotar = (v, a, b) => Math.min(b, Math.max(a, v))

/**
 * Un cuadro de vuelo: `entrada` { girar, subir (−1…1), acelera } durante `dt` s. Nunca baja de ALTURA.minima
 * sobre el suelo (`suelo(x, z)`) ni sube del techo, y no sale de la hoja. → un estado nuevo.
 */
export function pasoEnAvion(avion, { girar = 0, subir = 0, acelera = false }, dt, { suelo, hoja }) {
  const rumbo = avion.rumbo + girar * GIRO_RAD_S * dt
  const alabeo = avion.alabeo + (girar * ALABEO_MAX - avion.alabeo) * Math.min(1, ALABEO_SUAVE * dt)
  const v = (acelera ? VELOCIDAD.rapido : VELOCIDAD.crucero) * dt
  const x = acotar(avion.x + Math.sin(rumbo) * v, hoja.x0, hoja.x0 + hoja.ancho)
  const z = acotar(avion.z - Math.cos(rumbo) * v, hoja.z0, hoja.z0 + hoja.alto)
  const y = acotar(avion.y + subir * SUBIDA_M_S * dt, suelo(x, z) + ALTURA.minima, ALTURA.techo)
  return { ...avion, x, y, z, rumbo, alabeo }
}

/** Las teclas apretadas → { girar, subir, acelera }: A/D o ←/→ giran, W/S o ↑/↓ suben y bajan, Mayús acelera. */
export function entradaDeVuelo(apretadas) {
  const hay = (grupo) => [...grupo].some((c) => apretadas.has(c))
  return {
    girar: (hay(DERECHA) ? 1 : 0) - (hay(IZQUIERDA) ? 1 : 0),
    subir: (hay(SUBE) ? 1 : 0) - (hay(BAJA) ? 1 : 0),
    acelera: hay(ACELERA),
  }
}

/** Dónde arranca: sobre donde mira la vista (o la plaza, si está lejos), a ALTURA.inicial, de frente como el mapa. */
export function despegue({ x, z, dist, yaw }, suelo) {
  const [px, pz] = dist > LEJOS_M ? [0, 0] : [x, z]
  return { x: px, y: suelo(px, pz) + ALTURA.inicial, z: pz, rumbo: -yaw, alabeo: 0 }
}

/** La cámara de tercera persona: detrás y un poco arriba del avión, mirándolo. */
export function camaraDetras({ x, y, z, rumbo }) {
  return {
    ojo: { x: x - Math.sin(rumbo) * DETRAS_M, y: y + ARRIBA_M, z: z + Math.cos(rumbo) * DETRAS_M },
    mira: { x, y, z },
  }
}
