/**
 * Los árboles del plano de 1936 (datos/arboles.bin, ver specs/02): una sola InstancedMesh, un árbol por
 * instancia (copa low‑poly abollada + tronco), un draw call para los ~6 mil.
 * - Follaje en tres tonos (sombra, media tinta, luz) con el borde movido "como a mano"; en tinta, papel
 *   con la sombra rayada y el contorno a pluma (specs/04).
 * - Comparte con la ciudad los uniforms de tinta/color, la ola, las épocas y el relieve (ciudad.U): se
 *   apoyan en el suelo, suben con la misma ola y aparecen cuando nace su lugar.
 */
import {
  InstancedMesh, ShaderMaterial, IcosahedronGeometry, CylinderGeometry, BufferAttribute,
  InstancedBufferAttribute, Matrix4, Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { GLSL_RELIEVE } from './relieve.js'
import { GLSL_EPOCAS } from './shader/epocas.js'

const BYTES_POR_ARBOL = 8 // 4 × Uint16 LE: x, y (px del mosaico), radio (dm), nace (época)
const DM_POR_M = 10
const SOL = new Vector3(-1200, 2000, 900).normalize() // la misma dirección que la luz de main.js

/** arboles.bin → { n, x, y (px), radio (m), nace (época) }. */
export function decodificarArboles(buffer) {
  if (buffer.byteLength % BYTES_POR_ARBOL !== 0) throw new Error(`arboles: ${buffer.byteLength} bytes no es múltiplo de 8 bytes`)
  const n = buffer.byteLength / BYTES_POR_ARBOL
  const v = new DataView(buffer)
  const datos = { n, x: new Uint16Array(n), y: new Uint16Array(n), radio: new Float32Array(n), nace: new Uint16Array(n) }
  for (let i = 0; i < n; i++) {
    const o = i * BYTES_POR_ARBOL
    datos.x[i] = v.getUint16(o, true)
    datos.y[i] = v.getUint16(o + 2, true)
    datos.radio[i] = v.getUint16(o + 4, true) / DM_POR_M
    datos.nace[i] = v.getUint16(o + 6, true)
  }
  return datos
}

/** Del plano al mundo: posiciones (x, z), radios, nace y una semilla estable (0–65535) por árbol. */
export function instanciasArboles({ n, x, y, radio, nace }, coords) {
  const posiciones = new Float32Array(n * 2)
  const semillas = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const p = coords.aMundo(x[i], y[i])
    posiciones[i * 2] = p.x
    posiciones[i * 2 + 1] = p.z
    semillas[i] = (((x[i] * 73856093) ^ (y[i] * 19349663)) >>> 0) % 65536
  }
  return { posiciones, radios: Float32Array.from(radio), nace: Float32Array.from(nace), semillas }
}

/** Un árbol de radio 1: tronco (aParte = 1) y copa abollada (aParte = 0) un poco achatada. */
function geometriaArbol() {
  const copa = new IcosahedronGeometry(1, 1).scale(1, 0.85, 1).translate(0, 1.75, 0)
  const tronco = new CylinderGeometry(0.1, 0.14, 1.6, 5, 1, true).translate(0, 0.5, 0).toNonIndexed()
  const parte = (g, v) => g.setAttribute('aParte', new BufferAttribute(new Float32Array(g.attributes.position.count).fill(v), 1))
  for (const g of [copa, tronco]) g.deleteAttribute('uv')
  return mergeGeometries([parte(copa, 0), parte(tronco, 1)])
}

const VERTICE = /* glsl */ `
  uniform float uOla, uAnchoOla;
  ${GLSL_EPOCAS}
  ${GLSL_RELIEVE}
  attribute vec2 aArbol; // nace, semilla
  attribute float aParte;
  varying vec3 vNormal, vMundo; varying float vParte, vSemilla;
  float azar(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
  void main() {
    vec3 centro = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float radio = length(instanceMatrix[0].xyz);
    float dist = length(centro.xz);
    float s = aArbol.y;
    // sube con la ola, como las casas; y en la línea de tiempo, crece cuando nace su lugar
    float sube = smoothstep(0.0, 1.0, (uOla - dist - azar(s) * 60.0) / uAnchoOla);
    float nacio = vivoEn(vec2(aArbol.x, 0.0), epocaAqui(dist)); // los árboles no mueren
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
    gl_Position = projectionMatrix * viewMatrix * vec4(vMundo, 1.0);
  }`

