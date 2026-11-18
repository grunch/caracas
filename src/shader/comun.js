/** Azar determinista a partir de una semilla (el mismo en el vértice y en el fragment). */
export const GLSL_AZAR = /* glsl */ `
  float azar(float n) { return fract(sin(n * 12.9898) * 43758.5453); }`

/**
 * Las fachadas de pretil (republicana, guzmancista y ecléctica: estilos 1 a 3) tapan el tejado desde la
 * calle; las demás lo muestran con su alero. Lo usan el vértice (sube el pretil) y el fragment (quita
 * el alero): la misma casa cambia de una a otra con las épocas.
 */
export const GLSL_PRETIL = /* glsl */ `
  float conPretil(float estilo) { return step(0.5, estilo) * step(estilo, 3.5); }`
