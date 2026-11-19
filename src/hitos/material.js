/**
 * El material de los hitos: propio, pero con los uniforms de la ciudad (crearMaterialCiudad), así suben con
 * la misma ola, aparecen y se van con las épocas, se apoyan en el relieve y pasan de tinta a color con todo
 * lo demás (como los árboles, src/arboles.js).
 * - Vértice: el piso de cada objeto es el más alto entre su ancla y su apoyo; los "pies" bajan al terreno.
 * - Color: el tono del vértice con el detalle de su material (tejas, sillares, barrotes de reja, los canteros
 *   en X de la plaza, el reloj), bajo la misma luz que la ciudad.
 * - Tinta: papel; lo oscuro se raya a pluma, más tupido cuanto más oscuro, y la sombra propia va rayada fina.
 */
import { ShaderMaterial, DoubleSide, Color } from 'three'
import { GLSL_RELIEVE } from '../relieve.js'
import { GLSL_EPOCAS } from '../shader/epocas.js'
import { MAT } from './lienzo.js'
import { GLSL_SOMBRA, UNIFORMS_DE_LUZ, uniformsDeLuz } from '../shader/sombra.js'

const glsl = (n) => n.toFixed(1)
const MARGEN_PIE_M = 0.5

const VERTICE = /* glsl */ `
  uniform float uOla, uAnchoOla;
  ${GLSL_EPOCAS}
  ${GLSL_RELIEVE}
  attribute vec4 aHito; // distancia del hito a la plaza, semilla, material, pie
  attribute vec2 aVida; attribute vec4 aAncla; attribute vec3 aColor; attribute vec2 aUv;
  varying vec3 vNormal, vMundo, vColor; varying vec2 vUv; varying float vExiste, vSube, vAlto;
  flat varying float vMat;
  float azar(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
  void main() {
    float sube = smoothstep(0.0, 1.0, (uOla - aHito.x - azar(aHito.y) * 60.0) / uAnchoOla);
    vExiste = vivoEn(aVida, epocaAqui(aHito.x));
    vSube = sube;
    // acostado, o fuera de su época: fuera de la vista, sin tocar el relieve (no cuesta ni un fragmento)
    if (sube < 0.01 || vExiste < 0.02) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    // el piso: plano a la altura del ancla donde el terreno baja; donde sube, lo sigue
    float piso = max(sueloEn(aAncla.xy), sueloEn(aAncla.zw));
    float y = piso + position.y * sube * vExiste;
    if (aHito.w > 0.5) y = min(sueloEn(position.xz), piso) - ${glsl(MARGEN_PIE_M)};
    vMundo = vec3(position.x, y, position.z);
    vNormal = normal;
    vColor = aColor;
    vUv = aUv;
    vMat = aHito.z;
    vAlto = position.y;
    gl_Position = projectionMatrix * viewMatrix * vec4(vMundo, 1.0);
  }`

