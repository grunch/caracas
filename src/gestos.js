/**
 * La cuenta de los gestos con dos dedos sobre la vista (la usa src/camara.js). Lógica pura: posiciones de
 * puntero en píxeles de pantalla, con y hacia abajo.
 */

const DECIDIR_PX = 12      // cuánto tienen que moverse los dedos (sumados) para decidir qué gesto es
const VERTICAL_MIN_PX = 4  // cada dedo, para que cuente como un deslizamiento hacia arriba o abajo
const ESPERA_MAX_PX = 36   // si un dedo se movió en vertical y el otro no, se espera al otro hasta aquí

const medioDe = ([a, b]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const anguloDe = ([a, b]) => Math.atan2(b.y - a.y, b.x - a.x)
const separacionDe = ([a, b]) => Math.hypot(b.x - a.x, b.y - a.y)

/**
 * De un par de dedos al siguiente: { escala (> 1: se separaron), giro (radianes, > 0: en el sentido del reloj),
 * medio (el punto medio de ahora), inclinar (cuánto se corrió el medio hacia abajo, en px) }.
 */
export function gestoDeDosDedos(antes, ahora) {
  const s0 = separacionDe(antes)
  const escala = s0 > 0 ? separacionDe(ahora) / s0 : 1
  let giro = anguloDe(ahora) - anguloDe(antes)
  if (giro > Math.PI) giro -= 2 * Math.PI
  if (giro < -Math.PI) giro += 2 * Math.PI
  const medio = medioDe(ahora)
  return { escala, giro, medio, inclinar: medio.y - medioDe(antes).y }
}

/**
 * Qué gesto hacen los dedos desde que se apoyaron (`inicio`): null mientras no se movieron lo suficiente;
 * 'inclinar' si los dos van hacia arriba o los dos hacia abajo, casi en vertical; si no, 'pellizcar' (acercar,
 * girar y correr). El navegador avisa un dedo por vez, así que no se puede decidir evento por evento: si uno
 * se movió en vertical y el otro todavía no, se espera su aviso (salvo que el primero ya se haya ido lejos:
 * entonces el otro está quieto de verdad y es un pellizco con un solo dedo).
 */
export function modoDeGesto(inicio, ahora) {
  const d = [0, 1].map((i) => ({ dx: ahora[i].x - inicio[i].x, dy: ahora[i].y - inicio[i].y }))
  const largos = d.map((m) => Math.hypot(m.dx, m.dy))
  const total = largos[0] + largos[1]
  if (total < DECIDIR_PX) return null
  const vertical = (m) => Math.abs(m.dy) >= VERTICAL_MIN_PX && Math.abs(m.dy) > 2 * Math.abs(m.dx)
  const quieto = largos.findIndex((l) => l < VERTICAL_MIN_PX)
  if (quieto !== -1 && vertical(d[1 - quieto]) && total < ESPERA_MAX_PX) return null
  return d.every(vertical) && Math.sign(d[0].dy) === Math.sign(d[1].dy) ? 'inclinar' : 'pellizcar'
}
