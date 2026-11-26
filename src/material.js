import {GLSL_MANZANAS_MODERNAS,uniformsManzanasModernas} from './suelo-manzanas-modernas.js'
/**
 * El material de la ciudad (y del suelo): MeshLambert parcheado.
 * - La ola: cada casa sube cuando el frente, que sale de la plaza, la alcanza (desfase por semilla).
 * - Tinta (uColor = 0): el suelo es el propio plano; las casas, papel con fachadas y tejados a pluma.
 * - Color (uColor = 1): el suelo se pinta según la segmentación (uSuelo: R agua · G vegetación ·
 *   B edificado · A manzana) con el dibujo del plano tenue debajo, sin sus rótulos (uRotulos);
 *   techos de teja criolla y paredes de cal en sus tonos de siempre.
 * aInfo = (distancia a la plaza, semilla, estilo, pisos); pisos = 0 marca el suelo.
 */
import { MeshLambertMaterial, ShaderMaterial, DoubleSide, Vector2, Vector4, DataTexture } from 'three'
import { RANURAS } from './teselas.js'
import { GLSL_RELIEVE, GLSL_TERRAZAS_TAPADAS, uniformsRelieve } from './relieve.js'
import { SIN_LINEA_DE_TIEMPO } from './epocas.js'
import { GLSL_AZAR, GLSL_PRETIL } from './shader/comun.js'
import { GLSL_EPOCAS, GLSL_CRECE } from './shader/epocas.js'
import { GLSL_PLANO, uniformsPlanoEpocas } from './shader/plano.js'
import { GLSL_SUELO } from './shader/suelo.js'
import { GLSL_PAPEL } from './shader/papel.js'
import { GLSL_CALLES, uniformsCalles } from './shader/calles.js'
import { GLSL_SUELO_MANZANAS, uniformsSueloManzanas, EPOCAS_CANALES } from './shader/suelo-manzanas.js'
import { GLSL_FACHADA } from './shader/fachada.js'
import { GLSL_TECHO } from './shader/techo.js'
import { GLSL_PALETA_MANZANA } from './manzanas/paleta.js'
import { CUBIERTA } from './techos.js'
import { GLSL_HOY } from './shader/hoy.js'
import { VERTICE_COMUN, VERTICE_OLA } from './shader/vertice.js'
import { GLSL_SOMBRA, uniformsDeLuz } from './shader/sombra.js'
import { GLSL_ID_DE_TECHO } from './shader/acabado.js'

// el fragment: los módulos de src/shader/ en orden de dependencia (suelo usa plano, épocas y crece)
const FRAGMENTO_COMUN = /* glsl */ `
  uniform float uAnchoOla, uColor;
  varying float vExiste;
  varying vec3 vMundo; varying float vTecho; varying float vBase; varying vec2 vPared;
  // lo que es igual en toda la casa (o en toda la pared) va sin interpolar: interpolado, la semilla
  // y el largo tiemblan en la última cifra y azar() lo vuelve ruido de píxel a píxel
  flat varying float vPaleta; flat varying vec4 vInfo; flat varying float vLargo; flat varying float vAltoPiso; flat varying float vCubierta; flat varying float vLuz;
  flat varying float vPretil; // cuánto sube el pretil sobre esta pared en la época que rige
  flat varying float vAlzada; // cuánto se levantó la casa (0 acostada en la hoja … 1 en pie)
  varying vec3 vFaldon; // del techo: s, t y el largo del faldón (src/shader/techo.js)
  varying vec2 vTerreno; varying vec2 vPendiente;
  varying vec3 vNormalMundo;
  ${GLSL_AZAR}
  ${GLSL_PRETIL}
  ${GLSL_SOMBRA}
  ${GLSL_EPOCAS}
  ${GLSL_TERRAZAS_TAPADAS}
  ${GLSL_CRECE}
  ${GLSL_PLANO}
  ${GLSL_PALETA_MANZANA}
  ${GLSL_FACHADA}
  ${GLSL_TECHO}
  ${GLSL_CALLES}
  ${GLSL_SUELO_MANZANAS}
${GLSL_MANZANAS_MODERNAS}
  ${GLSL_SUELO}
  ${GLSL_PAPEL}
  ${GLSL_HOY}`

