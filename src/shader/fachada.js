/**
 * Techos y paredes en modo color, según el estilo de cada casa (aInfo.z, tools/geo/estilos.py):
 * 0 colonial · 1 republicano · 2 guzmancista · 3 ecléctico · 4 moderno · 5 quinta · 6 rancho ·
 * 7 casa de las orillas · 9 edificio público. Las fachadas con detalle son la tarea T32.
 */
export const GLSL_FACHADA = /* glsl */ `
  const float ESTILO_COLONIAL = 0.0, ESTILO_REPUBLICANO = 1.0, ESTILO_GUZMANCISTA = 2.0, ESTILO_ECLECTICO = 3.0,
    ESTILO_MODERNO = 4.0, ESTILO_QUINTA = 5.0, ESTILO_RANCHO = 6.0, ESTILO_ORILLAS = 7.0, ESTILO_PUBLICO = 9.0;
  bool es(float estilo, float cual) { return abs(estilo - cual) < 0.5; }

  /** La teja criolla: cada techo un poco distinto, algunos más gastados u oscuros. */
  vec3 teja(float semilla) {
    vec3 nueva = vec3(0.71, 0.38, 0.26), vieja = vec3(0.55, 0.36, 0.28);
    return mix(nueva, vieja, azar(semilla * 1.7)) * (0.9 + 0.2 * azar(semilla * 3.1));
  }
  /** Azotea de cemento o de baldosa clara. */
  vec3 azotea(float semilla) { return vec3(0.66, 0.63, 0.57) * (0.92 + 0.12 * azar(semilla * 2.3)); }
  /** Zinc: gris azulado, con óxido en las más viejas. */
  vec3 zinc(float semilla) { return mix(vec3(0.55, 0.57, 0.58), vec3(0.50, 0.36, 0.27), azar(semilla * 4.7) * 0.8); }

  vec3 techoColor(float semilla, float estilo) {
    if (es(estilo, ESTILO_PUBLICO) || es(estilo, ESTILO_MODERNO)) return azotea(semilla);
    if (es(estilo, ESTILO_RANCHO)) return zinc(semilla);
    if (es(estilo, ESTILO_ECLECTICO) && azar(semilla * 6.1) < 0.5) return azotea(semilla);
    return teja(semilla);
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
  /** Los pasteles de fin de siglo: ocre, rosa, crema, verde agua. */
  vec3 pastel(float semilla) {
    float k = azar(semilla * 7.9);
    if (k < 0.3) return vec3(0.88, 0.76, 0.55);
    if (k < 0.55) return vec3(0.88, 0.72, 0.68);
    if (k < 0.8) return vec3(0.93, 0.87, 0.73);
    return vec3(0.74, 0.84, 0.78);
  }

  vec3 paredBase(float semilla, float estilo) {
    if (es(estilo, ESTILO_RANCHO)) return mix(vec3(0.58, 0.48, 0.38), vec3(0.55, 0.57, 0.58), azar(semilla * 8.3)); // bahareque o zinc
    if (es(estilo, ESTILO_MODERNO)) return mix(vec3(0.92, 0.91, 0.88), vec3(0.78, 0.77, 0.74), azar(semilla * 2.9));
    if (es(estilo, ESTILO_ECLECTICO)) return mix(vec3(0.90, 0.85, 0.74), vec3(0.76, 0.73, 0.68), azar(semilla * 3.7)); // crema o piedra
    if (es(estilo, ESTILO_REPUBLICANO) || es(estilo, ESTILO_GUZMANCISTA)) return pastel(semilla);
    if (es(estilo, ESTILO_ORILLAS)) return cal(semilla) * 0.9; // cal más gastada
    return cal(semilla);
  }

  /** La pared, con zócalo hasta 0,8 m sobre la base de la casa (los ranchos no tienen). */
  vec3 paredColor(float semilla, float estilo, float sobreLaBase) {
    float zocalo = es(estilo, ESTILO_RANCHO) ? 1.0 : mix(0.72, 1.0, step(0.8, sobreLaBase));
    return paredBase(semilla, estilo) * zocalo;
  }`
