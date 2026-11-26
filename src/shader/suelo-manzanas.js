import { DataTexture, LinearFilter, RGBAFormat, Vector4 } from 'three'

/**
 * El verde adentro de la ciudad antes de 1936 (1772, 1843, 1889): patios, solares y jardines de las casas, y el
 * terreno desocupado, del verde del campo que las rodea (valleColor, src/shader/valle.js); las calles y las
 * plazas de tierra siguen de tierra. uManzanasSuelo es un campo de distancia firmada por época (R 1772 · G 1843 ·
 * B 1889; tools/suelo-manzanas-lib.mjs): metros hasta el borde de manzana más cercano, positivo adentro. Sale de
 * las manzanas del generador de cada época, no de la segmentación de 1936 (I1772-008). Lo carga
 * src/suelo-manzanas.js; sin él (uManzanasOn = 0), el suelo de la ciudad queda como estaba.
 */
/** Hasta dónde guarda la distancia el campo (m), a cada lado: lo escribe tools/suelo-manzanas-lib.mjs. */
export const DIST_MAX_M = 16
/** Afuera de las manzanas, hasta esta distancia es calle; más lejos, terreno desocupado (verde). */
export const BANDA_CALLE_M = 12
/**
 * Cuánta saturación del verde del campo queda adentro de la ciudad (patios, solares, terreno libre): donde hay
 * mano humana hay poda, pisoteo y tierra a la vista, así que es más apagado que el campo. 1 = igual al campo.
 */
export const SATURACION_VERDE_CIUDAD = 0.6
/** El verde del campo, apagado para la ciudad (GLSL; c en lineal). */
export const GLSL_VERDE_CIUDAD = /* glsl */ `
  vec3 verdeCiudad(vec3 c) { return mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, ${SATURACION_VERDE_CIUDAD.toFixed(2)}); }`
/** Las épocas de cada canal (índices de la línea de tiempo: 1 = 1772 · 2 = 1843 · 3 = 1889). */
export const EPOCAS_CANALES = Object.freeze([1, 2, 3])

export const GLSL_SUELO_MANZANAS = /* glsl */ `
  ${GLSL_VERDE_CIUDAD}
  uniform sampler2D uManzanasSuelo; uniform vec4 uManzanasRect; uniform float uManzanasOn;
  /**
   * Cuánto del punto de la hoja es verde en la época: adentro de una manzana de la época (patio, solar) o más
   * lejos que la banda de calle (terreno desocupado). Fuera del rectángulo del campo, todo está lejos de las
   * manzanas: verde. Cero en las épocas sin canal (rige con el frente de la ola, como las casas).
   * px = metros por píxel: el filo del borde.
   */
  float verdeEn(vec2 hoja, float epoca, float px) {
    vec2 local = (hoja - uManzanasRect.xy) / (uManzanasRect.zw - uManzanasRect.xy);
    float adentro = step(0.0, local.x) * step(local.x, 1.0) * step(0.0, local.y) * step(local.y, 1.0);
    vec3 d = (texture2D(uManzanasSuelo, vec2(local.x, 1.0 - local.y)).rgb - 0.5) * ${(2 * DIST_MAX_M).toFixed(1)};
    vec3 rige = 1.0 - smoothstep(0.25, 0.5, abs(vec3(epoca) - vec3(${EPOCAS_CANALES.map((e) => e.toFixed(1)).join(', ')})));
    float filo = clamp(px, 0.25, 4.0);
    vec3 verde = max(smoothstep(-filo, filo, d), smoothstep(${BANDA_CALLE_M.toFixed(1)} - filo, ${BANDA_CALLE_M.toFixed(1)} + filo, -d));
    return uManzanasOn * dot(rige, mix(vec3(1.0), verde, adentro));
  }`

/** 1×1 a medio camino: hasta que llegue el campo (uManzanasOn lo apaga igual). */
export const SIN_MANZANAS = Object.assign(new DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1, RGBAFormat), { needsUpdate: true, minFilter: LinearFilter, magFilter: LinearFilter })

/** Los uniforms del suelo de manzanas; arrancan apagados. */
export const uniformsSueloManzanas = () => ({
  uManzanasSuelo: { value: SIN_MANZANAS },
  uManzanasRect: { value: new Vector4(0, 0, 1, 1) },
  uManzanasOn: { value: 0 },
})
