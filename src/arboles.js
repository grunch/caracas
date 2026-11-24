/**
 * Los árboles del plano de 1936 y el monte del valle antes de la ciudad (datos/arboles.bin, ver
 * specs/02): un árbol por instancia (copa low‑poly abollada + tronco). Los del monte (silvestres) mueren
 * cuando su lugar se urbaniza y solo se ven en color.
 * - Son 37 mil, y enteros (90 triángulos cada uno) pesaban más que todas las casas. Van repartidos en grupos
 *   por baldosa de LADO_BALDOSA_ARBOLES_M y por vida (nace, muere, silvestre), y cada grupo tiene dos mallas
 *   instanciadas que comparten sus instancias: la de cerca, con el árbol entero, y la de lejos, con la copa en
 *   20 triángulos y sin tronco (a más de DIST_DETALLE_M un árbol mide pocos píxeles). `actualizar` prende, de
 *   cada grupo, la que toca: ninguna si en la época que se mira no vive, o si es monte y se mira en tinta.
 *   three.js saltea además los grupos que quedan fuera de la vista.
 * - Follaje en tres tonos (sombra, media tinta, luz) con el borde movido "como a mano"; en tinta, papel
 *   con la sombra rayada y el contorno a pluma (specs/04).
 * - Comparte con la ciudad los uniforms de tinta/color, la ola, las épocas y el relieve (ciudad.U): se
 *   apoyan en el suelo, suben con la misma ola y aparecen cuando nace su lugar.
 */
import {
  InstancedMesh, ShaderMaterial, IcosahedronGeometry, CylinderGeometry, BufferAttribute, BufferGeometry,
  InstancedBufferAttribute, Matrix4, Group, Sphere, Vector3,
} from 'three'
import { seVeEntre, esferaSobreRelieve, alturasBajo } from './baldosas.js'
import { SIN_LINEA_DE_TIEMPO } from './epocas.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { GLSL_RELIEVE, UNIFORMS_RELIEVE } from './relieve.js'
import { GLSL_EPOCAS } from './shader/epocas.js'
import { GLSL_SOMBRA, UNIFORMS_DE_LUZ, uniformsDeLuz } from './shader/sombra.js'

export const LADO_BALDOSA_ARBOLES_M = 2048
export const DIST_DETALLE_M = 1200 // más lejos que esto, la copa simple (el fragment ya lo aplana desde ahí)
const ALTO_DE_ARBOL = 3 // en radios: hasta dónde llega la copa más alta, con sus bultos
const MARGEN_RELIEVE_M = 15

const BYTES_POR_ARBOL = 8 // 4 × Uint16 LE: x, y (px del mosaico), radio (dm), vida (nace + 8·muere + 64·silvestre)
const DM_POR_M = 10

/**
 * arboles.bin → { n, x, y (px), radio (m), nace, muere (épocas; muere = 0: no muere), silvestre (0/1) }.
 * Los silvestres son el monte del valle antes de la ciudad: mueren cuando su lugar se urbaniza.
 */
export function decodificarArboles(buffer) {
  if (buffer.byteLength % BYTES_POR_ARBOL !== 0) throw new Error(`arboles: ${buffer.byteLength} bytes no es múltiplo de 8 bytes`)
  const n = buffer.byteLength / BYTES_POR_ARBOL
  const v = new DataView(buffer)
  const datos = {
    n, x: new Uint16Array(n), y: new Uint16Array(n), radio: new Float32Array(n),
    nace: new Uint16Array(n), muere: new Uint16Array(n), silvestre: new Uint8Array(n),
  }
  for (let i = 0; i < n; i++) {
    const o = i * BYTES_POR_ARBOL
    datos.x[i] = v.getUint16(o, true)
    datos.y[i] = v.getUint16(o + 2, true)
    datos.radio[i] = v.getUint16(o + 4, true) / DM_POR_M
    const vida = v.getUint16(o + 6, true)
    datos.nace[i] = vida & 7
    datos.muere[i] = (vida >> 3) & 7
    datos.silvestre[i] = (vida >> 6) & 1
  }
  return datos
}

/** Del plano al mundo: posiciones (x, z), radios, nace, muere, silvestre y una semilla estable (0–65535) por árbol. */
export function instanciasArboles({ n, x, y, radio, nace, muere, silvestre }, coords) {
  const posiciones = new Float32Array(n * 2)
  const semillas = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const p = coords.aMundo(x[i], y[i])
    posiciones[i * 2] = p.x
    posiciones[i * 2 + 1] = p.z
    semillas[i] = (((x[i] * 73856093) ^ (y[i] * 19349663)) >>> 0) % 65536
  }
  return {
    posiciones, radios: Float32Array.from(radio), nace: Float32Array.from(nace), semillas,
    muere: muere ? Float32Array.from(muere) : new Float32Array(n),
    silvestre: silvestre ? Float32Array.from(silvestre) : new Float32Array(n),
  }
}

