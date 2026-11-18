/** Techos y paredes en modo color (acá crecen las fachadas y los techos por estilo: T31–T33). */
export const GLSL_FACHADA = /* glsl */ `
  /** La teja criolla: cada techo un poco distinto, algunos más gastados u oscuros. */
  vec3 teja(float semilla) {
    vec3 nueva = vec3(0.71, 0.38, 0.26), vieja = vec3(0.55, 0.36, 0.28);
    return mix(nueva, vieja, azar(semilla * 1.7)) * (0.9 + 0.2 * azar(semilla * 3.1));
  }

  /** La cal: blanca las más; si no, crema, ocre, rosa viejo o añil claro. */
  vec3 cal(float semilla) {
    float k = azar(semilla * 5.3);
    if (k < 0.45) return vec3(0.93, 0.91, 0.85);
    if (k < 0.65) return vec3(0.92, 0.85, 0.70);
    if (k < 0.80) return vec3(0.86, 0.72, 0.50);
    if (k < 0.92) return vec3(0.85, 0.68, 0.62);
    return vec3(0.72, 0.78, 0.84);
  }

  /** El techo: teja; los edificios públicos, azotea clara. */
  vec3 techoColor(float semilla, float publico) {
    vec3 azotea = vec3(0.66, 0.63, 0.57) * (0.92 + 0.12 * azar(semilla * 2.3));
    return mix(teja(semilla), azotea, publico);
  }

  /** La pared de cal, con zócalo hasta 0,8 m sobre la base de la casa. */
  vec3 paredColor(float semilla, float sobreLaBase) { return cal(semilla) * mix(0.72, 1.0, step(0.8, sobreLaBase)); }`
