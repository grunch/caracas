/**
 * El nivel de calidad del equipo (specs/02, Arranque). Liviano: texturas de hasta 4096, sombras de 2048 y
 * menos píxeles por punto de pantalla.
 */

const LADO_CORTO_TELEFONO = 600
const TEXTURA_COMPLETA = 8192
const MEMORIA_MINIMA_GB = 4
const PIXELES = Object.freeze({ completo: 2, liviano: 1.5 })

/**
 * ¿Va en modo liviano? `?liviano` lo fuerza y `?pesado` lo impide; si no, un teléfono (lado corto de la
 * pantalla < 600), una GPU que no llega a texturas de 8192 o menos de 4 GB de memoria (sin el dato, que
 * Safari y Firefox no dan, cuenta como suficiente).
 */
export function esLiviano({ params, maxTextura, pantalla, memoria }) {
  if (params.has('liviano')) return true
  if (params.has('pesado')) return false
  return maxTextura < TEXTURA_COMPLETA || Math.min(pantalla.ancho, pantalla.alto) < LADO_CORTO_TELEFONO ||
    (memoria ?? MEMORIA_MINIMA_GB) < MEMORIA_MINIMA_GB
}

/** Píxeles de render por punto de pantalla: en un teléfono de 3×, dibujar a 3 es lo que más cuesta. */
export function proporcionDePixeles({ dpr, liviano, captura = false }) {
  return captura ? 1 : Math.min(dpr, liviano ? PIXELES.liviano : PIXELES.completo)
}
