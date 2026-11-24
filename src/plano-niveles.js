/**
 * El plano de la hoja, por niveles: primero.webp (1024 px) para el primer cuadro, chico (2048) y, solo cuando
 * la vista lo necesita, medio-4k (4096) y medio (8192, casi 12 MB). Un nivel alcanza mientras cada texel suyo
 * ocupe poco más de un píxel de la pantalla; de cerca, lo que se mira lo cubren las teselas finas
 * (src/teselas.js) y el plano general solo hace de fondo. Quien abre el sitio y mira la ciudad desde arriba no
 * baja el nivel de 8192 (specs/10-rendimiento.md).
 */

export const NIVELES = Object.freeze([
  Object.freeze({ url: 'plano/primero.webp', lado: 1024 }),
  Object.freeze({ url: 'plano/chico.webp', lado: 2048 }),
  Object.freeze({ url: 'plano/medio-4k.webp', lado: 4096 }),
  Object.freeze({ url: 'plano/medio.webp', lado: 8192 }),
])
export const NIVEL_CHICO = 1
export const NIVEL_4K = 2
const HOLGURA = 1.5 // un texel puede ocupar hasta un píxel y medio antes de pasar al nivel siguiente

/**
 * El nivel que pide la vista: `dist` metros de la cámara a lo que mira, `altoPx` píxeles de alto del lienzo,
 * `fov` grados. `anchoHoja`: metros que cubre la textura a lo ancho. Nunca menos que chico. Tope en 4096 para
 * un equipo liviano, una GPU sin texturas de 8192 o una vista más cerca que `distTeselas` (las teselas finas
 * cubren lo que se mira; null si no hay teselas).
 */
export function nivelNecesario({ dist, altoPx, fov, anchoHoja, liviano = false, maxTextura = 8192, distTeselas = null }) {
  const metrosPorPixel = (2 * dist * Math.tan((fov * Math.PI) / 360)) / altoPx
  const cabe = (n) => NIVELES[n].lado <= maxTextura
  const tope = liviano || (distTeselas !== null && dist < distTeselas) ? NIVEL_4K : NIVELES.length - 1
  let nivel = NIVEL_CHICO
  while (nivel < tope && cabe(nivel + 1) && anchoHoja / NIVELES[nivel].lado > metrosPorPixel * HOLGURA) nivel++
  return nivel
}

/**
 * Lleva la cuenta de qué nivel está puesto y cuál viene en camino. `cargar(url)` devuelve la promesa de la
 * textura; `poner(textura, nivel)` la pone. `pedir(nivel)` no baja nunca de nivel ni pide dos veces el mismo:
 * si uno falla se avisa y no se insiste (se llama en cada cuadro; uno más alto sí se puede pedir después).
 * `alSubir(nivel)` avisa cuando se pide un nivel más alto. `resuelto`: el nivel más alto cuyo pedido ya
 * terminó, haya llegado o fallado (un nivel intermedio que falla no traba a los de arriba).
 */
export function crearPlanoPorNiveles({ cargar, poner, avisar = (m) => console.warn(m), alSubir = () => {} }) {
  let puesto = -1
  let pedido = -1
  let resuelto = -1
  const resolver = (nivel) => { resuelto = Math.max(resuelto, nivel) }
  function pedir(nivel) {
    if (nivel <= pedido) return null
    pedido = nivel
    alSubir(nivel)
    const { url } = NIVELES[nivel]
    return cargar(url).then((textura) => {
      // uno más alto pudo llegar antes: ese queda
      if (nivel > puesto) { puesto = nivel; poner(textura, nivel) } else textura.dispose?.()
      resolver(nivel)
    }).catch((e) => {
      resolver(nivel)
      avisar(`plano: no se pudo cargar ${url}`)
      throw e
    })
  }
  return { pedir, get puesto() { return puesto }, get pedido() { return pedido }, get resuelto() { return resuelto } }
}
