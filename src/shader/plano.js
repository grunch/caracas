import { RANURAS } from '../teselas.js'

/**
 * El plano en un punto de la hoja: la textura general y, de cerca, las teselas finas de 3072 px
 * (src/teselas.js). Coordenadas de la hoja normalizadas, y hacia abajo.
 */
export const GLSL_PLANO = /* glsl */ `
  uniform sampler2D uMapa; uniform vec2 uHoja, uPlaza; uniform float uMetro;
  uniform sampler2D uFino[${RANURAS}]; uniform vec4 uFinoRect[${RANURAS}]; uniform float uFinoOn[${RANURAS}];

  vec3 finoEn(sampler2D t, vec4 r, float on, vec2 hoja, vec3 base) {
    vec2 local = (hoja - r.xy) / (r.zw - r.xy);
    float adentro = step(0.0, local.x) * step(local.x, 1.0) * step(0.0, local.y) * step(local.y, 1.0);
    return mix(base, texture2D(t, vec2(local.x, 1.0 - local.y)).rgb, on * adentro);
  }

  vec3 planoEn(vec2 hoja) {
    vec3 c = texture2D(uMapa, vec2(hoja.x, 1.0 - hoja.y)).rgb;
    c = finoEn(uFino[0], uFinoRect[0], uFinoOn[0], hoja, c);
    c = finoEn(uFino[1], uFinoRect[1], uFinoOn[1], hoja, c);
    c = finoEn(uFino[2], uFinoRect[2], uFinoOn[2], hoja, c);
    c = finoEn(uFino[3], uFinoRect[3], uFinoOn[3], hoja, c);
    return c;
  }

  /** Cuánta tinta hay en el plano en ese punto: 0 papel, 1 trazo. */
  float tintaDe(vec3 papel) { return 1.0 - smoothstep(0.35, 0.85, dot(papel, vec3(0.299, 0.587, 0.114))); }`
