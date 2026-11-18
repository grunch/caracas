import { GLSL_AZAR } from './comun.js'
import { GLSL_EPOCAS } from './epocas.js'

/** Declaraciones del vértice: atributos de cada casa, la ola y la línea de tiempo. */
export const VERTICE_COMUN = /* glsl */ `
  attribute vec4 aInfo; attribute vec2 aVida;
  uniform float uOla, uAnchoOla;
  varying float vExiste;
  ${GLSL_EPOCAS}
  varying vec3 vMundo; varying float vTecho; varying vec4 vInfo; varying float vBase;
  ${GLSL_AZAR}`

/** Después de begin_vertex: la ola levanta la casa y la línea de tiempo decide si está en pie. */
export const VERTICE_OLA = /* glsl */ `
  // cuánto se levantó esta casa: la ola sale de la plaza; cada una a su tiempo
  float sube = smoothstep(0.0, 1.0, (uOla - aInfo.x - azar(aInfo.y) * 60.0) / uAnchoOla);
  // y en la línea de tiempo: la casa está en pie si ya nació y todavía no se fue, en la época de acá
  vExiste = vivoEn(aVida, epocaAqui(aInfo.x));
  transformed.y *= sube * vExiste;
  vTecho = step(0.5, normal.y);
  vInfo = aInfo;
  vBase = 0.0; // altura del suelo bajo la casa (la pone el relieve)`