/** Un árbol de radio 1: tronco (aParte = 1) y copa abollada (aParte = 0) un poco achatada. */
function geometriaArbol() {
  const copa = new IcosahedronGeometry(1, 1).scale(1, 0.85, 1).translate(0, 1.75, 0)
  const tronco = new CylinderGeometry(0.1, 0.14, 1.6, 5, 1, true).translate(0, 0.5, 0).toNonIndexed()
  const parte = (g, v) => g.setAttribute('aParte', new BufferAttribute(new Float32Array(g.attributes.position.count).fill(v), 1))
  for (const g of [copa, tronco]) g.deleteAttribute('uv')
  return mergeGeometries([parte(copa, 0), parte(tronco, 1)])
}

/** La copa sola, sin subdividir (20 triángulos): el árbol de lejos. */
function geometriaArbolLejos() {
  const copa = new IcosahedronGeometry(1, 0).scale(1, 0.85, 1).translate(0, 1.75, 0)
  copa.deleteAttribute('uv')
  return copa.setAttribute('aParte', new BufferAttribute(new Float32Array(copa.attributes.position.count), 1))
}

/**
 * Los árboles agrupados por baldosa y por vida: [{ id, nace, muere, silvestre, indices }], en un orden
 * estable. Los de un grupo se prenden y se apagan juntos.
 */
export function gruposDeArboles({ posiciones, nace, muere, silvestre }, lado = LADO_BALDOSA_ARBOLES_M) {
  const porClave = new Map()
  for (let k = 0; k < nace.length; k++) {
    const i = Math.floor(posiciones[k * 2] / lado), j = Math.floor(posiciones[k * 2 + 1] / lado)
    const id = `${i},${j}|${nace[k]}-${muere[k]}${silvestre[k] ? 's' : ''}`
    const grupo = porClave.get(id)
    if (grupo) grupo.indices.push(k)
    else porClave.set(id, { id, nace: nace[k], muere: muere[k], silvestre: Boolean(silvestre[k]), indices: [k] })
  }
  return [...porClave.values()]
}

/**
 * Qué malla de un grupo se dibuja: 'cerca', 'lejos' o null. `epocas`: de qué época a cuál va la ola; `color`:
 * cuánto color hay (0 = tinta); `distancia`: metros de la cámara al borde del grupo.
 */
export function detalleDeGrupo({ nace, muere, silvestre }, { epocas, color, distancia }) {
  if (!seVeEntre(nace, muere, epocas[0], epocas[1])) return null
  if (silvestre && !(color > 0)) return null // el monte solo se ve en color
  return distancia < DIST_DETALLE_M ? 'cerca' : 'lejos'
}

const VERTICE = /* glsl */ `
  uniform float uOla, uAnchoOla, uColor;
  ${GLSL_EPOCAS}
  ${GLSL_RELIEVE}
  attribute vec4 aArbol; // nace, muere (0 = no muere), semilla, silvestre
  attribute float aParte;
  varying vec3 vNormal, vMundo; varying float vParte, vSemilla, vSilvestre;
  float azar(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
  void main() {
    vec3 centro = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float radio = length(instanceMatrix[0].xyz);
    float dist = length(centro.xz);
    float s = aArbol.z;
    // sube con la ola, como las casas; y en la línea de tiempo, crece cuando nace su lugar
    float sube = smoothstep(0.0, 1.0, (uOla - dist - azar(s) * 60.0) / uAnchoOla);
    // los del monte mueren cuando su lugar se urbaniza, y solo se ven en color
    float nacio = vivoEn(aArbol.xy, epocaAqui(dist)) * mix(1.0, uColor, aArbol.w);
    vec3 p = position;
    vec3 n = normal;
    if (aParte < 0.5) {
      // la copa abollada: cada árbol con sus bultos, para que el borde no sea un círculo
      vec3 d = normalize(p - vec3(0.0, 1.75, 0.0));
      float bulto = 0.16 * sin(d.x * 4.0 + s) * sin(d.z * 5.0 + s * 1.7) + 0.1 * sin(d.y * 7.0 + s * 2.3);
      p += d * bulto;
      p.y *= 0.9 + 0.25 * azar(s * 3.1); // unos más altos que otros
    }
    float giro = azar(s * 1.3) * 6.2832;
    mat2 r = mat2(cos(giro), -sin(giro), sin(giro), cos(giro));
    p.xz = r * p.xz;
    n.xz = r * n.xz;
    vec3 mundo = centro + p * radio * sube * nacio;
    mundo.y += sueloEn(centro.xz);
    vMundo = (modelMatrix * vec4(mundo, 1.0)).xyz;
    vNormal = normalize(mat3(modelMatrix) * n);
    vParte = aParte;
    vSemilla = s;
    vSilvestre = aArbol.w;
    gl_Position = projectionMatrix * viewMatrix * vec4(vMundo, 1.0);
  }`