const FRAGMENTO_COLOR = /* glsl */ `
  if (vInfo.w < 0.5 && bajoUnHito(vMundo.xz)) discard; // la plataforma de un hito de terraza lo tapa (src/relieve.js)
  if (vInfo.w > 0.5 && vExiste < 0.02) discard; // la casa todavía no existe (o ya no) en esta época
  // el alero vuela sobre la calle solo si la fachada de la época no lleva pretil
  float volado = max(1.0 - step(0.5, abs(vCubierta - ${CUBIERTA.ALERO}.0)), step(${CUBIERTA.VOLADA}.0 - 0.5, vCubierta));
  if (volado > 0.5 && conPretil(vInfo.z) > 0.5) discard;
  vec2 uvPlano = (vMundo.xz / uMetro + uPlaza) / uHoja;
  vec2 uv = vec2(uvPlano.x, 1.0 - uvPlano.y);
  vec3 papel = planoEn(uvPlano);
  float esSuelo = step(vInfo.w, 0.5);
  // la fachada (src/shader/fachada.js) y el techo (src/shader/techo.js), con sus derivadas tomadas acá, fuera de toda rama
  vec2 wPared = max(fwidth(vec2(vPared.x, vMundo.y - vBase)), vec2(1e-4));
  vec2 wTecho = max(fwidth(vFaldon.xy), vec2(1e-4));
  gAltoPiso = max(vAltoPiso, 1.0);
  gPretil = vPretil;
  // los patios y solares de las casas, verdes en las épocas con suelo verde (src/shader/techo.js)
  // (solo con el campo de manzanas cargado, como el suelo; y solo en sus épocas: ni 1578 ni 1911)
  float epocaVerde = epocaAqui(length(vMundo.xz));
  gVerdor = uManzanasOn * smoothstep(${Math.min(...EPOCAS_CANALES) - 1}.5, ${Math.min(...EPOCAS_CANALES)}.0, epocaVerde)
    * (1.0 - smoothstep(${Math.max(...EPOCAS_CANALES)}.5, ${Math.max(...EPOCAS_CANALES) + 1}.0, epocaVerde));
  gVerdor = max(gVerdor, modernasActivas(epocaVerde));
  // cada fragmento calcula o el techo o la fachada (y el suelo, ninguno de los dos): con if, que el
  // render por software salta enteros. Acostada en la hoja, el techo va en su tono medio, sin dibujo
  vec4 casa = vec4(diffuseColor.rgb, 0.0);
  if (esSuelo < 0.5) {
    if (vTecho < 0.5) casa = fachadaEn(vec2(vPared.x, vLargo), vMundo.y - vBase, vInfo, paredColor(vInfo.y, vInfo.z, vMundo.y - vBase), wPared);
    else if (vAlzada > 0.0) casa = techoEn(vFaldon, vCubierta, vInfo.y, vLuz, wTecho);
    else casa = techoLlano(vCubierta, vInfo.y);
  }

  // el lugar en la época que rige ahí: lo que es ciudad y lo que todavía es valle. Las lecturas con mipmap
  // y las derivadas van acá, fuera de toda rama
  float epoca = epocaAqui(length(vMundo.xz));
  float urbano = urbanoEn(uvPlano, epoca);
  float ciudad = ciudadDe(urbano);
  vec4 enSuelo = texture2D(uSuelo, uv);
  float ribera = texture(uSuelo, uv, 3.5).r;
  float rotulo = rotuloEn(uv);
  float pxMundo = max(fwidth(vMundo.x), fwidth(vMundo.z));
  vec2 calle = calleEn(uvPlano, epoca, pxMundo); // las calles de la época (src/shader/calles.js)
  float verde = max(verdeEn(uvPlano, epoca, pxMundo), verdeModernoEn(uvPlano, epoca, pxMundo)); // patios y terreno libre de la época (src/shader/suelo-manzanas.js)
  float wRibera = fwidth(ribera);

  // tinta: el suelo es la hoja de la época (src/shader/papel.js): papel liso con sus calles donde ya hay
  // ciudad (en 1936, el plano) y papel en blanco, con el valle a pluma, donde todavía no; la casa, papel con sus vanos, molduras y tejados a
  // pluma. Acostada en la hoja (antes de la ola) la casa todavía es la hoja: el grabado aparece al levantarse
  float acostada = max(esSuelo, 1.0 - smoothstep(0.0, 0.3, vAlzada));
  vec3 hojaTinta = papel;
  if (acostada > 0.0 && uColor < 1.0) hojaTinta = papelDeEpoca(papel, epoca, urbano, enSuelo, ribera, wRibera, calle, pxMundo);
  vec3 enTinta = mix(mix(diffuseColor.rgb, TINTA, casa.a), hojaTinta, acostada);

  // color: suelo pintado; techo y fachada según la casa
  vec3 enColor = mix(casa.rgb, sueloColor(uv, papel, enSuelo, ribera, rotulo, epoca, ciudad, calle, verde), esSuelo);

  diffuseColor.rgb = mix(enTinta, enColor, uColor);

  // lo de hoy (H): la ciudad actual en rojo, sobre el suelo en los dos modos; los techos, en su color
  diffuseColor.rgb = mix(diffuseColor.rgb, hoyEn(uvPlano, diffuseColor.rgb), esSuelo);`

