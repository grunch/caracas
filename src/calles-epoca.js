/**
 * Las calles de una época (datos/calles-<año>.json + su campo de distancia, tools/calles-epoca.mjs): dónde va
 * la textura en la hoja y en qué época rige. Las dibuja el suelo (src/shader/calles.js). Son opcionales: sin
 * ellas, el suelo de la ciudad antes de 1936 queda liso.
 */
import { DIST_MAX_M, NUCLEO_M, SIN_EPOCA } from './shader/calles.js'

export const SIN_EPOCA_DE_CALLES = SIN_EPOCA

/** [x0, y0, x1, y1] de la caja (px del plano) en la hoja normalizada, como el rectángulo de un plano de época. */
export function rectDeCalles({ caja }, { ancho, alto }) {
  const ok = Array.isArray(caja) && caja.length === 4 && caja.every(Number.isFinite) && caja[2] > caja[0] && caja[3] > caja[1]
  if (!ok) throw new Error(`calles de época: caja inválida (${JSON.stringify(caja)})`)
  return [caja[0] / ancho, caja[1] / alto, caja[2] / ancho, caja[3] / alto]
}

/** El índice de la época del año en la línea de tiempo (crece.json); sin ese año, SIN_EPOCA_DE_CALLES. */
export function epocaDeCalles(año, epocas) {
  const i = epocas.findIndex((e) => e.año === año)
  return i < 0 ? SIN_EPOCA_DE_CALLES : i
}

/** Pone las calles en los uniforms de la ciudad, o falla sin tocar nada si las medidas no son las del shader. */
export function ponerCallesDeEpoca(U, meta, textura, { plano, epocas }) {
  if (meta.dist_max_m !== DIST_MAX_M) throw new Error(`calles de época: dist_max_m ${meta.dist_max_m}, el shader espera ${DIST_MAX_M}`)
  if (meta.nucleo_m !== NUCLEO_M) throw new Error(`calles de época: nucleo_m ${meta.nucleo_m}, el shader espera ${NUCLEO_M}`)
  const rect = rectDeCalles(meta, plano)
  U.uCalles.value = textura
  U.uCallesRect.value.fromArray(rect)
  U.uCallesEpoca.value = epocaDeCalles(meta.año, epocas)
}

/**
 * Baja datos/calles-<año>.json y su imagen y las pone en `U`. `cargar(url)` devuelve la textura (de datos, sin
 * espacio de color). Rechaza si falta algo: quien llama lo avisa y sigue sin calles.
 */
export async function cargarCallesDeEpoca(año, { U, plano, epocas, cargar }) {
  const r = await fetch(`datos/calles-${año}.json`)
  if (!r.ok) throw new Error(`datos/calles-${año}.json: ${r.status}`)
  if ((r.headers.get('content-type') ?? '').includes('html')) throw new Error(`datos/calles-${año}.json: no está (fallback HTML)`)
  const meta = await r.json()
  rectDeCalles(meta, plano) // antes de bajar la imagen
  const textura = await cargar(meta.imagen)
  ponerCallesDeEpoca(U, meta, textura, { plano, epocas })
}
