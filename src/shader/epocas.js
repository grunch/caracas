/**
 * La línea de tiempo en el shader (espejo de src/epocas.js): la época que rige en un punto, cuánto
 * está en pie una casa, y desde qué época está edificado el suelo (crece.png).
 */
export const GLSL_EPOCAS = /* glsl */ `
  uniform float uEpocaDe, uEpocaA, uOlaEpoca;
  float epocaAqui(float dist) { return mix(uEpocaDe, uEpocaA, smoothstep(0.0, uAnchoOla, uOlaEpoca - dist)); }
  float vivoEn(vec2 vida, float e) {
    float nacio = smoothstep(vida.x - 0.5, vida.x, e);
    return vida.y < 0.5 ? nacio : nacio * (1.0 - smoothstep(vida.y - 0.5, vida.y, e));
  }`

/** Solo fragment: crece.png, celdas de celda_m desde la esquina noroeste de la hoja (la última puede sobrar). */
export const GLSL_CRECE = /* glsl */ `
  uniform float uEtapas; uniform sampler2D uCrece; uniform vec2 uCreceEscala;
  /** Desde qué época está edificado el punto (crece.png, R "desde cuándo"); nunca = muy lejos. */
  float edificadoDesde(vec2 hoja) {
    vec2 c = hoja * uCreceEscala;
    float v = texture2D(uCrece, vec2(c.x, 1.0 - c.y)).r;
    return v <= 0.0 ? 99.0 : uEtapas * (1.0 - v);
  }`
