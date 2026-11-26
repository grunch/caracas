import { GLSL_VALLE } from './valle.js'

/**
 * El suelo pintado en modo color: calles de tierra, patios, cultivos, el río; el plano queda como un
 * dibujo tenue. Donde la época que rige todavía no urbanizó (crece.png G), el suelo es el valle de
 * antes de la ciudad (src/shader/valle.js), sin el dibujo del plano: ni manzanas, ni calles, ni rótulos
 * de lo que vendrá. En 1936, fuera de la ciudad, el plano sí es el de ese campo y se deja ver, tenue.
 * En la ciudad, el dibujo va sin sus rótulos (uRotulos). Antes de 1936, en la ciudad no va nada de 1936 (ni el
 * dibujo del plano ni lo edificado, los patios o los jardines de su segmentación: serían trazas falsas,
 * I1772-008): la tierra de la calle, el agua y las calles de la época que tienen referencia (calleEn,
 * src/shader/calles.js). Con ?planos, donde está el plano de la época, sigue como antes.
 * En tinta, la hoja de cada época la arma src/shader/papel.js con las mismas lecturas (rotuloEn).
 * Necesita GLSL_PLANO (tintaDe, planoViejo), GLSL_EPOCAS, GLSL_CRECE y GLSL_VALLE.
 * uSuelo: R agua · G vegetación · B edificado · A manzana (tools/suelo-lib.mjs).
 * uRotulos: cuánto del punto es letra, cifra o símbolo del plano de 1936 (tools/rotulos-lib.mjs).
 */
export const TINTA_DEL_CAMPO_1936 = 0.45 // cuánto del dibujo del plano de 1936 se ve sobre el campo
export const JARDINES_DESDE = 3 // época (1889) desde la que las plazas y los patios tienen jardín
export const GLSL_SUELO = /* glsl */ `
  uniform sampler2D uSuelo, uRotulos;
  const vec3 CULTIVO_1936 = vec3(0.46, 0.56, 0.31);
  const vec3 TIERRA_DE_CALLE = vec3(0.72, 0.64, 0.50), CALZADA = vec3(0.63, 0.55, 0.42), BARRO = vec3(0.47, 0.45, 0.37);
  ${GLSL_VALLE}
  /**
   * Cuánto del punto es letra, cifra o símbolo del plano de 1936 (×2: en el borde de un texel de rótulo
   * el filtrado bilineal da 0,5, y ahí tiene que tapar entero). Después de planoEn(): usa planoViejo.
   */
  float rotuloEn(vec2 uv) { return min(1.0, 2.0 * texture2D(uRotulos, uv).r) * (1.0 - planoViejo); }
  /**
   * s = uSuelo en el punto, ribera = su agua desenfocada, rotulo = cuánto es letra del plano de 1936 (sin
   * contar los planos de época), epoca = la que rige ahí, ciudad = cuánto es ciudad en ella (ciudadDe),
   * calle = calleEn(hoja, epoca, px) (x calzada, y orilla).
   */
  vec3 sueloColor(vec2 uv, vec3 papel, vec4 s, float ribera, float rotulo, float epoca, float ciudad, vec2 calle) {
    vec2 hoja = vec2(uv.x, 1.0 - uv.y);
    // el valle antes de la ciudad: lo que la época todavía no urbanizó es campo
    vec3 campo = valleColor(s, ribera, epoca, hoja);
    // en épocas anteriores, lo que todavía no estaba edificado vuelve a ser campo
    float yaEstaba = step(edificadoDesde(hoja), epoca + 0.5);
    s.ba *= yaEstaba;
    float urbano = smoothstep(0.08, 0.35, texture(uSuelo, uv, 5.0).a); // manzanas alrededor: ciudad
    vec3 c = mix(vec3(0.62, 0.60, 0.42), TIERRA_DE_CALLE, urbano);        // pasto seco o tierra apisonada
    c = mix(c, vec3(0.52, 0.46, 0.34), s.a * (1.0 - s.b));                // patios: tierra más oscura
    c = mix(c, vec3(0.66, 0.40, 0.30), s.b);                               // lo edificado, visto desde arriba
    // cultivos, jardines, plazas: en la ciudad, recién desde 1889 (hasta Guzmán Blanco la Plaza Mayor
    // era un mercado de tierra, sin canteros); el verde del campo lo pinta valleColor
    c = mix(c, CULTIVO_1936, s.g * smoothstep(${JARDINES_DESDE}.0 - 0.5, ${JARDINES_DESDE}.0, epoca));
    c = mix(c, BARRO, s.r);                                                // el Guaire y las quebradas: barro
    // antes de 1936 (salvo donde está el plano de la época, con ?planos), la ciudad es tierra lisa con sus calles
    float antes = (1.0 - smoothstep(4.5, 5.0, epoca)) * (1.0 - planoViejo);
    vec3 liso = mix(mix(TIERRA_DE_CALLE, CALZADA, calle.x), CALZADA * 0.8, 0.6 * calle.y);
    c = mix(c, mix(liso, BARRO, s.r), antes);
    // el dibujo del plano: entero en la ciudad (en la de 1936); en el campo, nada (solo en 1936, tenue: es su plano)
    float dibujo = mix(${TINTA_DEL_CAMPO_1936} * smoothstep(4.5, 5.0, epoca), 1.0 - antes, ciudad);
    // los nombres, las cotas y el tranvía del plano de 1936 no se marcan: solo queda el dibujo
    // Sin máscara de rótulos de1946: su documento completo se consulta en tinta o en el visor.
    dibujo *= 1.0 - smoothstep(5.5,6.0,epoca);
    vec3 extension = expansion1946(hoja, epoca) * (1.0 - s.r);
    c = mix(c, TIERRA_DE_CALLE, extension.r);
    c = mix(c, CULTIVO_1936, extension.b);
    return mix(campo, c, ciudad) * (1.0 - 0.4 * tintaDe(papel) * dibujo * (1.0 - rotulo));
  }`