const FRAGMENTO = /* glsl */ `
  uniform float uColor;
  varying vec3 vNormal, vMundo; varying float vParte, vSemilla, vSilvestre;
  ${GLSL_SOMBRA}
  float azar3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vMundo);
    // tres tonos: la luz del sol cuantizada, con manchas de follaje para que el corte no sea limpio
    float manchas = azar3(floor(vMundo * 0.7) + vSemilla) - 0.5;
    float luz = dot(N, uSol) * 0.5 + 0.5 + manchas * 0.22;
    // la sombra que le tiran las casas y los otros árboles (leída mirando al sol: la propia ya está en luz)
    luz *= mix(0.62, 1.0, solEn(vMundo, normalize(N + 1.5 * uSol)));
    float tono = vParte > 0.5 ? 0.0 : step(0.5, luz) + step(0.78, luz); // 0 sombra · 1 media tinta · 2 luz
    // el borde "como a mano": contorno donde la copa se da vuelta, con el grosor movido
    float vuelta = 1.0 - abs(dot(N, V));
    float borde = step(0.62 + 0.16 * azar3(floor(vMundo * 1.3)), vuelta);

    // color: tres verdes (valores lineales: la salida pasa a sRGB); el tronco, madera
    vec3 verde = tono < 0.5 ? vec3(0.035, 0.07, 0.025) : tono < 1.5 ? vec3(0.10, 0.17, 0.045) : vec3(0.30, 0.38, 0.09);
    verde *= 0.85 + 0.3 * fract(vSemilla * 0.618);
    // el monte: unos más secos y amarillentos que otros, como la sabana del valle
    verde = mix(verde, verde * vec3(1.25, 1.05, 0.7), vSilvestre * fract(vSemilla * 0.377));
    vec3 enColor = vParte > 0.5 ? vec3(0.12, 0.07, 0.04) : mix(verde, verde * 0.45, borde);
    // de lejos un árbol es un punto: sin esto, la sombra y el borde serían pimienta sobre el campo
    float lejos = smoothstep(1200.0, 4500.0, distance(cameraPosition, vMundo));
    enColor = mix(enColor, vec3(0.085, 0.14, 0.04) * (0.85 + 0.3 * fract(vSemilla * 0.618)), 0.8 * lejos);

    // tinta: papel, la sombra rayada en diagonal (más tupida en la sombra), contorno a pluma
    vec3 papel = vec3(0.80, 0.69, 0.50), tinta = vec3(0.024, 0.015, 0.011);
    float diag = fract((gl_FragCoord.x + gl_FragCoord.y) / 4.0);
    float raya = tono < 0.5 ? step(0.45, diag) : tono < 1.5 ? step(0.75, diag) : 0.0;
    float pluma = max(max(raya, borde), vParte);
    vec3 enTinta = mix(papel, tinta, pluma * 0.9);

    gl_FragColor = vec4(mix(enTinta, enColor, uColor), 1.0);
    #include <colorspace_fragment>
  }`

/** Una geometría con los atributos de `base` (compartidos, no copiados) y las instancias de un grupo. */
function geometriaDeGrupo(base, arbol) {
  const g = new BufferGeometry()
  for (const [nombre, atributo] of Object.entries(base.attributes)) g.setAttribute(nombre, atributo)
  if (base.index) g.setIndex(base.index)
  return g.setAttribute('aArbol', arbol)
}

/**
 * Los árboles: un grupo ('arboles') con dos mallas instanciadas por cada grupo de árboles (userData.grupos).
 * `U` son los uniforms de la ciudad (crearMaterialCiudad), compartidos. El grupo lleva además `material` y
 * `customDepthMaterial` (los de todas sus mallas), `count` (cuántos árboles) y `actualizar(...)`.
 */
