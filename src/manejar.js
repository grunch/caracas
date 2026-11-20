/**
 * Manejar (T62): la flota de cada época y la cuenta del manejo, sin DOM, three.js ni WebAudio (el modo está en
 * src/manejar-modo.js). Mundo en metros con la plaza en el origen; rumbo 0 apunta hacia −z y crece a la derecha.
 *
 * La flota sale de specs/06 (burro y carreta, coche de caballos, Ford T, Ford V8; «verificar la flota real con
 * fotos») y de las imágenes de fuentes/imagenes (coches de caballos en las fotos del XIX). Los nombres son
 * genéricos a propósito: no se afirma qué modelo exacto circulaba. El tranvía no está: va por sus rieles.
 */

export const VEHICULOS = Object.freeze([
  { id: 'carreta', nombre: 'Carreta de bueyes', desde: 1, maxima: 2, aceleracion: 0.6, traccion: 'animal', largo: 4, ancho: 1.8 },
  { id: 'coche-de-caballos', nombre: 'Coche de caballos', desde: 2, maxima: 5, aceleracion: 1.5, traccion: 'animal', largo: 5, ancho: 1.8 },
  { id: 'ford-t', nombre: 'Ford T', desde: 4, maxima: 12, aceleracion: 2, traccion: 'motor', largo: 3.4, ancho: 1.7 },
  { id: 'ford-v8', nombre: 'Ford V8', desde: 5, maxima: 20, aceleracion: 3, traccion: 'motor', largo: 4.3, ancho: 1.8 },
].map(Object.freeze))

const ROCE = 1.2 // m/s² que pierde sin acelerar
const FRENO = 4 // m/s² al frenar con S
const ATRAS = 0.4 // de la máxima, marcha atrás
const GIRO = 0.12 // rad por metro recorrido, a fondo
const HOLGURA_M = 0.2 // de cada costado: con el V8 (1,8 m) deja el mismo radio de 1,1 m que antes
const TRAMO_M = 0.5 // de a cuánto se mira el camino: menos que la casa más angosta (src/animar.js deja pasos de 1 s)
const IZQUIERDA = new Set(['KeyA', 'ArrowLeft'])
const DERECHA = new Set(['KeyD', 'ArrowRight'])
const ACELERA = new Set(['KeyW', 'ArrowUp'])
const FRENA = new Set(['KeyS', 'ArrowDown'])

/** Los que ya existían en la época `e` (99, sin línea de tiempo: todos). */
const enEpoca = (e) => VEHICULOS.filter((v) => v.desde <= e)

/** El vehículo de la época: el más nuevo que ya existía (o el primero, si ninguno). */
export const vehiculoDeEpoca = (e) => enEpoca(e).at(-1) ?? VEHICULOS[0]

/** «Otro coche» (N): el siguiente de los que ya existían en la época, y vuelta al primero. */
export function otroVehiculo(id, e) {
  const posibles = enEpoca(e)
  if (!posibles.length) return VEHICULOS[0]
  return posibles[(posibles.findIndex((v) => v.id === id) + 1) % posibles.length]
}

const acotar = (v, a, b) => Math.min(b, Math.max(a, v))

/**
 * La huella del vehículo `v` → `(x, z, rumbo) => choca`: círculos de medio ancho (más HOLGURA_M) sobre su eje, de
 * la cola al frente, separados a lo sumo un radio (con el V8: cola, centro y frente). Cubren el largo entero (una
 * cápsula: las esquinas quedan redondeadas) y de costado ocupa lo mismo que un círculo, así que pasa por las
 * mismas calles. `chocaCirculo(x, z, radio)` es la consulta a las casas (src/a-pie.js).
 */
export function chocaVehiculo(v, chocaCirculo) {
  const radio = v.ancho / 2 + HOLGURA_M
  const mitad = Math.max(0, v.largo / 2 - radio)
  const tramos = Math.ceil((2 * mitad) / radio)
  const ejes = tramos ? Array.from({ length: tramos + 1 }, (_, k) => -mitad + (2 * mitad * k) / tramos) : [0]
  return (x, z, rumbo) => {
    const [sen, cos] = [Math.sin(rumbo), Math.cos(rumbo)]
    return ejes.some((d) => chocaCirculo(x + sen * d, z - cos * d, radio))
  }
}

