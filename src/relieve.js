/**
 * El relieve del valle (datos/relieve.bin, ver specs/02): Uint16 LE [w, h, alturas en dm…],
 * fila 0 = borde norte de la hoja, columna 0 = borde oeste; cada celda es un centro de una grilla
 * regular que cubre la hoja entera. En el mundo, la altura es relativa a la Plaza Bolívar (y = 0).
 *
 * "Todo se apoya en el terreno": el vertex shader muestrea la textura half-float y suma la altura.
 * El terreno se hincha con la misma ola que levanta la ciudad: acostado, la hoja es lisa.
 */
import {
  DataTexture, DataUtils, RedFormat, HalfFloatType, LinearFilter, ClampToEdgeWrapping, Vector2, Vector4,
} from 'three'

const DM_POR_M = 10
const MARGEN_PIE_M = 0.5 // el pie de las paredes baja un poco más que el suelo, para no dejar rendijas

export function decodificarRelieve(buffer) {
  if (buffer.byteLength < 4) throw new Error('relieve: buffer truncado (sin cabecera)')
  const v = new DataView(buffer)
  const w = v.getUint16(0, true)
  const h = v.getUint16(2, true)
  if (!(w > 0 && h > 0)) throw new Error(`relieve: dimensiones inválidas (${w}×${h})`)
  if (buffer.byteLength < 2 * (2 + w * h)) throw new Error(`relieve: buffer truncado (${w}×${h})`)
  const alturas = new Float32Array(w * h)
  for (let i = 0; i < alturas.length; i++) alturas[i] = v.getUint16(4 + 2 * i, true) / DM_POR_M
  return { w, h, alturas }
}

const acotar = (x, a, b) => Math.min(b, Math.max(a, x))

/** Bilineal con u (este) y v (sur) en [0, 1] sobre la hoja; fuera de ella repite el borde. */
export function muestrear({ w, h, alturas }, u, v) {
  const fx = acotar(u * w - 0.5, 0, w - 1)
  const fy = acotar(v * h - 0.5, 0, h - 1)
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const x1 = Math.min(x0 + 1, w - 1)
  const y1 = Math.min(y0 + 1, h - 1)
  const tx = fx - x0
  const ty = fy - y0
  const a = alturas[y0 * w + x0] * (1 - tx) + alturas[y0 * w + x1] * tx
  const b = alturas[y1 * w + x0] * (1 - tx) + alturas[y1 * w + x1] * tx
  return a * (1 - ty) + b * ty
}

/** alturaEn(x, z): metros sobre la plaza en el punto del mundo, sin exagerar ni hinchar. */
export function crearRelieve(datos, hoja) {
  const absoluta = (x, z) => muestrear(datos, (x - hoja.x0) / hoja.ancho, (z - hoja.z0) / hoja.alto)
  const referencia = absoluta(0, 0)
  return Object.freeze({ ...datos, hoja, referencia, alturaEn: (x, z) => absoluta(x, z) - referencia })
}

const suave = (t) => { const x = acotar(t, 0, 1); return x * x * (3 - 2 * x) }

/** Cuánto se hinchó el suelo a `dist` metros de la plaza (el mismo frente que la ciudad). */
export const hinchado = (dist, ola, anchoOla) => suave((ola - dist) / anchoOla)

/** La altura del suelo que se está dibujando (la que usa la cámara): igual que sueloEn() del shader. */
export function alturaSuelo(relieve, x, z, { ola, anchoOla, exageracion }) {
  if (!relieve) return 0
  return relieve.alturaEn(x, z) * exageracion * hinchado(Math.hypot(x, z), ola, anchoOla)
}

function textura(datos, w, h) {
  const t = new DataTexture(datos, w, h, RedFormat, HalfFloatType)
  t.minFilter = t.magFilter = LinearFilter
  t.wrapS = t.wrapT = ClampToEdgeWrapping
  t.generateMipmaps = false
  t.needsUpdate = true
  return t
}

/** Half-float (canal R) con la altura relativa a la plaza: cerca de 0 la precisión es fina. */
export function texturaRelieve(relieve) {
  const { w, h, alturas, referencia } = relieve
  const datos = new Uint16Array(w * h)
  for (let i = 0; i < datos.length; i++) datos[i] = DataUtils.toHalfFloat(alturas[i] - referencia)
  return textura(datos, w, h)
}

/** Uniforms compartidos por la ciudad y el suelo. Sin datos, el relieve es plano. */
export function uniformsRelieve(hoja) {
  return {
    tRelieve: { value: textura(new Uint16Array([DataUtils.toHalfFloat(0)]), 1, 1) },
    uRelieveHoja: { value: new Vector4(hoja.x0, hoja.z0, hoja.ancho, hoja.alto) },
    uRelieveCelda: { value: new Vector2(hoja.ancho, hoja.alto) }, // metros por celda
    uExageracion: { value: 1 },
  }
}

/** Pone los datos en los uniforms (después de cargar relieve.bin). */
export function ponerRelieve(U, relieve) {
  U.tRelieve.value.dispose()
  U.tRelieve.value = texturaRelieve(relieve)
  U.uRelieveCelda.value.set(relieve.hoja.ancho / relieve.w, relieve.hoja.alto / relieve.h)
}

/** GLSL del vertex shader. Necesita uOla y uAnchoOla declarados por quien lo incluye. */
export const GLSL_RELIEVE = /* glsl */ `
  uniform sampler2D tRelieve; uniform vec4 uRelieveHoja; uniform vec2 uRelieveCelda; uniform float uExageracion;
  float relieveCrudo(vec2 xz) { return texture2D(tRelieve, (xz - uRelieveHoja.xy) / uRelieveHoja.zw).r; }
  // el suelo se hincha con la misma ola que levanta la ciudad
  float sueloEn(vec2 xz) {
    return relieveCrudo(xz) * uExageracion * smoothstep(0.0, 1.0, (uOla - length(xz)) / uAnchoOla);
  }
  // normal por diferencias finitas, una celda a cada lado
  vec3 normalSuelo(vec2 xz) {
    vec2 d = uRelieveCelda;
    float dx = sueloEn(xz + vec2(d.x, 0.0)) - sueloEn(xz - vec2(d.x, 0.0));
    float dz = sueloEn(xz + vec2(0.0, d.y)) - sueloEn(xz - vec2(0.0, d.y));
    return normalize(vec3(-dx / (2.0 * d.x), 1.0, -dz / (2.0 * d.y)));
  }
  // el terreno tal cual es (sin la ola ni la exageración): altura sobre la plaza (m) y pendiente (m/m)
  vec2 terrenoEn(vec2 xz) {
    vec2 d = uRelieveCelda;
    float dx = relieveCrudo(xz + vec2(d.x, 0.0)) - relieveCrudo(xz - vec2(d.x, 0.0));
    float dz = relieveCrudo(xz + vec2(0.0, d.y)) - relieveCrudo(xz - vec2(0.0, d.y));
    return vec2(relieveCrudo(xz), length(vec2(dx / (2.0 * d.x), dz / (2.0 * d.y))));
  }
  // las casas suben enteras a la altura de su ancla; el pie baja hasta el suelo para no flotar
  float apoyoCasa(vec2 ancla, vec2 xz, bool esPie) {
    float s = sueloEn(ancla);
    return esPie ? min(s, sueloEn(xz)) - ${MARGEN_PIE_M.toFixed(1)} : s;
  }
`
