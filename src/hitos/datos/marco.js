/**
 * Lo común a las definiciones de hitos: se ubican sobre el mosaico del plano de 1936 (0,5 m por píxel), con
 * las esquinas con nombre de tools/geo/esquinas/1936-esquinas.json como referencia.
 */
export const METRO = 0.5 // metros por píxel del mosaico de 1936

/** El damero del centro: la dirección de Principal a La Torre (de oeste a este), en píxeles del plano. */
export const EJE_DAMERO = Object.freeze([0.9861, 0.1659])

/**
 * Rectángulo en píxeles del plano: centrado en (a, b) metros del marco de un hito ({ x, y } en píxeles, eje),
 * de `ancho` (a lo largo del eje) × `fondo` metros. Sirve de `planta` y de zona de supresión.
 */
export function rectanguloPx({ x, y, eje }, ancho, fondo, a = 0, b = 0) {
  const n = Math.hypot(eje[0], eje[1])
  const [ux, uy] = [eje[0] / n, eje[1] / n]
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sa, sb]) => {
    const [la, lb] = [(a + (sa * ancho) / 2) / METRO, (b + (sb * fondo) / 2) / METRO]
    return [x + la * ux - lb * uy, y + la * uy + lb * ux]
  })
}
