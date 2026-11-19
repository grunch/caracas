/**
 * La luz de la escena, en números (sin three.js): hacia dónde está el sol, qué parte del suelo ve la
 * cámara y qué caja tiene que cubrir el mapa de sombras para esa vista. Lo usa src/acabado.js.
 *
 * Mundo: x al este, z al sur, y arriba, en metros (src/coords.js).
 */

/**
 * El sol, fijo: una tarde, desde el oestesuroeste y bajo, para que cada casa tire una sombra que se lea
 * sobre la calle y el patio. En diagonal a la cuadrícula: así hay sombra en las calles de norte a sur y
 * en las de este a oeste, y la cara sur del Ávila queda al sol.
 * azimut: de dónde viene, en grados desde el norte en el sentido del reloj; elevacion: grados sobre el horizonte.
 */
export const SOL = Object.freeze({ azimut: 233, elevacion: 38 })

const RAD = Math.PI / 180
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const unitario = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l) }

/** El vector unitario que apunta HACIA el sol. */
export function vectorSol({ azimut, elevacion } = SOL) {
  const h = Math.cos(elevacion * RAD)
  return [h * Math.sin(azimut * RAD), Math.sin(elevacion * RAD), -h * Math.cos(azimut * RAD)]
}

/**
 * Los ejes de la cámara de sombras (la convención de lookAt de three.js): z hacia el sol, x a su
 * derecha, y arriba. El sol no puede estar en el cenit.
 */
export function baseDeLuz(sol) {
  const z = unitario(sol)
  const x = unitario(cruz([0, 1, 0], z))
  return { x, y: cruz(z, x), z }
}

/** Hasta dónde se dibujan sombras, en metros desde la cámara, cuando mira algo a `dist` metros. */
export const alcanceDeSombras = (dist) => Math.min(14000, Math.max(500, 8 * dist))

/**
 * Lo que la cámara ve del suelo: los cuatro rayos de las esquinas de la pantalla, cortados con dos
 * planos horizontales (el suelo de lo que se mira, un poco más abajo, y por encima de los techos) y a lo
 * sumo a `alcance` metros (los rayos que van al horizonte no llegan nunca). Ocho puntos del mundo.
 * `derecha`, `arriba` y `adelante` son los ejes de la cámara; `fov` es el vertical, en grados.
 */
export function huellaDeVista({ ojo, derecha, arriba, adelante, fov, aspecto, ySuelo, bajo = 30, alto = 60, alcance }) {
  const ty = Math.tan((fov * RAD) / 2)
  const tx = ty * aspecto
  const puntos = []
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const d = unitario([0, 1, 2].map((i) => adelante[i] + sx * tx * derecha[i] + sy * ty * arriba[i]))
    for (const y of [ySuelo - bajo, ySuelo + alto]) {
      // el rayo baja hasta ese plano (si la cámara está por encima) o se corta en el alcance
      const t = d[1] < -1e-6 ? (y - ojo[1]) / d[1] : Infinity
      const hasta = Math.min(alcance, Math.max(0, t))
      puntos.push([0, 1, 2].map((i) => ojo[i] + d[i] * hasta))
    }
  }
  return puntos
}

/** Cada tamaño de caja es este factor más grande que el anterior: el texel no cambia con cada milímetro de zoom. */
const PASO_DE_LADO = 2 ** 0.25

/**
 * La caja ortográfica del mapa de sombras para una vista: cuadrada, en los ejes de la luz, cubre los
 * `puntos` (la huella de la vista) sin salirse de `limite` ({ x0, z0, x1, z1 }: la hoja). Su lado sale de
 * una escala fija y su centro cae en un múltiplo del texel: al mover la cámara la sombra no titila.
 * La profundidad alcanza para todo lo que haya entre yMin e yMax (el relieve y lo construido).
 * Devuelve los bordes en el espacio de la cámara de sombras: mira hacia −z, así que `cerca` y `lejos` son
 * distancias sobre −z (pueden ser negativas: la cámara está en el origen).
 */
