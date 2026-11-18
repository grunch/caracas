import { GLSL_AZAR } from './comun.js'
import { GLSL_EPOCAS } from './epocas.js'

/** Declaraciones del vértice: atributos de cada casa, la ola y la línea de tiempo. */
export const VERTICE_COMUN = /* glsl */ `
  attribute vec4 aInfo; attribute vec2 aVida; attribute vec2 aPared; attribute vec2 aHistoria;
  uniform float uOla, uAnchoOla;
  varying float vExiste;
  ${GLSL_EPOCAS}
  varying vec3 vMundo; varying float vTecho; varying float vBase; varying vec2 vPared;
  // lo que es igual en toda la casa (o en toda la pared) va sin interpolar: interpolado, la semilla
  // y el largo tiemblan en la última cifra y azar() lo vuelve ruido de píxel a píxel
  flat varying vec4 vInfo; flat varying float vLargo;
  varying vec2 vTerreno; // del suelo: altura sobre la plaza (m, sin exagerar) y pendiente (m/m)
  ${GLSL_AZAR}
  /** (estilo, pisos) de la casa en una época (0…5; fuera de ahí, la más cercana). aHistoria trae un
   *  byte por época, estilo + 16·pisos, de a tres por número (empacarHistoria, src/ciudad.js). */
  vec2 enEpoca(vec2 historia, float epoca) {
    float e = clamp(floor(epoca + 0.5), 0.0, 5.0);
    float k = e < 2.5 ? e : e - 3.0;
    float byte = mod(floor((e < 2.5 ? historia.x : historia.y) / (k < 0.5 ? 1.0 : k < 1.5 ? 256.0 : 65536.0)), 256.0);
    return vec2(mod(byte, 16.0), floor(byte / 16.0));
  }`

/** Después de begin_vertex: la ola levanta la casa y la línea de tiempo decide si está en pie. */
export const VERTICE_OLA = /* glsl */ `
  // cuánto se levantó esta casa: la ola sale de la plaza; cada una a su tiempo
  float sube = smoothstep(0.0, 1.0, (uOla - aInfo.x - azar(aInfo.y) * 60.0) / uAnchoOla);
  // y en la línea de tiempo: la casa está en pie si ya nació y todavía no se fue, en la época de acá
  vExiste = vivoEn(aVida, epocaAqui(aInfo.x));
  transformed.y *= sube * vExiste;
  vTecho = step(0.5, normal.y);
  vInfo = aInfo;
  // la casa cambia con las épocas (su historia, tools/geo/estilos.py): a mitad del frente de la ola toma
  // el estilo y los pisos de la época nueva, y la altura (hecha con aInfo.w pisos) va de unos a otros
  if (aInfo.w > 0.5) {
    float frente = frenteEpoca(aInfo.x);
    vec2 de = enEpoca(aHistoria, uEpocaDe), a = enEpoca(aHistoria, uEpocaA);
    vInfo.zw = frente < 0.5 ? de : a;
    transformed.y *= mix(de.y, a.y, frente) / aInfo.w;
  }
  vPared = aPared; // dónde está en su pared (src/ciudad.js), para la fachada
  vLargo = aPared.y;
  vBase = 0.0; // altura del suelo bajo la casa (la pone el relieve)`
