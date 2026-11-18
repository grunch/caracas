/**
 * "Lo de hoy" (H): qué texturas se bajan la primera vez que se prende. El shader está en
 * src/shader/hoy.js; las texturas, en specs/02 (hoy-lejos 2048, hoy-cerca 8192).
 */
export const HOY_LEJOS = 'plano/hoy-lejos.webp'
export const HOY_CERCA = 'plano/hoy-cerca.webp'
const LADO_CERCA = 8192

/** La de lejos siempre; la de cerca, si la GPU la admite y el equipo no va en modo liviano. */
export function texturasHoy({ maxTextura, liviano }) {
  return !liviano && maxTextura >= LADO_CERCA ? [HOY_LEJOS, HOY_CERCA] : [HOY_LEJOS]
}