const FRAGMENTO = /* glsl */ `
  uniform float uColor; uniform vec3 uLuzSol, uCielo, uTierra, uPapel;
  varying vec3 vNormal, vMundo, vColor; varying vec2 vUv; varying float vExiste, vSube, vAlto;
  flat varying float vMat;
  ${GLSL_SOMBRA}
  float azar2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  bool es(float m) { return abs(vMat - m) < 0.5; }

  // los canteros de la plaza: ocho cuñas entre los caminos en cruz y en X, la vuelta del borde y el redondel
  // del medio. p en metros desde el centro; m = (mitad del ancho, mitad del fondo). Positivo dentro del césped (m).
  float cantero(vec2 p, vec2 m) {
    vec2 q = abs(p);
    float d = min(q.x, q.y) - 2.6; // los caminos en cruz
    d = min(d, min(m.x - q.x, m.y - q.y) - 5.2); // la vuelta del borde
    d = min(d, abs(q.x * m.y - q.y * m.x) / length(m) - 2.3); // los caminos en X, hacia las esquinas
    return min(d, length(p) - 9.5); // el redondel de la estatua
  }

  void main() {
    if (vExiste < 0.02 || vSube < 0.01) discard;
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vMundo);
    if (dot(N, V) < 0.0) N = -N; // las dos caras, cada una con su luz
    vec3 tono = vColor;
    float trazo = 0.0; // tinta que el material pone por su cuenta (barrotes, juntas, agujas del reloj)
    float claro = 0.0; // 1: en tinta no se raya por oscuro (el material ya puso su trazo)

    if (es(${glsl(MAT.TEJA)})) {
      // tejas: canales pendiente abajo e hiladas a lo ancho
      float canal = abs(fract(vUv.x / 0.42) - 0.5) * 2.0;
      float hilada = fract(vUv.y / 0.55);
      tono *= 0.78 + 0.3 * canal - 0.16 * step(0.86, hilada);
      tono *= 0.9 + 0.2 * azar2(floor(vUv / vec2(0.42, 0.55)));
      trazo = 0.55 * step(0.9, canal);
    } else if (es(${glsl(MAT.VERJA)})) {
      // reja: murete de piedra, barrotes con lanza, largueros y un poste cada 3 m
      float ancho = fwidth(vUv.x);
      float barrote = step(abs(fract(vUv.x / 0.16) - 0.5), 0.14 + ancho * 2.0);
      float poste = step(abs(fract(vUv.x / 3.0 + 0.5) - 0.5), 0.022);
      float larguero = step(abs(vUv.y - 0.42), 0.035) + step(abs(vUv.y - 1.08), 0.035);
      float murete = step(vUv.y, 0.32);
      float lleno = max(max(barrote * step(vUv.y, 1.2), poste), max(larguero, murete));
      // de lejos los barrotes no se resuelven: queda una trama pareja
      float lejos = smoothstep(0.05, 0.16, ancho);
      float trama = step(0.5, azar2(floor(gl_FragCoord.xy * 0.5))) * step(vUv.y, 1.2);
      if (mix(lleno, max(max(trama, poste), max(larguero, murete)), lejos) < 0.5) discard;
      tono = mix(tono, vec3(0.42, 0.39, 0.33), murete);
      trazo = 1.0 - murete;
    } else if (es(${glsl(MAT.JARDIN)})) {
      vec2 m = vColor.xy;
      float d = cantero(vUv, m);
      float cesped = smoothstep(0.0, 0.12, d);
      float brocal = smoothstep(-0.28, -0.2, d) * (1.0 - cesped);
      // el piso: liso y claro; con la variante 1, el mosaico en damero de ~1900
      vec2 celda = floor(vUv / 0.9);
      float damero = mod(celda.x + celda.y, 2.0);
      vec3 piso = vec3(0.56, 0.52, 0.43) * (0.94 + 0.06 * azar2(floor(vUv / 2.0)));
      piso = mix(piso, piso * mix(0.8, 1.06, damero), vColor.z);
      vec3 verde = vec3(0.13, 0.22, 0.06) * (0.85 + 0.3 * azar2(floor(vUv * 3.0)));
      tono = mix(mix(piso, vec3(0.38, 0.36, 0.31), brocal), verde, cesped);
      // en tinta el césped va punteado sobre el papel, no rayado como lo oscuro
      trazo = max(brocal * 0.8, cesped * step(0.86, azar2(floor(vUv * 9.0))) * 0.7);
      claro = 1.0;
      // y el damero, a pluma: las baldosas oscuras con una raya fina, solo en lo pavimentado
      float baldosa = vColor.z * (1.0 - damero) * (1.0 - cesped) * (1.0 - brocal);
      trazo = max(trazo, baldosa * 0.4 * step(0.5, fract((vUv.x + vUv.y) / 0.3)));
    } else if (es(${glsl(MAT.TIERRA)})) {
      tono *= 0.9 + 0.16 * azar2(floor(vUv * 1.7)) + 0.06 * azar2(floor(vUv * 0.4));
      trazo = 0.35 * step(0.93, azar2(floor(vUv * 4.0)));
    } else if (es(${glsl(MAT.LONA)})) {
      tono *= 0.9 + 0.1 * sin(vUv.x * 9.0) * sin(vUv.y * 5.0);
    } else if (es(${glsl(MAT.RELOJ)})) {
      // la esfera del reloj: aro, marcas de las horas y dos agujas (uv de −1 a 1)
      float r = length(vUv);
      float ang = atan(vUv.x, vUv.y);
      float aro = step(0.84, r);
      float horas = step(0.62, r) * step(r, 0.8) * step(abs(fract(ang / 0.5236 + 0.5) - 0.5), 0.1);
      float larga = step(abs(vUv.x), 0.05) * step(0.0, vUv.y) * step(vUv.y, 0.7);
      float corta = step(abs(vUv.y - vUv.x * 0.35), 0.06) * step(0.0, vUv.x) * step(vUv.x, 0.45);
      trazo = max(max(aro, horas), max(larga, corta));
      tono = mix(vec3(0.85, 0.83, 0.76), vec3(0.03), trazo);
    } else if (es(${glsl(MAT.SILLAR)})) {
      // sillares: hiladas de 45 cm con las juntas a tresbolillo
      vec2 s = vec2(dot(vMundo.xz, vec2(0.7071)) * 1.4142, vMundo.y) / vec2(0.9, 0.45);
      s.x += 0.5 * mod(floor(s.y), 2.0);
      vec2 j = abs(fract(s) - 0.5);
      float junta = step(0.46, max(j.x, j.y));
      tono *= (0.88 + 0.2 * azar2(floor(s))) * (1.0 - 0.3 * junta);
      trazo = 0.5 * junta;
    }

    // la luz de la ciudad (hemisferio + sol, como MeshLambert): difuso = albedo / π × irradiancia
    // con la sombra arrojada (src/shader/sombra.js): en color, sin sol directo y más fría
    float sol = solEn(vMundo, N);
    vec3 ambiente = mix(uTierra, uCielo, N.y * 0.5 + 0.5), directa = uLuzSol * max(dot(N, uSol), 0.0);
    vec3 luz = ambiente + directa;
    bool esLuz = es(${glsl(MAT.LUZ)});
    vec3 enColor = esLuz ? tono : tono * (ambiente + directa * sol) * luzDeColor(sol) * 0.3183;

    // tinta: papel bajo la misma luz; lo oscuro, rayado en diagonal (más tupido cuanto más oscuro) y la
    // sombra propia con una raya fina; el material agrega su trazo
    float oscuro = (1.0 - claro) * (1.0 - smoothstep(0.03, 0.42, dot(tono, vec3(0.3, 0.5, 0.2))));
    float diag = fract((gl_FragCoord.x + gl_FragCoord.y) / 4.0);
    float otra = fract((gl_FragCoord.x - gl_FragCoord.y) / 4.0);
    float sombra = 1.0 - smoothstep(-0.1, 0.25, dot(N, uSol));
    float raya = max(step(1.0 - 0.75 * oscuro, diag), 0.55 * sombra * step(0.72, otra));
    vec3 papel = uPapel * luz * 0.3183;
    // la sombra arrojada, rayada como en la ciudad (la propia ya tiene su raya fina)
    // (gruesa y casi negra en los pisos: la plaza, los jardines, la tierra)
    float piso = float(es(${glsl(MAT.JARDIN)}) || es(${glsl(MAT.TIERRA)}));
    float arrojada = rayadoSombra((1.0 - sol) * step(0.0, dot(N, uSol)), vMundo, piso);
    vec3 enTinta = mix(papel, TINTA_SOMBRA, clamp(max(max(raya * 0.85, arrojada), trazo * 0.85), 0.0, 1.0));
    if (esLuz) enTinta = papel;

    gl_FragColor = vec4(mix(enTinta, enColor, uColor), 1.0);
    #include <colorspace_fragment>
  }`

