/**
 * El valle antes de la ciudad (solo en color): donde la época que rige todavía no urbanizó, el suelo
 * es campo y el dibujo del plano no se ve, con un borde neto entre las casas y el campo, sin arrabal.
 * La composición sale de la vista de John Thomas (1839, fuentes/imagenes/1839-commons-vista-de-caracas):
 * llano abierto, lomas, monte en las quebradas y a lo largo del agua. Los TONOS, no: la litografía es
 * pajiza y ocre, y el valle y el Ávila son verdes. Salen de fotos del Ávila en Commons, medidas
 * (matiz y saturación de lo que es vegetación; fuentes/imagenes/20*-commons-*avila*, notas en su README):
 * en sequía (enero) un verde oliva de matiz ~60°; en lluvias (septiembre), verde de ~75°, saturación ~0,4.
 * Se usa el de lluvias, la «eterna primavera», con el doble de saturación: la luz y la bruma del acabado le
 * quitan la mitad, y en pantalla queda como en las fotos (~0,3).
 * Necesita GLSL_CRECE (uCrece, uCreceEscala, uEtapas), uSuelo (el agua) y los varyings vMundo y
 * vTerreno (altura sobre la plaza y pendiente, del vértice).
 * crece.png: G = desde qué época está urbanizado cada punto, B = el monte (tools/geo/valle.py).
 */

const lineal = (r, g, b) => `vec3(${[r, g, b].map((v) => ((v / 255) ** 2.2).toFixed(3)).join(', ')})` // de sRGB 0–255

export const BORDE_CIUDAD_M = 10 // medio ancho de la franja en que la ciudad se funde con el campo

/** Los tonos del campo, en sRGB 0–255 (de dónde salen: arriba). */
export const PALETA_VALLE = Object.freeze({
  SABANA: [138, 160, 78], // el llano: herbazal verde claro
  SABANA_VERDE: [116, 146, 62], // sus manchas más verdes
  LOMA: [92, 124, 48], // las lomas
  AVILA: [100, 128, 52], // las faldas del Ávila: pajonal y matorral (la luz de las laderas en las fotos)
  AVILA_ALTO: [50, 80, 40], // arriba, la selva nublada: más oscura y más fría
  MONTE: [40, 66, 24], // las copas del monte (la sombra del bosque en las fotos)
  RIBERA: [66, 98, 38], // el bosque de galería de las quebradas
  AGUA_CLARA: [120, 142, 136],
  PLAYA: [212, 200, 162],
})
const tono = (nombre) => lineal(...PALETA_VALLE[nombre])