export function ajustarSombra({ puntos, sol, tamaño, yMin, yMax, limite = null, margen = 20 }) {
  const base = baseDeLuz(sol)
  const caja = (ps) => {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
    for (const p of ps) {
      const [x, y] = [punto(p, base.x), punto(p, base.y)]
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
    }
    return [x0, y0, x1, y1]
  }
  let [x0, y0, x1, y1] = caja(puntos)
  if (limite) {
    const esquinas = [yMin, yMax].flatMap((y) => [[limite.x0, y, limite.z0], [limite.x1, y, limite.z0], [limite.x1, y, limite.z1], [limite.x0, y, limite.z1]])
    const l = caja(esquinas)
    const recortada = [Math.max(x0, l[0]), Math.max(y0, l[1]), Math.min(x1, l[2]), Math.min(y1, l[3])]
    // una vista que mira fuera de la hoja: no hay nada que sombrear; queda la caja de la hoja
    ;[x0, y0, x1, y1] = recortada[2] > recortada[0] && recortada[3] > recortada[1] ? recortada : l
  }
  // el centro se corre hasta medio texel al caer en la grilla: el lado deja lugar para eso (un texel entero)
  const pedido = (Math.max(x1 - x0, y1 - y0, 1) + 2 * margen) / (1 - 1 / tamaño)
  const lado = PASO_DE_LADO ** Math.ceil(Math.log(pedido) / Math.log(PASO_DE_LADO))
  const texel = lado / tamaño
  const cx = Math.round((x0 + x1) / 2 / texel) * texel
  const cy = Math.round((y0 + y1) / 2 / texel) * texel
  const borde = { izquierda: cx - lado / 2, derecha: cx + lado / 2, abajo: cy - lado / 2, arriba: cy + lado / 2 }
  // la profundidad: a lo largo del rayo de luz que pasa por cada esquina de la caja, dónde cruza yMax e yMin
  let [zMax, zMin] = [-Infinity, Infinity]
  for (const lx of [borde.izquierda, borde.derecha]) {
    for (const ly of [borde.abajo, borde.arriba]) {
      const y0luz = lx * base.x[1] + ly * base.y[1]
      zMax = Math.max(zMax, (yMax - y0luz) / base.z[1])
      zMin = Math.min(zMin, (yMin - y0luz) / base.z[1])
    }
  }
  return { ...borde, cerca: -zMax - margen, lejos: -zMin + margen, lado, texel, base }
}

/** La profundidad cruda del búfer (0 en `cerca` … 1 en `lejos`) de algo a z metros de la cámara. */
export const profundidadCruda = (z, cerca, lejos) => (lejos * (z - cerca)) / (z * (lejos - cerca))

/**
 * El contorno (espejo de src/shader/acabado.js): la segunda diferencia de la profundidad cruda entre un
 * píxel y dos vecinos opuestos (`antes + despues − 2·centro`), llevada a metros y dividida por lo que
 * mide un píxel a esa distancia. Sobre un plano da cero, por más rasante que se lo mire (la profundidad
 * cruda es lineal en la pantalla); en un escalón da su alto en píxeles, positivo del lado de adelante.
 */
export function saltoDeProfundidad({ antes, centro, despues }, { cerca, lejos, radPorPixel }) {
  const z = (cerca * lejos) / (lejos - centro * (lejos - cerca))
  const metros = ((antes + despues - 2 * centro) * z * z * (lejos - cerca)) / (lejos * cerca)
  return metros / (z * radPorPixel)
}

/** ¿El WebGL lo dibuja la CPU? (SwiftShader en CI y en los E2E, llvmpipe…): ahí las sombras no se pagan. */
export const esRenderPorSoftware = (nombre) => /swiftshader|llvmpipe|softpipe|software|basic render/i.test(String(nombre ?? ''))

const TAMAÑOS = Object.freeze({ completo: 4096, liviano: 2048 })

/**
 * Qué se prende del acabado. Por omisión: sombras de 4096 (2048 en modo liviano; apagadas si dibuja la
 * CPU), contorno a tinta y grano de papel. Parámetros de la página: `sombras=0` las apaga y `sombras=N`
 * fija el lado del mapa (256…8192, también con render por software: así se prueban en CI);
 * `contorno=0` y `grano=0` apagan lo suyo.
 */
export function ajustesDeAcabado({ params, liviano = false, software = false, maxTextura = 4096 }) {
  const pedido = params.get('sombras')
  const porOmision = software ? 0 : liviano ? TAMAÑOS.liviano : TAMAÑOS.completo
  const n = pedido === null || pedido === '' ? porOmision : Number(pedido)
  const sombras = Number.isFinite(n) && n >= 1 ? Math.min(maxTextura, 8192, Math.max(256, Math.round(n))) : 0
  return Object.freeze({ sombras, contorno: params.get('contorno') !== '0', grano: params.get('grano') !== '0' })
}
