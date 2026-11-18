/**
 * El material de la ciudad (y del suelo): MeshLambert parcheado.
 * - La ola: cada casa sube cuando el frente, que sale de la plaza, la alcanza (desfase por semilla).
 * - Tinta (uColor = 0): el techo y el suelo son el propio plano; las paredes, papel.
 * - Color (uColor = 1): el suelo se pinta según la segmentación (uSuelo: R agua · G vegetación ·
 *   B edificado · A manzana) con el dibujo del plano tenue debajo; techos de teja criolla y
 *   paredes de cal en sus tonos de siempre.
 * aInfo = (distancia a la plaza, semilla, estilo, pisos); pisos = 0 marca el suelo.
 */
import { MeshLambertMaterial, Vector2 } from 'three'
import { GLSL_RELIEVE, uniformsRelieve } from './relieve.js'

const VERTICE_COMUN = /* glsl */ `
  attribute vec4 aInfo;
  uniform float uOla, uAnchoOla;
  varying vec3 vMundo; varying float vTecho; varying vec4 vInfo;
  float azar(float n) { return fract(sin(n * 12.9898) * 43758.5453); }`

const VERTICE_OLA = /* glsl */ `
  // cuánto se levantó esta casa: la ola sale de la plaza; cada una a su tiempo
  float sube = smoothstep(0.0, 1.0, (uOla - aInfo.x - azar(aInfo.y) * 60.0) / uAnchoOla);
  transformed.y *= sube;
  vTecho = step(0.5, normal.y);
  vInfo = aInfo;`

const FRAGMENTO_COMUN = /* glsl */ `
  uniform sampler2D uMapa, uSuelo; uniform vec2 uHoja, uPlaza; uniform float uMetro, uColor;
  varying vec3 vMundo; varying float vTecho; varying vec4 vInfo;
  float azarF(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

  /** Cuánta tinta hay en el plano en ese punto: 0 papel, 1 trazo. */
  float tintaDe(vec3 papel) { return 1.0 - smoothstep(0.35, 0.85, dot(papel, vec3(0.299, 0.587, 0.114))); }

  /** La teja criolla: cada techo un poco distinto, algunos más gastados u oscuros. */
  vec3 teja(float semilla) {
    vec3 nueva = vec3(0.71, 0.38, 0.26), vieja = vec3(0.55, 0.36, 0.28);
    return mix(nueva, vieja, azarF(semilla * 1.7)) * (0.9 + 0.2 * azarF(semilla * 3.1));
  }

  /** La cal: blanca las más; si no, crema, ocre, rosa viejo o añil claro. */
  vec3 cal(float semilla) {
    float k = azarF(semilla * 5.3);
    if (k < 0.45) return vec3(0.93, 0.91, 0.85);
    if (k < 0.65) return vec3(0.92, 0.85, 0.70);
    if (k < 0.80) return vec3(0.86, 0.72, 0.50);
    if (k < 0.92) return vec3(0.85, 0.68, 0.62);
    return vec3(0.72, 0.78, 0.84);
  }

  /** El suelo pintado: calles de tierra, patios, cultivos, el río; el plano queda como un dibujo tenue. */
  vec3 sueloColor(vec2 uv, vec3 papel) {
    vec4 s = texture2D(uSuelo, uv);
    float urbano = smoothstep(0.08, 0.35, texture(uSuelo, uv, 5.0).a); // manzanas alrededor: ciudad
    vec3 c = mix(vec3(0.62, 0.60, 0.42), vec3(0.72, 0.64, 0.50), urbano);  // pasto seco o tierra apisonada
    c = mix(c, vec3(0.52, 0.46, 0.34), s.a * (1.0 - s.b));                // patios: tierra más oscura
    c = mix(c, vec3(0.66, 0.40, 0.30), s.b);                               // lo edificado, visto desde arriba
    c = mix(c, vec3(0.46, 0.56, 0.31), s.g);                               // cultivos, jardines, plazas
    c = mix(c, vec3(0.47, 0.45, 0.37), s.r);                               // el Guaire y las quebradas: barro
    return c * (1.0 - 0.4 * tintaDe(papel));
  }`

const FRAGMENTO_COLOR = /* glsl */ `
  vec2 uvPlano = (vMundo.xz / uMetro + uPlaza) / uHoja;
  vec2 uv = vec2(uvPlano.x, 1.0 - uvPlano.y);
  vec3 papel = texture2D(uMapa, uv).rgb;
  float esSuelo = step(vInfo.w, 0.5);
  float publico = step(8.5, vInfo.z);

  // tinta: el techo y el suelo son el plano; la pared, papel
  vec3 enTinta = mix(diffuseColor.rgb, papel, vTecho);

  // color: suelo pintado; techo de teja (los públicos, azotea clara); pared de cal con zócalo
  vec3 azotea = vec3(0.66, 0.63, 0.57) * (0.92 + 0.12 * azarF(vInfo.y * 2.3));
  vec3 techo = mix(teja(vInfo.y), azotea, publico);
  vec3 pared = cal(vInfo.y) * mix(0.72, 1.0, step(0.8, vMundo.y));
  vec3 enColor = mix(mix(pared, techo, vTecho), sueloColor(uv, papel), esSuelo);

  diffuseColor.rgb = mix(enTinta, enColor, uColor);`

export function crearMaterialCiudad({
  plano, metro, mapa, suelo = null, relieve = uniformsRelieve({ x0: 0, z0: 0, ancho: 1, alto: 1 }),
}) {
  const U = {
    ...relieve, // tRelieve, uRelieveHoja, uRelieveCelda, uExageracion (ver relieve.js)
    uOla: { value: 0 }, // radio del frente de la ola, en metros
    uAnchoOla: { value: 260 }, // cuánto tarda una casa en subir entera, en metros de frente
    uColor: { value: 0 }, // 0 tinta · 1 color
    uMapa: { value: mapa },
    uSuelo: { value: suelo },
    uHoja: { value: new Vector2(plano.ancho, plano.alto) },
    uPlaza: { value: new Vector2(plano.plaza[0], plano.plaza[1]) },
    uMetro: { value: metro },
  }
  const material = new MeshLambertMaterial({ color: 0xf1e6cd })
  material.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U)
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>${VERTICE_COMUN}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>${VERTICE_OLA}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;`)
    parchearRelieveVertex(s)
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>${FRAGMENTO_COMUN}`)
      .replace('#include <color_fragment>', `#include <color_fragment>${FRAGMENTO_COLOR}`)
  }
  return { material, U }
}

/**
 * Relieve (solo vertex): todo se apoya en el terreno. El suelo (pisos = 0) se desplaza y toma
 * la normal del terreno, para que Lambert sombree la cuesta. Cada casa sube entera a la altura
 * del suelo en su ancla (si no, en la cuesta el techo quedaría inclinado) y el pie de sus
 * paredes baja hasta el suelo para que no flote. Va antes de project_vertex, después de la ola.
 * Las geometrías están en coordenadas del mundo: position.xz es el punto del terreno.
 */
function parchearRelieveVertex(s) {
  s.vertexShader = s.vertexShader
    .replace('void main() {', `attribute vec2 aAncla;
      ${GLSL_RELIEVE}
      void main() {`)
    .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
      if (aInfo.w < 0.5) objectNormal = normalSuelo(position.xz);`)
    .replace('#include <project_vertex>', `transformed.y += aInfo.w < 0.5 ? sueloEn(position.xz)
        : apoyoCasa(aAncla, transformed.xz, position.y < 0.01);
      #include <project_vertex>`)
}