/** S: frena hasta 0 y, en lo que resta del paso, retrocede con la aceleración del vehículo. */
function frenarOAtras(velocidad, fuerza, dt, v) {
  if (velocidad <= 0) return velocidad - v.aceleracion * fuerza * dt
  const hastaParar = velocidad / (FRENO * fuerza)
  if (hastaParar >= dt) return velocidad - FRENO * fuerza * dt
  return -v.aceleracion * fuerza * (dt - hastaParar)
}

/**
 * Un cuadro: `entrada` { acelera (−1…1: S frena y luego retrocede), girar (−1…1) } durante `dt` s con el
 * vehículo `v`. Gira en proporción a lo que avanza (quieto no gira). El camino se mira de a TRAMO_M, no solo el
 * destino: si choca en el camino, se detiene en el último tramo libre (un paso largo no atraviesa una casa).
 * `choca(x, z, rumbo)`: la huella del vehículo en ese punto (chocaVehiculo).
 */
export function pasoEnCoche(coche, { acelera = 0, girar = 0 }, dt, v, { choca }) {
  let velocidad = coche.velocidad
  if (acelera > 0) velocidad += v.aceleracion * acelera * dt
  else if (acelera < 0) velocidad = frenarOAtras(velocidad, -acelera, dt, v)
  else velocidad -= Math.sign(velocidad) * Math.min(Math.abs(velocidad), ROCE * dt)
  velocidad = acotar(velocidad, -v.maxima * ATRAS, v.maxima)
  const avance = velocidad * dt
  const rumbo = coche.rumbo + girar * GIRO * avance
  const tramos = Math.ceil(Math.abs(avance) / TRAMO_M)
  let libre = { x: coche.x, z: coche.z }
  for (let k = 1; k <= tramos; k++) {
    const d = (avance * k) / tramos
    const punto = { x: coche.x + Math.sin(rumbo) * d, z: coche.z - Math.cos(rumbo) * d }
    if (choca(punto.x, punto.z, rumbo)) return { ...coche, ...libre, rumbo: k > 1 ? rumbo : coche.rumbo, velocidad: 0 }
    libre = punto
  }
  return { ...coche, ...libre, rumbo, velocidad }
}

/** Las teclas → { acelera, girar }: W/↑ acelera, S/↓ frena o retrocede, A/D o ←/→ giran. */
export function entradaDeManejo(apretadas) {
  const hay = (grupo) => [...grupo].some((c) => apretadas.has(c))
  return { acelera: (hay(ACELERA) ? 1 : 0) - (hay(FRENA) ? 1 : 0), girar: (hay(DERECHA) ? 1 : 0) - (hay(IZQUIERDA) ? 1 : 0) }
}

/** La cámara: 'afuera' (detrás y arriba) o 'cabina' (a la altura del conductor, mirando adelante). */
export function camaraDeCoche({ x, z, rumbo }, vista, suelo) {
  const [sen, cos] = [Math.sin(rumbo), Math.cos(rumbo)]
  const y = suelo(x, z)
  if (vista === 'cabina') {
    return { ojo: { x, y: y + 1.7, z }, mira: { x: x + sen * 10, y: y + 1.5, z: z - cos * 10 } }
  }
  return { ojo: { x: x - sen * 12, y: y + 5, z: z + cos * 12 }, mira: { x, y: y + 1.2, z } }
}

/**
 * Lo que suena a cierta velocidad (m/s): un motor, su frecuencia (ralentí → más agudo); los de tiro, cuántos
 * cascos por segundo (ninguno quieto). La síntesis está en src/manejar-modo.js (WebAudio, sin archivos).
 */
export function sonidoDe(v, velocidad) {
  const r = Math.abs(velocidad) / v.maxima
  if (v.traccion === 'motor') return { frecuencia: 38 + 90 * r, ganancia: 0.05 + 0.07 * r }
  return { cascosPorSegundo: r === 0 ? 0 : 1.5 + 4.5 * r, ganancia: 0.12 }
}
