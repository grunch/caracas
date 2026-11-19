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

/**
 * El contorno, en números. Un salto se mide en píxeles de profundidad (saltoDeProfundidad, src/luz.js).
 * - `desde`…`hasta`: desde qué salto hay arista y cuándo la línea está entera.
 * - `ecoDesde`…`ecoHasta`: un salto hacia atrás así de grande es el eco de una silueta y no se dibuja.
 * - `lejos` (tinta) y `lejosEnColor`: de `desde` a `hasta` metros el umbral sube hasta ×(1 + `lejosUmbral`)
 *   y la línea pierde hasta `claro` de su tinta. En tinta, antes: el fondo de una vista oblicua no es una
 *   mancha de líneas.
 * - `techoDesde`…`techoHasta`, `techoTinta`: dentro del tejado de una misma casa (el píxel y sus vecinos
 *   llevan el mismo id en el alfa) las cumbreras, las limas y los escalones chicos entre ala y ala no se
 *   marcan: solo un escalón de verdad, y con menos tinta. La silueta de la casa (contra la calle, el patio,
 *   la pared o la vecina) va siempre entera. Solo en tinta: en color la línea ya es tenue.
 * - `tinta`, `enColor`: la fuerza de la línea en cada modo.
 */
export const CONTORNO = Object.freeze({
  desde: 0.35, hasta: 1.1, ecoDesde: 3.5, ecoHasta: 7.0,
  lejos: Object.freeze({ desde: 300, hasta: 4000, claro: 0.65 }),
  lejosEnColor: Object.freeze({ desde: 600, hasta: 5000, claro: 0.75 }),
  lejosUmbral: 3,
  techoDesde: 2.5, techoHasta: 6.0, techoTinta: 0.6,
  tinta: 0.88, enColor: 0.3,
})

/** Cuántos ids de techo caben en el alfa de 8 bits (0 = no es un techo; 255 = lo que no es la ciudad). */
const IDS_DE_TECHO = 253

/** El id del tejado de una casa (1…253 de 255), de su semilla: lo que el material escribe en el alfa. */
export const idDeTecho = (semilla) => (1 + (((semilla % IDS_DE_TECHO) + IDS_DE_TECHO) % IDS_DE_TECHO)) / 255

/** Lo mismo en GLSL, para la semilla que llegue en `expresion`. */
export const GLSL_ID_DE_TECHO = (expresion) => `((1.0 + mod(${expresion}, ${IDS_DE_TECHO}.0)) / 255.0)`

const escalon = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

/**
 * Cuánta línea lleva un píxel (0…1; espejo de `contorno` en el shader): `adelante` y `atras`, el mayor
 * salto hacia cada lado; `z`, sus metros; `mismoTecho`, si el píxel y sus vecinos son del tejado de una
 * misma casa; `color`, el modo (false = tinta). Falta multiplicarla por `tinta` o `enColor`.
 */
export function fuerzaDeContorno({ adelante, atras, z, mismoTecho = false, color = false }) {
  const C = CONTORNO
  const L = color ? C.lejosEnColor : C.lejos
  const lejos = escalon(L.desde, L.hasta, z)
  const sube = 1 + C.lejosUmbral * lejos
  const techo = mismoTecho && !color
  const [desde, hasta] = techo ? [C.techoDesde * sube, C.techoHasta * sube] : [C.desde * sube, C.hasta * sube]
  const silueta = escalon(desde, hasta, adelante)
  const entrante = escalon(desde, hasta, atras) * (1 - escalon(C.ecoDesde, C.ecoHasta, atras))
  return Math.max(silueta, entrante) * (1 - L.claro * lejos) * (techo ? C.techoTinta : 1)
}

const f = (n, cifras = 2) => n.toFixed(cifras)

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

  /** ¿El píxel y sus cuatro vecinos son del tejado de una misma casa? (su id va en el alfa; 0 y 1 no son techos) */
  float mismoTecho(float id, vec2 t) {
    vec4 otros = vec4(texture2D(tColor, vUv + vec2(t.x, 0.0)).a, texture2D(tColor, vUv - vec2(t.x, 0.0)).a,
      texture2D(tColor, vUv + vec2(0.0, t.y)).a, texture2D(tColor, vUv - vec2(0.0, t.y)).a);
    vec4 igual = step(abs(otros - id), vec4(0.002));
    return igual.x * igual.y * igual.z * igual.w * step(0.002, id) * step(id, 0.998);
  }

  /** La arista en este píxel (0 … 1): d = su profundidad cruda, z = sus metros, id = el de su techo. */
  float contorno(float d, float z, float id) {
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
    // (en tinta, antes que en color)
    float lejos = smoothstep(mix(${f(CONTORNO.lejos.desde, 1)}, ${f(CONTORNO.lejosEnColor.desde, 1)}, uColor), mix(${f(CONTORNO.lejos.hasta, 1)}, ${f(CONTORNO.lejosEnColor.hasta, 1)}, uColor), z);
    float sube = 1.0 + ${f(CONTORNO.lejosUmbral, 1)} * lejos;
    // dentro del tejado de una casa solo se marca un escalón de verdad, y con menos tinta (en tinta: el color no cambia)
    float techo = mismoTecho(id, t) * (1.0 - uColor);
    float desde = mix(${f(CONTORNO.desde)}, ${f(CONTORNO.techoDesde)}, techo) * sube, hasta = mix(${f(CONTORNO.hasta)}, ${f(CONTORNO.techoHasta)}, techo) * sube;
    float silueta = smoothstep(desde, hasta, adelante);
    float entrante = smoothstep(desde, hasta, atras) * (1.0 - smoothstep(${f(CONTORNO.ecoDesde, 1)}, ${f(CONTORNO.ecoHasta, 1)}, atras));
    return max(silueta, entrante) * (1.0 - mix(${f(CONTORNO.lejos.claro)}, ${f(CONTORNO.lejosEnColor.claro)}, uColor) * lejos) * mix(1.0, ${f(CONTORNO.techoTinta)}, techo);
  }

  void main() {
    vec4 escena = texture2D(tColor, vUv);
    vec3 c = escena.rgb;
    float d = cruda(vUv);
    float z = metros(d);
    float hayAlgo = step(d, 0.9999999);
    if (uAjustes.x > 0.5) {
      float fuerza = mix(${f(CONTORNO.tinta)}, ${f(CONTORNO.enColor)}, uColor);
      c = mix(c, TINTA_CONTORNO, fuerza * contorno(d, z, escena.a) * hayAlgo);
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