export function crearArboles({ datos, coords, U }) {
  const instancias = instanciasArboles(datos, coords)
  const { posiciones, radios, nace, muere, semillas, silvestre } = instancias
  const [entero, simple] = [geometriaArbol(), geometriaArbolLejos()]

  const comunes = ['uColor', 'uOla', 'uAnchoOla', 'uEpocaDe', 'uEpocaA', 'uOlaEpoca',
    ...UNIFORMS_RELIEVE]
  // el sol y el mapa de sombras son los de la ciudad; sin ellos (un U a medias), los de respaldo: el sol de
  // siempre y el mapa apagado (el sampler de sombra necesita su entrada aunque no se lea)
  const luz = Object.fromEntries(UNIFORMS_DE_LUZ.filter((k) => U[k]).map((k) => [k, U[k]]))
  const uniforms = { ...uniformsDeLuz(), ...Object.fromEntries(comunes.map((k) => [k, U[k]])), ...luz }
  const material = new ShaderMaterial({ uniforms, vertexShader: VERTICE, fragmentShader: FRAGMENTO })
  // vistos desde el sol (src/acabado.js): el mismo vértice, sin color
  const materialDeSombra = new ShaderMaterial({ uniforms, vertexShader: VERTICE, fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }' })

  const grupo = new Group()
  grupo.name = 'arboles'
  const m = new Matrix4()
  const grupos = gruposDeArboles(instancias).map(({ indices, ...vida }) => {
    const arbol = new InstancedBufferAttribute(new Float32Array(indices.length * 4), 4)
    let [x0, x1, z0, z1, alto] = [Infinity, -Infinity, Infinity, -Infinity, 0]
    const crear = (base, nombre) => {
      const malla = new InstancedMesh(geometriaDeGrupo(base, arbol), material, indices.length)
      malla.customDepthMaterial = materialDeSombra
      malla.castShadow = true
      malla.name = `arboles ${vida.id} · ${nombre}`
      return malla
    }
    const cerca = crear(entero, 'cerca')
    const lejos = crear(simple, 'lejos')
    indices.forEach((k, n) => {
      const [x, z, r] = [posiciones[k * 2], posiciones[k * 2 + 1], radios[k]]
      arbol.array.set([nace[k], muere[k], semillas[k], silvestre[k]], n * 4)
      cerca.setMatrixAt(n, m.makeScale(r, r, r).setPosition(x, 0, z))
      x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); z0 = Math.min(z0, z - r); z1 = Math.max(z1, z + r)
      alto = Math.max(alto, r * ALTO_DE_ARBOL)
    })
    // las dos mallas comparten las instancias: una sola copia de las matrices
    lejos.instanceMatrix = cerca.instanceMatrix
    cerca.instanceMatrix.needsUpdate = true
    // la esfera del grupo sobre la hoja lisa; `actualizar` la apoya en el relieve, donde el shader lo dibuja
    const esfera = { centro: [(x0 + x1) / 2, alto / 2, (z0 + z1) / 2], radio: Math.hypot(x1 - x0, alto, z1 - z0) / 2 }
    lejos.visible = false
    grupo.add(cerca, lejos)
    return { ...vida, cuantos: indices.length, cerca, lejos, esfera, apoyada: null }
  })

  let relieveVisto
  const ojo = new Vector3()
  /**
   * Prende de cada grupo la malla que toca para lo que se mira (detalleDeGrupo). `camara`: la de la vista;
   * `epocas`: [de, a]; `color`: uColor; `alturaEn(x, z)`: la altura a la que el shader sube el suelo (null: la
   * hoja lisa). Devuelve cuántos árboles quedan de cerca y de lejos.
   */
  grupo.actualizar = ({ camara, epocas = [SIN_LINEA_DE_TIEMPO, SIN_LINEA_DE_TIEMPO], color = 0, alturaEn = null }) => {
    ojo.setFromMatrixPosition(camara.matrixWorld)
    const cuenta = { cerca: 0, lejos: 0 }
    for (const g of grupos) {
      if (!g.apoyada || alturaEn !== relieveVisto) {
        const { yMin, yMax } = alturaEn ? alturasBajo(g.esfera, alturaEn) : { yMin: 0, yMax: 0 }
        const e = esferaSobreRelieve(g.esfera, yMin, yMax, alturaEn ? MARGEN_RELIEVE_M : 0)
        g.apoyada = new Sphere(new Vector3(...e.centro), e.radio)
        g.cerca.boundingSphere = g.lejos.boundingSphere = g.apoyada
      }
      const detalle = detalleDeGrupo(g, { epocas, color, distancia: ojo.distanceTo(g.apoyada.center) - g.apoyada.radius })
      g.cerca.visible = detalle === 'cerca'
      g.lejos.visible = detalle === 'lejos'
      if (detalle) cuenta[detalle] += g.cuantos
    }
    relieveVisto = alturaEn
    return cuenta
  }
  Object.assign(grupo, { material, customDepthMaterial: materialDeSombra, castShadow: true, count: datos.n })
  grupo.userData.grupos = grupos
  return grupo
}

/** Descarga arboles.bin y arma la malla (null si el dato no está: los árboles son opcionales). */
export async function cargarArboles(url, opciones) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  if ((r.headers.get('content-type') ?? '').includes('html')) throw new Error(`${url}: no está (fallback HTML)`)
  return crearArboles({ ...opciones, datos: decodificarArboles(await r.arrayBuffer()) })
}
