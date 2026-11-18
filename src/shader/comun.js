/** Azar determinista a partir de una semilla (el mismo en el vértice y en el fragment). */
export const GLSL_AZAR = /* glsl */ `
  float azar(float n) { return fract(sin(n * 12.9898) * 43758.5453); }`
