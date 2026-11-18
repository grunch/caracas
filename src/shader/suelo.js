/**
 * El suelo pintado en modo color: calles de tierra, patios, cultivos, el río; el plano queda como un
 * dibujo tenue, sin sus rótulos. Necesita GLSL_PLANO (tintaDe, planoViejo), GLSL_EPOCAS y GLSL_CRECE.
 * uSuelo: R agua · G vegetación · B edificado · A manzana (tools/suelo-lib.mjs).
 * uRotulos: cuánto del punto es letra, cifra o símbolo del plano de 1936 (tools/rotulos-lib.mjs).
 */
export const GLSL_SUELO = /* glsl */ `
  uniform sampler2D uSuelo, uRotulos;
  vec3 sueloColor(vec2 uv, vec3 papel) {
    vec4 s = texture2D(uSuelo, uv);
    // en épocas anteriores, lo que todavía no estaba edificado vuelve a ser campo
    float yaEstaba = step(edificadoDesde(vec2(uv.x, 1.0 - uv.y)), epocaAqui(length(vMundo.xz)) + 0.5);
    s.ba *= yaEstaba;
    float urbano = smoothstep(0.08, 0.35, texture(uSuelo, uv, 5.0).a); // manzanas alrededor: ciudad
    vec3 c = mix(vec3(0.62, 0.60, 0.42), vec3(0.72, 0.64, 0.50), urbano);  // pasto seco o tierra apisonada
    c = mix(c, vec3(0.52, 0.46, 0.34), s.a * (1.0 - s.b));                // patios: tierra más oscura
    c = mix(c, vec3(0.66, 0.40, 0.30), s.b);                               // lo edificado, visto desde arriba
    c = mix(c, vec3(0.46, 0.56, 0.31), s.g);                               // cultivos, jardines, plazas
    c = mix(c, vec3(0.47, 0.45, 0.37), s.r);                               // el Guaire y las quebradas: barro
    // los nombres, las cotas y el tranvía del plano de 1936 no se marcan: solo queda el dibujo
    // (×2: en el borde de un texel de rótulo el filtrado bilineal da 0,5, y ahí tiene que tapar entero)
    float rotulo = min(1.0, 2.0 * texture2D(uRotulos, uv).r) * (1.0 - planoViejo);
    return c * (1.0 - 0.4 * tintaDe(papel) * (1.0 - rotulo));
  }`
