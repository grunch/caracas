import { GLSL_VALLE } from './valle.js'

/**
 * El suelo pintado en modo color: calles de tierra, patios, cultivos, el río; el plano queda como un
 * dibujo tenue. Donde la época que rige todavía no urbanizó (crece.png G), el suelo es el valle de
 * antes de la ciudad (src/shader/valle.js), sin el dibujo del plano: ni manzanas, ni calles, ni rótulos
 * de lo que vendrá. En 1936, fuera de la ciudad, el plano sí es el de ese campo y se deja ver, tenue.
 * En la ciudad, el dibujo va sin sus rótulos (uRotulos).
 * Necesita GLSL_PLANO (tintaDe, planoViejo), GLSL_EPOCAS, GLSL_CRECE y GLSL_VALLE.
 * uSuelo: R agua · G vegetación · B edificado · A manzana (tools/suelo-lib.mjs).
 * uRotulos: cuánto del punto es letra, cifra o símbolo del plano de 1936 (tools/rotulos-lib.mjs).
 */
export const TINTA_DEL_CAMPO_1936 = 0.45 // cuánto del dibujo del plano de 1936 se ve sobre el campo
export const JARDINES_DESDE = 3 // época (1889) desde la que las plazas y los patios tienen jardín
export const GLSL_SUELO = /* glsl */ `
  uniform sampler2D uSuelo, uRotulos;
  const vec3 CULTIVO_1936 = vec3(0.46, 0.56, 0.31);
  ${GLSL_VALLE}
  vec3 sueloColor(vec2 uv, vec3 papel) {
    vec4 s = texture2D(uSuelo, uv);
    vec2 hoja = vec2(uv.x, 1.0 - uv.y);
    float epoca = epocaAqui(length(vMundo.xz));
    // el valle antes de la ciudad: lo que la época todavía no urbanizó es campo
    float ciudad = ciudadEn(hoja, epoca);
    vec3 campo = valleColor(s, texture(uSuelo, uv, 3.5).r, epoca, hoja);
    // en épocas anteriores, lo que todavía no estaba edificado vuelve a ser campo
    float yaEstaba = step(edificadoDesde(hoja), epoca + 0.5);
    s.ba *= yaEstaba;
    float urbano = smoothstep(0.08, 0.35, texture(uSuelo, uv, 5.0).a); // manzanas alrededor: ciudad
    vec3 c = mix(vec3(0.62, 0.60, 0.42), vec3(0.72, 0.64, 0.50), urbano);  // pasto seco o tierra apisonada
    c = mix(c, vec3(0.52, 0.46, 0.34), s.a * (1.0 - s.b));                // patios: tierra más oscura
    c = mix(c, vec3(0.66, 0.40, 0.30), s.b);                               // lo edificado, visto desde arriba
    // cultivos, jardines, plazas: en la ciudad, recién desde 1889 (hasta Guzmán Blanco la Plaza Mayor
    // era un mercado de tierra, sin canteros); el verde del campo lo pinta valleColor
    c = mix(c, CULTIVO_1936, s.g * smoothstep(${JARDINES_DESDE}.0 - 0.5, ${JARDINES_DESDE}.0, epoca));
    c = mix(c, vec3(0.47, 0.45, 0.37), s.r);                               // el Guaire y las quebradas: barro
    // el dibujo del plano: entero en la ciudad; en el campo, nada (solo en 1936, tenue: es su plano)
    float dibujo = mix(${TINTA_DEL_CAMPO_1936} * smoothstep(4.5, 5.0, epoca), 1.0, ciudad);
    // los nombres, las cotas y el tranvía del plano de 1936 no se marcan: solo queda el dibujo
    // (×2: en el borde de un texel de rótulo el filtrado bilineal da 0,5, y ahí tiene que tapar entero)
    float rotulo = min(1.0, 2.0 * texture2D(uRotulos, uv).r) * (1.0 - planoViejo);
    return mix(campo, c, ciudad) * (1.0 - 0.4 * tintaDe(papel) * dibujo * (1.0 - rotulo));
  }`
