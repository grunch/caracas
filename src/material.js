/**
 * El material de la ciudad (y del suelo): MeshLambert parcheado.
 * - La ola: cada casa sube cuando el frente, que sale de la plaza, la alcanza (desfase por semilla).
 * - Tinta (uColor = 0): el techo y el suelo son el propio plano; las paredes, papel.
 * - Color (uColor = 1): el suelo se pinta según la segmentación (uSuelo: R agua · G vegetación ·
 *   B edificado · A manzana) con el dibujo del plano tenue debajo; techos de teja criolla y
 *   paredes de cal en sus tonos de siempre.
 * aInfo = (distancia a la plaza, semilla, estilo, pisos); pisos = 0 marca el suelo.
 */
import { MeshLambertMaterial, Vector2, Vector4, DataTexture } from 'three'
import { RANURAS } from './teselas.js'
import { GLSL_RELIEVE, uniformsRelieve } from './relieve.js'
import { SIN_LINEA_DE_TIEMPO } from './epocas.js'
import { GLSL_AZAR } from './shader/comun.js'
import { GLSL_EPOCAS, GLSL_CRECE } from './shader/epocas.js'
import { GLSL_PLANO, uniformsPlanoEpocas } from './shader/plano.js'
import { GLSL_SUELO } from './shader/suelo.js'
import { GLSL_FACHADA } from './shader/fachada.js'
import { GLSL_HOY } from './shader/hoy.js'
import { VERTICE_COMUN, VERTICE_OLA } from './shader/vertice.js'

// el fragment: los módulos de src/shader/ en orden de dependencia (suelo usa plano, épocas y crece)
const FRAGMENTO_COMUN = /* glsl */ `
  uniform float uAnchoOla, uColor;
  varying float vExiste;
  varying vec3 vMundo; varying float vTecho; varying vec4 vInfo; varying float vBase;
  ${GLSL_AZAR}
  ${GLSL_EPOCAS}
  ${GLSL_CRECE}
  ${GLSL_PLANO}
  ${GLSL_FACHADA}
  ${GLSL_SUELO}
  ${GLSL_HOY}`

const FRAGMENTO_COLOR = /* glsl */ `
  if (vInfo.w > 0.5 && vExiste < 0.02) discard; // la casa todavía no existe (o ya no) en esta época
  vec2 uvPlano = (vMundo.xz / uMetro + uPlaza) / uHoja;
  vec2 uv = vec2(uvPlano.x, 1.0 - uvPlano.y);
  vec3 papel = planoEn(uvPlano);
  float esSuelo = step(vInfo.w, 0.5);
  float publico = step(8.5, vInfo.z);

  // tinta: el techo y el suelo son el plano; la pared, papel
  vec3 enTinta = mix(diffuseColor.rgb, papel, vTecho);

  // color: suelo pintado; techo y pared según la casa (src/shader/fachada.js)
  vec3 enColor = mix(mix(paredColor(vInfo.y, vMundo.y - vBase), techoColor(vInfo.y, publico), vTecho), sueloColor(uv, papel), esSuelo);

  diffuseColor.rgb = mix(enTinta, enColor, uColor);

  // lo de hoy (H): la ciudad actual en rojo, sobre el suelo en los dos modos; los techos, en su color
  diffuseColor.rgb = mix(diffuseColor.rgb, hoyEn(uvPlano, diffuseColor.rgb), esSuelo);`

/** 1×1 blanco: en "desde cuándo", edificado desde la primera época (no recorta nada). */
const TODO_EDIFICADO = Object.assign(new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1), { needsUpdate: true })
/** 1×1 negro: lo de hoy, hasta que lleguen sus texturas (no estampa nada). */
const SIN_HOY = Object.assign(new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1), { needsUpdate: true })

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
    uFino: { value: Array.from({ length: RANURAS }, () => mapa) },
    uFinoRect: { value: Array.from({ length: RANURAS }, () => new Vector4(0, 0, 1, 1)) },
    uFinoOn: { value: new Array(RANURAS).fill(0) },
    ...uniformsPlanoEpocas(), // el plano de cada época (src/planos.js): uPlanoDe/A y sus rectángulos
    // la línea de tiempo: de qué época a cuál, y el frente de esa ola en metros (hasta que arranca, la reserva)
    uEpocaDe: { value: SIN_LINEA_DE_TIEMPO },
    uEpocaA: { value: SIN_LINEA_DE_TIEMPO },
    uOlaEpoca: { value: 0 },
    uEtapas: { value: 6 },
    uCrece: { value: TODO_EDIFICADO }, // hasta que llegue crece.png: todo edificado desde la primera época
    uCreceEscala: { value: new Vector2(1, 1) }, // hoja normalizada → crece.png normalizado (ver escalaCrece)
    // lo de hoy (src/shader/hoy.js): 0 apagado · 1 prendido; las resoluciones eligen lejos o cerca
    uHoy: { value: 0 },
    tHoyLejos: { value: SIN_HOY },
    tHoyCerca: { value: SIN_HOY },
    uHoyCercaOn: { value: 0 },
    uHoyLejosRes: { value: new Vector2(1, 1) },
    uHoyCercaRes: { value: new Vector2(1, 1) },
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
    .replace('#include <project_vertex>', `vBase = aInfo.w < 0.5 ? sueloEn(position.xz) : sueloEn(aAncla);
      transformed.y += aInfo.w < 0.5 ? sueloEn(position.xz)
        : apoyoCasa(aAncla, transformed.xz, position.y < 0.01);
      #include <project_vertex>`)
}