const COMUNES = ['uColor', 'uOla', 'uAnchoOla', 'uEpocaDe', 'uEpocaA', 'uOlaEpoca',
  'tRelieve', 'uRelieveHoja', 'uRelieveCelda', 'uExageracion']

/** Las luces de main.js (HemisphereLight 1.6 y DirectionalLight 2.2), ya multiplicadas por su intensidad. */
export const LUZ_CIUDAD = Object.freeze({ cielo: [0xfff4e0, 1.6], tierra: [0x6b5a48, 1.6], sol: [0xfff1d6, 2.2] })
const luz = ([color, intensidad]) => new Color(color).multiplyScalar(intensidad)

/** `U`: los uniforms de la ciudad, compartidos; `sol`: la posición de la luz direccional. */
export function crearMaterialHitos({ U }) {
  const faltan = COMUNES.filter((k) => !U[k])
  if (faltan.length) throw new Error(`hitos: faltan uniforms de la ciudad (${faltan.join(', ')})`)
  return new ShaderMaterial({
    uniforms: {
      // el sol y el mapa de sombras de la ciudad; sin ellos (un U a medias), los de respaldo: el sol de siempre
      // y el mapa apagado (el sampler de sombra necesita su entrada aunque no se lea)
      ...uniformsDeLuz(),
      ...Object.fromEntries(COMUNES.map((k) => [k, U[k]])),
      ...Object.fromEntries(UNIFORMS_DE_LUZ.filter((k) => U[k]).map((k) => [k, U[k]])),
      uLuzSol: { value: luz(LUZ_CIUDAD.sol) },
      uCielo: { value: luz(LUZ_CIUDAD.cielo) },
      uTierra: { value: luz(LUZ_CIUDAD.tierra) },
      uPapel: { value: new Color(0xf1e6cd) }, // el papel de las paredes de la ciudad en tinta
    },
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    side: DoubleSide,
  })
}

/**
 * Los hitos vistos desde el sol, para el mapa de sombras (src/acabado.js): el mismo vértice, sin color.
 * Las rejas no tiran sombra (sus barrotes se dibujan en el fragment: desde el sol serían un muro).
 */
export function crearMaterialSombraHitos(material) {
  return new ShaderMaterial({
    uniforms: material.uniforms,
    vertexShader: VERTICE,
    fragmentShader: /* glsl */ `
      varying float vExiste, vSube; flat varying float vMat;
      void main() {
        if (vExiste < 0.02 || vSube < 0.01 || abs(vMat - ${glsl(MAT.VERJA)}) < 0.5) discard;
        gl_FragColor = vec4(1.0);
      }`,
    side: DoubleSide,
  })
}