/**
 * La sombra arrojada (src/shader/sombra.js), sobre la luz ya calculada. En color, a la sombra no llega
 * el sol directo y la luz que queda es más fría. En tinta el papel no se oscurece: la sombra se raya a
 * pluma (más liviana en las caras que solo le dan la espalda al sol: es su sombra propia).
 */
const FRAGMENTO_LUZ = /* glsl */ `
  const vec3 LUZ_PAREJA = vec3(1.05, 1.0, 0.9); // la luz del suelo al sol, para todas las caras
  vec3 nMundo = normalize(vNormalMundo);
  float sol = solEn(vMundo, nMundo);
  vec3 conSol = (reflectedLight.indirectDiffuse + reflectedLight.directDiffuse * sol) * luzDeColor(sol);
  float propia = step(dot(nMundo, uSol), 0.0);
  // el piso: la calle, el patio y el solar (ahí la sombra va gruesa y casi negra; src/shader/sombra.js)
  float cubierta = mod(vCubierta, ${CUBIERTA.VOLADA}.0);
  float piso = max(step(vInfo.w, 0.5), step(${CUBIERTA.PATIO}.0 - 0.5, cubierta) * step(cubierta, ${CUBIERTA.SOLAR}.0 + 0.5));
  // (en los techos, entre la del piso y la de la pared: de arriba, casi todo lo que recibe sombra es tejado)
  float raya = rayadoSombra((1.0 - sol) * mix(1.0, 0.42, propia), vMundo, max(piso, 0.4 * vTecho));
  // el papel del grabado casi no cambia con la cara: el volumen lo dan el rayado y el contorno
  vec3 papelParejo = mix(outgoingLight, diffuseColor.rgb * LUZ_PAREJA, 0.65);
  vec3 conRaya = mix(papelParejo, TINTA_SOMBRA, raya);
  if(vPaleta>0.5 && piso<0.5) conSol=iluminarManzana(diffuseColor.rgb,nMundo,sol);
  outgoingLight = mix(conRaya, conSol, uColor);
  #include <opaque_fragment>
  // a qué casa pertenece este techo, en el alfa (nadie más lo usa: nada es transparente): el contorno
  // (src/shader/acabado.js) no marca las aristas entre las alas de un mismo tejado. 0 = no es un techo
  gl_FragColor.a = vTecho * (1.0 - piso) * ${GLSL_ID_DE_TECHO('vInfo.y')};`