export const GLSL_VALLE = /* glsl */ `
  // El canal alfa de crece1946 conserva R/G/B históricos y describe sólo la ampliación.
  // 255=sin ampliación,192=urbano,128=casa,64=jardín. Antes de1946 no se consulta.
  vec3 expansion1946(vec2 hoja, float e) {
    if(e<=5.5)return vec3(0.0);
    vec2 c=hoja*uCreceEscala;
    float a=texture2D(uCrece,vec2(c.x,1.0-c.y)).a;
    return vec3(1.0-step(.9,a),step(.4,a)*(1.0-step(.6,a)),1.0-step(.4,a))*smoothstep(5.5,6.0,e);
  }
  const vec3 SABANA = ${tono('SABANA')}, SABANA_VERDE = ${tono('SABANA_VERDE')}, LOMA = ${tono('LOMA')};
  const vec3 AVILA = ${tono('AVILA')}, AVILA_ALTO = ${tono('AVILA_ALTO')};
  const vec3 MONTE = ${tono('MONTE')}, RIBERA = ${tono('RIBERA')};
  const vec3 AGUA_CLARA = ${tono('AGUA_CLARA')}, PLAYA = ${tono('PLAYA')};

  float azar2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  /** Ruido de valor en 0–1, suave. */
  float ruidoValle(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(azar2(i), azar2(i + vec2(1.0, 0.0)), f.x), mix(azar2(i + vec2(0.0, 1.0)), azar2(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  /** Cuánto detalle de "escala" metros se ve en este píxel (de lejos, el ruido fino sería grano). */
  float detalle(float escala) {
    float px = max(fwidth(vMundo.x), fwidth(vMundo.z));
    return 1.0 - smoothstep(0.3, 0.9, px / escala);
  }

  vec4 creceEn(vec2 hoja) {
    vec2 c = hoja * uCreceEscala;
    return texture2D(uCrece, vec2(c.x, 1.0 - c.y));
  }
  /** ¿Ya es ciudad el punto en la época e? G "desde cuándo": la etapa k vale 1 − k/E. */
  float yaUrbano(vec2 hoja, float e) {
    float umbral = 1.0 - (e + 0.5) / uEtapas; // espejo: umbralDesde de src/epocas.js
    float g = creceEn(hoja).g;
    return max(expansion1946(hoja,e).r, smoothstep(umbral - 0.04, umbral + 0.04, g) * step(0.002, g)); // 0 = nunca, en cualquier época
  }
  /**
   * Cuánto de lo que rodea al punto es ciudad en la época e (0 campo … 1 ciudad): el promedio del punto
   * y de ocho vecinos a ${BORDE_CIUDAD_M} m. No es un serrucho de celdas.
   */
  float urbanoEn(vec2 hoja, float e) {
    vec2 d = ${BORDE_CIUDAD_M.toFixed(1)} / (uHoja * uMetro); // en la hoja normalizada
    float suma = 2.0 * yaUrbano(hoja, e);
    for (int k = 0; k < 8; k++) {
      float a = 0.7854 * float(k);
      suma += yaUrbano(hoja + d * vec2(cos(a), sin(a)), e);
    }
    return suma / 10.0;
  }
  /** Cuánto es ciudad el punto, con el borde neto: de urbanoEn(). */
  float ciudadDe(float urbano) { return smoothstep(0.25, 0.75, urbano); }

  /**
   * El campo: s = uSuelo en el punto (R agua · G vegetación · A manzana), ribera = el agua de alrededor
   * (uSuelo desenfocado), e = la época que rige.
   */
  vec3 valleColor(vec4 s, float ribera, float e, vec2 hoja) {
    vec2 m = vMundo.xz;
    float altura = vTerreno.x, cuesta = vTerreno.y;
    float manchas = 0.6 * ruidoValle(m / 420.0) + 0.4 * ruidoValle(m / 110.0);
    // el llano: herbazal verde claro, con manchas; las lomas, más verdes
    vec3 c = mix(SABANA, SABANA_VERDE, smoothstep(0.3, 0.7, manchas));
    c = mix(c, LOMA, 0.7 * smoothstep(0.07, 0.3, cuesta + 0.1 * (manchas - 0.5)));
    // el Ávila: pajonal y matorral abajo, selva nublada arriba; sus pliegues los marcan la luz y el monte
    float cerro = smoothstep(170.0, 420.0, altura + 90.0 * (ruidoValle(m / 260.0) - 0.5));
    c = mix(c, mix(AVILA, AVILA_ALTO, smoothstep(420.0, 900.0, altura)), 0.9 * cerro);
    // el monte: manchones de copas donde crece.png dice, y el bosque de galería de las quebradas
    float monte = creceEn(hoja).b;
    float copas = smoothstep(0.36, 0.7, monte + 0.5 * detalle(13.0) * (ruidoValle(m / 13.0) - 0.5) + 0.25 * (ruidoValle(m / 55.0) - 0.5));
    float galeria = smoothstep(0.03, 0.3, ribera);
    c = mix(c, RIBERA, 0.5 * galeria);
    c = mix(c, mix(MONTE, RIBERA, 0.6 * ruidoValle(m / 29.0)), 0.6 * copas);
    // en 1936, los sembradíos que dibuja el plano
    c = mix(c, CULTIVO_1936, s.g * (1.0 - s.a) * smoothstep(4.5, 5.0, e));
    c *= 1.0 + 0.12 * detalle(4.0) * (ruidoValle(m / 4.0) - 0.5);
    // el Guaire y las quebradas, con su playa
    c = mix(c, PLAYA, 0.45 * smoothstep(0.3, 0.65, ribera) * (1.0 - s.r));
    return mix(c, AGUA_CLARA * (1.0 + 0.16 * detalle(7.0) * (ruidoValle(m / 7.0) - 0.5)), s.r);
  }`