const FRAGMENTO = /* glsl */ `
  uniform float uColor; uniform vec3 uSol;
  varying vec3 vNormal, vMundo; varying float vParte, vSemilla;
  float azar3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vMundo);
    // tres tonos: la luz del sol cuantizada, con manchas de follaje para que el corte no sea limpio
    float manchas = azar3(floor(vMundo * 0.7) + vSemilla) - 0.5;
    float luz = dot(N, uSol) * 0.5 + 0.5 + manchas * 0.22;
    float tono = vParte > 0.5 ? 0.0 : step(0.5, luz) + step(0.78, luz); // 0 sombra · 1 media tinta · 2 luz
    // el borde "como a mano": contorno donde la copa se da vuelta, con el grosor movido
    float vuelta = 1.0 - abs(dot(N, V));
    float borde = step(0.62 + 0.16 * azar3(floor(vMundo * 1.3)), vuelta);

    // color: tres verdes (valores lineales: la salida pasa a sRGB); el tronco, madera
    vec3 verde = tono < 0.5 ? vec3(0.035, 0.07, 0.025) : tono < 1.5 ? vec3(0.10, 0.17, 0.045) : vec3(0.30, 0.38, 0.09);
    verde *= 0.85 + 0.3 * fract(vSemilla * 0.618);
    vec3 enColor = vParte > 0.5 ? vec3(0.12, 0.07, 0.04) : mix(verde, verde * 0.45, borde);

    // tinta: papel, la sombra rayada en diagonal (más tupida en la sombra), contorno a pluma
    vec3 papel = vec3(0.80, 0.69, 0.50), tinta = vec3(0.024, 0.015, 0.011);
    float diag = fract((gl_FragCoord.x + gl_FragCoord.y) / 4.0);
    float raya = tono < 0.5 ? step(0.45, diag) : tono < 1.5 ? step(0.75, diag) : 0.0;
    float pluma = max(max(raya, borde), vParte);
    vec3 enTinta = mix(papel, tinta, pluma * 0.9);

    gl_FragColor = vec4(mix(enTinta, enColor, uColor), 1.0);
    #include <colorspace_fragment>
  }`

/** La malla de los árboles; `U` son los uniforms de la ciudad (crearMaterialCiudad), compartidos. */
export function crearArboles({ datos, coords, U, sol = SOL }) {
  const { posiciones, radios, nace, semillas } = instanciasArboles(datos, coords)
  const geometria = geometriaArbol()
  const arbol = new Float32Array(datos.n * 2)
  for (let i = 0; i < datos.n; i++) [arbol[i * 2], arbol[i * 2 + 1]] = [nace[i], semillas[i]]
  geometria.setAttribute('aArbol', new InstancedBufferAttribute(arbol, 2))

  const comunes = ['uColor', 'uOla', 'uAnchoOla', 'uEpocaDe', 'uEpocaA', 'uOlaEpoca',
    'tRelieve', 'uRelieveHoja', 'uRelieveCelda', 'uExageracion']
  const material = new ShaderMaterial({
    uniforms: { ...Object.fromEntries(comunes.map((k) => [k, U[k]])), uSol: { value: sol.clone().normalize() } },
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
  })
  const malla = new InstancedMesh(geometria, material, datos.n)
  const m = new Matrix4()
  for (let i = 0; i < datos.n; i++) {
    const r = radios[i]
    malla.setMatrixAt(i, m.makeScale(r, r, r).setPosition(posiciones[i * 2], 0, posiciones[i * 2 + 1]))
  }
  malla.instanceMatrix.needsUpdate = true
  malla.frustumCulled = false // el relieve y la ola los mueven en el shader: la esfera de la CPU no sirve
  malla.name = 'arboles'
  return malla
}

/** Descarga arboles.bin y arma la malla (null si el dato no está: los árboles son opcionales). */
export async function cargarArboles(url, opciones) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  if ((r.headers.get('content-type') ?? '').includes('html')) throw new Error(`${url}: no está (fallback HTML)`)
  return crearArboles({ ...opciones, datos: decodificarArboles(await r.arrayBuffer()) })
}
