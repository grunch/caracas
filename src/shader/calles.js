import { DataTexture, LinearFilter, RedFormat, Vector4 } from 'three'

/**
 * Las calles de una época en el suelo (T33j.8b, I1772-008): antes de 1936, bajo la ciudad no va la hoja de
 * 1936 (sus calles y manzanas serían trazas falsas), sino el suelo liso; encima, las calles de la época que
 * tienen referencia curada. uCalles es un campo de distancia (tools/calles-epoca-lib.mjs): cada texel dice
 * cuántos metros faltan hasta el eje de calle más cercano (0 … DIST_MAX_M en 0 … 1). No se pega ningún
 * escaneo (eso lo prohibió T25b). Lo cargan src/calles-epoca.js y src/main.js; sin él, ninguna calle.
 *
 * Es un muestreador más del fragment de la ciudad (14 con el de sombra, de los 16 que garantiza WebGL2):
 * ningún canal libre de las texturas que ya están tiene la resolución de una calle (crece.png va de a 8 m),
 * y una malla aparte no se apoyaría en el suelo, que el relieve hincha por vértice con su propia rejilla.
 */
/** Hasta dónde guarda la distancia el campo (m): lo escribe tools/calles-epoca-lib.mjs con el mismo valor. */
export const DIST_MAX_M = 10
/** El núcleo de calzada que se dibuja (m): el ancho inferido del generador; el original no da anchos. */
export const NUCLEO_M = 4
/** Época de las calles cuando no hay ninguna: lejos de todas. */
export const SIN_EPOCA = -10

export const GLSL_CALLES = /* glsl */ `
  uniform sampler2D uCalles; uniform vec4 uCallesRect; uniform float uCallesEpoca;
  /**
   * La calle de la época en el punto de la hoja: x = cuánto es calzada, y = cuánto es su orilla (una línea
   * fina a cada lado). Cero fuera del rectángulo del campo y lejos de la época de las calles (rige con el
   * frente de la ola, como las casas). px = metros por píxel: de lejos la orilla se va y queda la calzada.
   */
  vec2 calleEn(vec2 hoja, float epoca, float px) {
    float rige = 1.0 - smoothstep(0.25, 0.5, abs(epoca - uCallesEpoca));
    vec2 local = (hoja - uCallesRect.xy) / (uCallesRect.zw - uCallesRect.xy);
    float adentro = step(0.0, local.x) * step(local.x, 1.0) * step(0.0, local.y) * step(local.y, 1.0);
    float d = texture2D(uCalles, vec2(local.x, 1.0 - local.y)).r * ${DIST_MAX_M.toFixed(1)};
    const float MEDIA = ${(NUCLEO_M / 2).toFixed(1)};
    // el filo crece al alejarse, pero no hasta la distancia saturada: un texel sin calle (DIST_MAX_M) no es calzada
    float filo = min(max(px, 0.25), ${(DIST_MAX_M - NUCLEO_M / 2).toFixed(1)});
    float calzada = 1.0 - smoothstep(MEDIA - filo, MEDIA + filo, d);
    float grosor = 0.15 + 0.5 * px;
    float orilla = (1.0 - smoothstep(grosor, grosor + filo, abs(d - MEDIA))) * (1.0 - smoothstep(1.5, 4.0, px));
    return rige * adentro * vec2(calzada, orilla);
  }`

/** 1×1 a 255: lejos de toda calle, hasta que llegue el campo (o si no está). */
export const SIN_CALLES = Object.assign(new DataTexture(new Uint8Array([255]), 1, 1, RedFormat), { needsUpdate: true, minFilter: LinearFilter, magFilter: LinearFilter })

/** Los uniforms de las calles de época; arrancan sin calles. */
export const uniformsCalles = () => ({
  uCalles: { value: SIN_CALLES },
  uCallesRect: { value: new Vector4(0, 0, 1, 1) },
  uCallesEpoca: { value: SIN_EPOCA },
})
