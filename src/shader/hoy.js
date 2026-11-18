/**
 * "Lo de hoy" (H): la Caracas actual de OpenStreetMap estampada en rojo sobre el plano.
 * tHoyLejos (2048) y tHoyCerca (8192) cubren la hoja entera como el plano: R calles · G vías férreas ·
 * B agua, cada canal con su cobertura 0–1 (tools/geo/hoy.py). Son datos, no color.
 * - De lejos: tHoyLejos (avenidas, vías y agua), con su antialias.
 * - De cerca (menos de ~3 texeles de tHoyCerca por píxel): todas las calles, con borde afilado.
 * - Muy de cerca (la calle mide más que unos píxeles): solo su contorno, a dos trazos.
 * Coordenadas de la hoja normalizadas, y hacia abajo (como planoEn).
 */
export const GLSL_HOY = /* glsl */ `
  uniform sampler2D tHoyLejos, tHoyCerca;
  uniform float uHoy, uHoyCercaOn;
  uniform vec2 uHoyLejosRes, uHoyCercaRes;

  const vec3 ROJO_HOY = vec3(0.3515, 0.0319, 0.0144); // #a03220, en lineal

  // el agua, más tenue: el Guaire y las quebradas son anchos y taparían el plano
  float coberturaHoy(vec3 t) { return max(max(t.r, t.g), 0.7 * t.b); }

  vec3 hoyEn(vec2 hoja, vec3 c) {
    vec2 uv = vec2(hoja.x, 1.0 - hoja.y);
    vec2 dh = fwidth(hoja);
    float texelesCerca = max(dh.x * uHoyCercaRes.x, dh.y * uHoyCercaRes.y); // texeles de cerca por píxel
    float texelesLejos = max(dh.x * uHoyLejosRes.x, dh.y * uHoyLejosRes.y);
    float kCerca = uHoyCercaOn * (1.0 - smoothstep(2.0, 3.5, texelesCerca));
    float cob = mix(coberturaHoy(texture2D(tHoyLejos, uv).rgb), coberturaHoy(texture2D(tHoyCerca, uv).rgb), kCerca);

    // el borde es la mitad de la cobertura; con un píxel de antialias, aunque el texel ocupe muchos
    float paso = max(length(vec2(dFdx(cob), dFdy(cob))), 1e-4); // cuánto cambia la cobertura por píxel
    float afilado = clamp((cob - 0.5) / paso + 0.5, 0.0, 1.0);
    float texeles = mix(texelesLejos, texelesCerca, kCerca);
    float relleno = mix(cob, afilado, 1.0 - smoothstep(0.7, 1.5, texeles));

    // muy de cerca (un texel ocupa más de 4 px, la calle más de ~25), el contorno: un trazo de ~2 px a
    // cada lado de la calle y un velo adentro. Antes no: el borde de la cobertura no alcanza para el trazo.
    float trazo = 1.0 - smoothstep(1.2, 2.2, abs(cob - 0.5) / paso);
    float kContorno = 1.0 - smoothstep(0.15, 0.3, texeles);
    float a = mix(relleno, max(trazo, 0.25 * afilado), kContorno);
    // de lejos son líneas finas: más intensas; de cerca, el relleno deja leer el plano debajo. En color,
    // un poco más: lo edificado ya es rojizo (uColor viene de material.js)
    float intensidad = mix(0.85, 0.7, kCerca * (1.0 - kContorno)) + 0.1 * uColor;
    return mix(c, ROJO_HOY, intensidad * a * uHoy);
  }`