/** 1×1 blanco: en "desde cuándo", edificado desde la primera época (no recorta nada). */
const TODO_EDIFICADO = Object.assign(new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1), { needsUpdate: true })
/** 1×1 en cero: sin rótulos, hasta que llegue su máscara (el plano se marca entero). */
const SIN_ROTULOS = Object.assign(new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1), { needsUpdate: true })
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
    uRotulos: { value: SIN_ROTULOS }, // rótulos del plano de 1936 (src/shader/suelo.js)
    ...uniformsCalles(), // las calles de la época (src/shader/calles.js, src/calles-epoca.js)
    ...uniformsSueloManzanas(),
    ...uniformsManzanasModernas(), // el verde de patios y terreno libre (src/shader/suelo-manzanas.js, src/suelo-manzanas.js)
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
    ...uniformsDeLuz(), // el sol y el mapa de sombras (src/shader/sombra.js, src/acabado.js)
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
      .replace('#include <opaque_fragment>', FRAGMENTO_LUZ)
  }
  return { material, U }
}

/**
 * La ciudad vista desde el sol, para el mapa de sombras: el mismo vértice (la ola, las épocas, el pretil,
 * el relieve) y nada de color. Lo que todavía no se levantó, lo que no existe en la época que rige y el
 * alero que la fachada de pretil no lleva se van de la vista: no tiran sombra. El suelo tampoco.
 */
export function crearMaterialSombraCiudad(U) {
  return new ShaderMaterial({
    uniforms: U,
    vertexShader: `${VERTICE_COMUN}
      attribute vec2 aAncla;
      ${GLSL_RELIEVE}
      void main() {
        vec3 transformed = position;
        ${VERTICE_OLA}
        ${VERTICE_APOYO}
        float volado = max(1.0 - step(0.5, abs(vCubierta - ${CUBIERTA.ALERO}.0)), step(${CUBIERTA.VOLADA}.0 - 0.5, vCubierta));
        bool tira = aInfo.w > 0.5 && vAlzada * vExiste > 0.02 && !(volado > 0.5 && conPretil(vInfo.z) > 0.5);
        gl_Position = tira ? projectionMatrix * viewMatrix * vec4(transformed, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
    side: DoubleSide,
  })
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
      varying vec3 vNormalMundo;
      ${GLSL_RELIEVE}
      void main() {`)
    .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
      if (aInfo.w < 0.5) objectNormal = normalSuelo(position.xz);
      vNormalMundo = objectNormal; // las geometrías están en coordenadas del mundo`)
    .replace('#include <project_vertex>', `${VERTICE_APOYO}
      #include <project_vertex>`)
}

/** Antes de proyectar: el suelo se hincha con el relieve y la casa se apoya en él (ver parchearRelieveVertex). */
const VERTICE_APOYO = /* glsl */ `
      // el piso de un patio o de un solar se apoya en el terreno de cada punto: en la cuesta no lo tapa
      bool esPiso = aInfo.w > 0.5 && aTecho.w > ${CUBIERTA.PATIO}.0 - 0.5 && aTecho.w < ${CUBIERTA.SOLAR}.0 + 0.5;
      vBase = aInfo.w < 0.5 || esPiso ? sueloEn(position.xz) : sueloEn(aAncla);
      vTerreno = aInfo.w < 0.5 ? terrenoEn(position.xz) : vec2(0.0);
      vPendiente = aInfo.w < 0.5 ? pendienteEn(position.xz) : vec2(0.0);
      transformed.y += aInfo.w < 0.5 || esPiso ? sueloEn(position.xz)
        : apoyoCasa(aAncla, transformed.xz, position.y < 0.01);`
