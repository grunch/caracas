/**
 * El acabado: la última pasada, a pantalla completa, sobre el cuadro ya dibujado y su profundidad
 * (src/acabado.js). No desenfoca nada: solo agrega tinta, grano y bruma.
 *
 * - **Contorno por profundidad**: la segunda diferencia de la profundidad cruda (la del búfer, que en
 *   la pantalla es lineal sobre cualquier plano: da cero en una pared o en el suelo por más rasante que
 *   se lo mire, y salta en los bordes y las aristas), llevada a metros y normalizada por lo que mide un
 *   píxel a esa distancia. En un escalón (una silueta) la línea va del lado de adelante, de un píxel; del
 *   lado de atrás solo se marcan las aristas entrantes (la pared contra el suelo), no el eco del escalón.
 *   Lejos se afloja, para que el fondo no sea una mancha negra. Fuerte en tinta, tenue en color.
 * - **Bruma** (solo en color): a lo lejos todo se aclara.
 * - **Grano de papel**, fijo en la pantalla, al final.
 */
export const VERTICE_ACABADO = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }`

/** Desde qué salto (en píxeles de profundidad) hay arista, y a partir de cuál un salto hacia atrás es el eco de una silueta. */
export const CONTORNO = Object.freeze({ desde: 0.35, hasta: 1.1, ecoDesde: 3.5, ecoHasta: 7.0, tinta: 0.82, enColor: 0.3 })

export const FRAGMENTO_ACABADO = /* glsl */ `
  uniform sampler2D tColor, tProf;
  uniform vec2 uTexel; // un píxel, en uv
  uniform vec4 uCamara; // cerca, lejos, radianes por píxel, píxeles de pantalla por píxel de CSS
  uniform vec3 uAjustes; // contorno (0/1), grano (0/1), —
  uniform float uColor;
  varying vec2 vUv;
  const vec3 TINTA_CONTORNO = vec3(0.024, 0.015, 0.011);
  const vec3 BRUMA = vec3(0.78, 0.80, 0.80);

  float cruda(vec2 uv) { return texture2D(tProf, uv).r; }
  /** De la profundidad del búfer (0 cerca … 1 lejos) a metros desde la cámara. */
  float metros(float d) { return uCamara.x * uCamara.y / (uCamara.y - d * (uCamara.y - uCamara.x)); }
  float azar2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  /** La arista en este píxel (0 … 1): d = su profundidad cruda, z = sus metros. */
  float contorno(float d, float z) {
    // en pantallas densas la línea mide un píxel de CSS, no uno de pantalla
    float paso = max(1.0, floor(uCamara.w + 0.5));
    vec2 t = uTexel * paso;
    // la segunda diferencia en las cuatro direcciones: positiva si este píxel está por delante de sus vecinos
    vec4 s = vec4(
      cruda(vUv + vec2(t.x, 0.0)) + cruda(vUv - vec2(t.x, 0.0)),
      cruda(vUv + vec2(0.0, t.y)) + cruda(vUv - vec2(0.0, t.y)),
      cruda(vUv + t) + cruda(vUv - t),
      cruda(vUv + vec2(t.x, -t.y)) + cruda(vUv - vec2(t.x, -t.y))) - 2.0 * d;
    // a metros (dz = dd · z² (lejos − cerca) / (lejos · cerca)) y a píxeles de esa distancia
    vec4 salto = s * z * (uCamara.y - uCamara.x) / (uCamara.y * uCamara.x * uCamara.z * paso);
    float adelante = max(max(salto.x, salto.y), max(salto.z, salto.w));
    float atras = max(max(-salto.x, -salto.y), max(-salto.z, -salto.w));
    // lejos, el umbral sube (la profundidad ya no distingue una casa de la de al lado) y la línea se aclara
    float lejos = smoothstep(600.0, 5000.0, z);
    float desde = ${CONTORNO.desde.toFixed(2)} * (1.0 + 3.0 * lejos), hasta = ${CONTORNO.hasta.toFixed(2)} * (1.0 + 3.0 * lejos);
    float silueta = smoothstep(desde, hasta, adelante);
    float entrante = smoothstep(desde, hasta, atras) * (1.0 - smoothstep(${CONTORNO.ecoDesde.toFixed(1)}, ${CONTORNO.ecoHasta.toFixed(1)}, atras));
    return max(silueta, entrante) * (1.0 - 0.75 * lejos);
  }

  void main() {
    vec3 c = texture2D(tColor, vUv).rgb;
    float d = cruda(vUv);
    float z = metros(d);
    float hayAlgo = step(d, 0.9999999);
    if (uAjustes.x > 0.5) {
      float fuerza = mix(${CONTORNO.tinta.toFixed(2)}, ${CONTORNO.enColor.toFixed(2)}, uColor);
      c = mix(c, TINTA_CONTORNO, fuerza * contorno(d, z) * hayAlgo);
    }
    // la bruma del valle: solo en color y solo sobre lo dibujado (la mesa de alrededor no)
    c = mix(c, BRUMA, uColor * hayAlgo * 0.5 * (1.0 - exp(-z / 9000.0)));
    if (uAjustes.y > 0.5) {
      // el grano: la fibra del papel (ruido fino) y sus aguas (manchas grandes, apenas), en píxeles de CSS
      vec2 p = gl_FragCoord.xy / max(uCamara.w, 1.0);
      float fibra = azar2(floor(p)) - 0.5;
      vec2 celda = floor(p / 3.0), f = fract(p / 3.0);
      float aguas = mix(mix(azar2(celda), azar2(celda + vec2(1.0, 0.0)), f.x), mix(azar2(celda + vec2(0.0, 1.0)), azar2(celda + 1.0), f.x), f.y) - 0.5;
      c *= 1.0 + mix(0.075, 0.04, uColor) * fibra + 0.035 * aguas;
    }
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`
