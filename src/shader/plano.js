import { DataTexture, Vector4 } from 'three'
import { RANURAS } from '../teselas.js'

/**
 * El plano en un punto de la hoja: el de 1936 (la textura general y, de cerca, las teselas finas de
 * 3072 px, src/teselas.js) y encima el plano calzado de la época que rige ahí (src/planos.js): el de la
 * época "de" delante del frente de la ola, el de la "a" detrás, fundidos como las casas (frenteEpoca).
 * Cada plano de época cubre su rectángulo de la hoja; donde su alfa es 0 (fuera del plano) queda 1936.
 * Coordenadas de la hoja normalizadas, y hacia abajo. Necesita GLSL_EPOCAS (frenteEpoca).
 */
export const GLSL_PLANO = /* glsl */ `
  uniform sampler2D uMapa; uniform vec2 uHoja, uPlaza; uniform float uMetro;
  uniform sampler2D uFino[${RANURAS}]; uniform vec4 uFinoRect[${RANURAS}]; uniform float uFinoOn[${RANURAS}];
  uniform sampler2D uPlanoDe, uPlanoA;
  uniform vec4 uPlanoDeRect, uPlanoARect;

  vec3 finoEn(sampler2D t, vec4 r, float on, vec2 hoja, vec3 base) {
    vec2 local = (hoja - r.xy) / (r.zw - r.xy);
    float adentro = step(0.0, local.x) * step(local.x, 1.0) * step(0.0, local.y) * step(local.y, 1.0);
    return mix(base, texture2D(t, vec2(local.x, 1.0 - local.y)).rgb, on * adentro);
  }

  /** El plano de 1936. */
  vec3 plano1936(vec2 hoja) {
    vec3 c = texture2D(uMapa, vec2(hoja.x, 1.0 - hoja.y)).rgb;
    c = finoEn(uFino[0], uFinoRect[0], uFinoOn[0], hoja, c);
    c = finoEn(uFino[1], uFinoRect[1], uFinoOn[1], hoja, c);
    c = finoEn(uFino[2], uFinoRect[2], uFinoOn[2], hoja, c);
    c = finoEn(uFino[3], uFinoRect[3], uFinoOn[3], hoja, c);
    return c;
  }

  /** Un plano de época (RGBA, cubre el rectángulo r de la hoja) sobre base; en tapa, cuánto la tapa. */
  vec3 planoDeEpoca(sampler2D t, vec4 r, vec2 hoja, vec3 base, out float tapa) {
    vec2 local = (hoja - r.xy) / (r.zw - r.xy);
    float adentro = step(0.0, local.x) * step(local.x, 1.0) * step(0.0, local.y) * step(local.y, 1.0);
    vec4 p = texture2D(t, vec2(local.x, 1.0 - local.y));
    tapa = p.a * adentro;
    return mix(base, p.rgb, p.a * adentro);
  }

  /** Cuánto del último planoEn() es el plano de otra época y no el de 1936 (lo usa el suelo en color). */
  float planoViejo = 0.0;

  vec3 planoEn(vec2 hoja) {
    vec3 c = plano1936(hoja);
    float dist = length((hoja * uHoja - uPlaza) * uMetro); // metros a la plaza, como aInfo.x de las casas
    float frente = frenteEpoca(dist), tapaDe, tapaA;
    vec3 de = planoDeEpoca(uPlanoDe, uPlanoDeRect, hoja, c, tapaDe);
    vec3 a = planoDeEpoca(uPlanoA, uPlanoARect, hoja, c, tapaA);
    planoViejo = mix(tapaDe, tapaA, frente);
    return mix(de, a, frente);
  }

  /** Cuánta tinta hay en el plano en ese punto: 0 papel, 1 trazo. */
  float tintaDe(vec3 papel) { return 1.0 - smoothstep(0.35, 0.85, dot(papel, vec3(0.299, 0.587, 0.114))); }`

/** 1×1 transparente: la ranura de un plano de época sin plano (se ve el de 1936). */
export const SIN_PLANO = Object.assign(new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1), { needsUpdate: true })

/** Los uniforms de los planos de época (los llena src/planos.js); arrancan vacíos. */
export const uniformsPlanoEpocas = () => ({
  uPlanoDe: { value: SIN_PLANO },
  uPlanoA: { value: SIN_PLANO },
  uPlanoDeRect: { value: new Vector4(0, 0, 1, 1) },
  uPlanoARect: { value: new Vector4(0, 0, 1, 1) },
})
