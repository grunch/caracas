/**
 * El verde de las manzanas de cada época (datos/suelo-manzanas.json + su campo de distancia firmada,
 * tools/suelo-manzanas.mjs): dónde va la textura en la hoja. Lo pinta el suelo (src/shader/suelo-manzanas.js). Es
 * opcional: sin él, el suelo de la ciudad antes de 1936 queda como estaba.
 */
import { BANDA_CALLE_M, DIST_MAX_M } from './shader/suelo-manzanas.js'
import { rectDeCalles } from './calles-epoca.js'

/** Pone el campo en los uniforms de la ciudad, o falla sin tocar nada si las medidas no son las del shader. */
export function ponerSueloManzanas(U, meta, textura, { plano }) {
  if (meta.dist_max_m !== DIST_MAX_M) throw new Error(`suelo de manzanas: dist_max_m ${meta.dist_max_m}, el shader espera ${DIST_MAX_M}`)
  if (meta.banda_calle_m !== BANDA_CALLE_M) throw new Error(`suelo de manzanas: banda_calle_m ${meta.banda_calle_m}, el shader espera ${BANDA_CALLE_M}`)
  const rect = rectDeCalles(meta, plano)
  U.uManzanasSuelo.value = textura
  U.uManzanasRect.value.fromArray(rect)
  U.uManzanasOn.value = 1
}

/**
 * Baja datos/suelo-manzanas.json y su imagen y los pone en `U`. `cargar(url)` devuelve la textura (de datos, sin
 * espacio de color). Rechaza si falta algo: quien llama lo avisa y sigue sin el verde.
 */
export async function cargarSueloManzanas({ U, plano, cargar }) {
  const r = await fetch('datos/suelo-manzanas.json')
  if (!r.ok) throw new Error(`datos/suelo-manzanas.json: ${r.status}`)
  if ((r.headers.get('content-type') ?? '').includes('html')) throw new Error('datos/suelo-manzanas.json: no está (fallback HTML)')
  const meta = await r.json()
  rectDeCalles(meta, plano) // antes de bajar la imagen
  const textura = await cargar(meta.imagen)
  ponerSueloManzanas(U, meta, textura, { plano })
}
