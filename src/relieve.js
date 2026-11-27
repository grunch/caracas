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

const SUBDIVISION_HOJA = Object.freeze([384, 306]) // la hoja se hincha con el relieve (≈ 24 m por cuadro)
const SUBDIVISION_HOJA_SOFTWARE = Object.freeze([96, 77]) // dibujando la CPU, el suelo era el 90 % de cada cuadro

/** En cuántos cuadros se subdivide la hoja del plano: más grueso si el WebGL lo dibuja la CPU (src/luz.js). */
export const subdivisionDeLaHoja = (software) => [...(software ? SUBDIVISION_HOJA_SOFTWARE : SUBDIVISION_HOJA)]

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

const suave = (t) => { const x = acotar(t, 0, 1); return x * x * (3 - 2 * x) }

/**
 * Terrazas: un hito grande (una manzana entera, como el convento de las Concepciones y el Capitolio) se apoya en
 * un solo punto, su ancla, y es plano; en una ladera, el suelo de la ciudad le tapaba la mitad alta (src/hitos/
 * material.js). Dentro de su rectángulo el suelo sigue un plano, el que mejor se ajusta al terreno (mínimos
 * cuadrados), y el talud va afuera, en la calle, en TALUD_M; el hito apoya cada vértice en ese plano (pisoDeHito):
 * se corre en vertical con la ladera, con las paredes a plomo. Con el piso horizontal (a la altura del centro), el
 * lado de arriba quedaba en un pozo bajo la calle (el convento, ~6 m en su esquina noroeste) y el de abajo, sobre un
 * zócalo. Lo usan el shader (sueloEn, pisoDeHito) y la cámara (alturaEn).
 */
export const TALUD_M = 4
export const MAX_TERRAZAS = 5 // Cuatro existentes + el plano de apoyo compartido de La Concordia/Rotunda.
/** Cuánto adentro del borde deja de dibujarse el suelo: lo tapa la plataforma del hito (src/material.js). */
const TAPADO_M = 0.5

/** Las terrazas de los hitos que la piden (`terraza: { ancho, fondo }` en metros, centrada en su ancla y su eje). */
export function terrazasDeHitos(hitos, coords) {
  return hitos.filter((h) => h.terraza).map((h) => {
    const { x, z } = coords.aMundo(h.x, h.y)
    const n = Math.hypot(h.eje[0], h.eje[1])
    return { x, z, eje: [h.eje[0] / n, h.eje[1] / n], medioA: h.terraza.ancho / 2, medioB: h.terraza.fondo / 2, vida: [h.nace ?? 0, h.muere ?? 0] }
  })
}

/** (x, z) del mundo en el marco de la terraza `t`: a lo largo de su eje y a su derecha. */
const enMarco = (t, x, z) => [(x - t.x) * t.eje[0] + (z - t.z) * t.eje[1], -(x - t.x) * t.eje[1] + (z - t.z) * t.eje[0]]

/**
 * El plano que mejor se ajusta al terreno (`absoluta`) en el rectángulo de la terraza `t`: altura = c0 + c1·a + c2·b
 * en su marco. Lo muestrea de borde a borde cada media celda del relieve; con la grilla simétrica, las sumas
 * cruzadas se anulan y cada coeficiente sale por su lado.
 */
function planoDeTerraza(t, absoluta, celda) {
  const puntos = (medio) => {
    const n = Math.max(2, Math.ceil((2 * medio) / (celda / 2)))
    return Array.from({ length: n + 1 }, (_, i) => -medio + (2 * medio * i) / n)
  }
  const [as, bs] = [puntos(t.medioA), puntos(t.medioB)]
  let [s0, sa, sb, aa, bb] = [0, 0, 0, 0, 0]
  for (const a of as) for (const b of bs) {
    const h = absoluta(t.x + a * t.eje[0] - b * t.eje[1], t.z + a * t.eje[1] + b * t.eje[0])
    s0 += h; sa += a * h; sb += b * h; aa += a * a; bb += b * b
  }
  return Object.freeze({ c0: s0 / (as.length * bs.length), c1: sa / aa, c2: sb / bb })
}

/** La altura `alto` con la terraza `t` (con su `plano`) puesta en (x, z): la misma cuenta que conTerrazas(). */
function conTerraza(t, plano, x, z, alto) {
  const [a, b] = enMarco(t, x, z)
  const fuera = Math.max(Math.abs(a) - t.medioA, Math.abs(b) - t.medioB)
  const piso = plano.c0 + plano.c1 * a + plano.c2 * b
  return alto + (piso - alto) * (1 - suave(fuera / TALUD_M))
}

/** alturaEn(x, z): metros sobre la plaza en el punto del mundo, sin exagerar ni hinchar (con las terrazas). */
export function crearRelieve(datos, hoja, terrazas = []) {
  const absoluta = (x, z) => muestrear(datos, (x - hoja.x0) / hoja.ancho, (z - hoja.z0) / hoja.alto)
  const referencia = absoluta(0, 0)
  const celda = Math.min(hoja.ancho / datos.w, hoja.alto / datos.h)
  const relativa = (x, z) => absoluta(x, z) - referencia
  const planos = Object.freeze(terrazas.map((t) => planoDeTerraza(t, relativa, celda)))
  const alturaEn = (x, z) => terrazas.reduce((h, t, i) => conTerraza(t, planos[i], x, z, h), relativa(x, z))
  return Object.freeze({ ...datos, hoja, referencia, terrazas: Object.freeze([...terrazas]), planos, alturaEn })
}

/**
 * La altura del suelo tal como se dibuja en (x, z): la hoja es una malla de cuadros de `celda` = [ancho, alto]
 * metros partidos por una diagonal (PlaneGeometry: del vértice sur-oeste al nor-este), con la altura exacta
 * (`alturaEn`) solo en los vértices; adentro va recta. Con la malla gruesa del render por software (96 m), ese
 * suelo se aparta decímetros del relieve: lo que tiene que empalmar con él a ras (el lecho y la rasante de un
 * puente) usa esta altura y no la del relieve. Espejo de sueloDibujado() (GLSL_SUELO_DIBUJADO).
 */
export function sueloDibujadoEn(alturaEn, hoja, celda, x, z) {
  if (!celda || !(celda[0] > 0 && celda[1] > 0)) return alturaEn(x, z)
  const [qx, qz] = [(x - hoja.x0) / celda[0], (z - hoja.z0) / celda[1]]
  const [cx, cz] = [Math.floor(qx), Math.floor(qz)]
  const [fx, fz] = [qx - cx, qz - cz]
  const en = (i, k) => alturaEn(hoja.x0 + (cx + i) * celda[0], hoja.z0 + (cz + k) * celda[1])
  const [sur, este] = [en(0, 1), en(1, 0)]
  if (fx + fz <= 1) { const a = en(0, 0); return a + fx * (este - a) + fz * (sur - a) }
  const c = en(1, 1)
  return c + (1 - fx) * (sur - c) + (1 - fz) * (este - c)
}

/** El tamaño de los cuadros de la hoja, para sueloDibujado(): se pone al armar la malla del suelo (src/main.js). */
export function ponerMallaDelSuelo(U, hoja, [cuadrosX, cuadrosZ]) {
  U.uMallaSuelo.value.set(hoja.ancho / cuadrosX, hoja.alto / cuadrosZ)
}

/**
 * GLSL (después de GLSL_RELIEVE): el suelo tal como se dibuja, interpolado en su malla. Sin malla puesta
 * (uMallaSuelo en cero), es el relieve mismo.
 */
export const GLSL_SUELO_DIBUJADO = /* glsl */ `
  uniform vec2 uMallaSuelo;
  float sueloDibujado(vec2 xz) {
    if (uMallaSuelo.x <= 0.0) return sueloEn(xz);
    vec2 q = (xz - uRelieveHoja.xy) / uMallaSuelo;
    vec2 c = floor(q), f = q - c, o = uRelieveHoja.xy + c * uMallaSuelo;
    float sur = sueloEn(o + vec2(0.0, uMallaSuelo.y)), este = sueloEn(o + vec2(uMallaSuelo.x, 0.0));
    if (f.x + f.y <= 1.0) { float a = sueloEn(o); return a + f.x * (este - a) + f.y * (sur - a); }
    float d = sueloEn(o + uMallaSuelo);
    return d + (1.0 - f.x) * (sur - d) + (1.0 - f.y) * (este - d);
  }
`

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

/** Los uniforms que lee GLSL_RELIEVE: los materiales que lo incluyen (hitos, árboles) copian estos de la ciudad. */
export const UNIFORMS_RELIEVE = Object.freeze(['tRelieve', 'uRelieveHoja', 'uRelieveCelda', 'uExageracion', 'uTerrazaMarco', 'uTerrazaMedida', 'uTerrazaPendiente'])

/** Uniforms compartidos por la ciudad y el suelo. Sin datos, el relieve es plano (y las terrazas, inactivas). */
export function uniformsRelieve(hoja, terrazas = []) {
  if (terrazas.length > MAX_TERRAZAS) throw new Error(`relieve: ${terrazas.length} terrazas; el shader admite ${MAX_TERRAZAS}`)
  const marco = Array.from({ length: MAX_TERRAZAS }, (_, i) => terrazas[i] ? new Vector4(terrazas[i].x, terrazas[i].z, ...terrazas[i].eje) : new Vector4(0, 0, 1, 0))
  const medida = Array.from({ length: MAX_TERRAZAS }, (_, i) => terrazas[i] ? new Vector4(terrazas[i].medioA, terrazas[i].medioB, 0, 0) : new Vector4(0, 0, 0, 0))
  return {
    tRelieve: { value: textura(new Uint16Array([DataUtils.toHalfFloat(0)]), 1, 1) },
    uRelieveHoja: { value: new Vector4(hoja.x0, hoja.z0, hoja.ancho, hoja.alto) },
    uRelieveCelda: { value: new Vector2(hoja.ancho, hoja.alto) }, // metros por celda
    uExageracion: { value: 1 },
    uMallaSuelo: { value: new Vector2(0, 0) }, // metros por cuadro de la malla del suelo (0: sin malla; ponerMallaDelSuelo)
    uTerrazaMarco: { value: marco }, // (x, z, eje) en metros del mundo
    uTerrazaMedida: { value: medida }, // (mitad del ancho, mitad del fondo, altura del plano en el centro, activa)
    uTerrazaPendiente: { value: Array.from({ length: MAX_TERRAZAS }, () => new Vector2(0, 0)) }, // del plano, por metro de a y de b
    uTerrazaVida: { value: Array.from({ length: MAX_TERRAZAS }, (_, i) => new Vector2(...(terrazas[i]?.vida ?? [0, 0]))) }, // (nace, muere) del hito
  }
}

/** Pone los datos en los uniforms (después de cargar relieve.bin): la textura y el plano de cada terraza. */
export function ponerRelieve(U, relieve) {
  U.tRelieve.value.dispose()
  U.tRelieve.value = texturaRelieve(relieve)
  U.uRelieveCelda.value.set(relieve.hoja.ancho / relieve.w, relieve.hoja.alto / relieve.h)
  U.uTerrazaMedida.value.forEach((d, i) => {
    const plano = relieve.planos?.[i]
    if (d.x <= 0 || !plano) return
    d.set(d.x, d.y, plano.c0, 1)
    U.uTerrazaPendiente.value[i].set(plano.c1, plano.c2)
  })
}

/** GLSL del vertex shader. Necesita uOla y uAnchoOla declarados por quien lo incluye. */
export const GLSL_RELIEVE = /* glsl */ `
  uniform sampler2D tRelieve; uniform vec4 uRelieveHoja; uniform vec2 uRelieveCelda; uniform float uExageracion;
  uniform vec4 uTerrazaMarco[${MAX_TERRAZAS}]; uniform vec4 uTerrazaMedida[${MAX_TERRAZAS}];
  uniform vec2 uTerrazaPendiente[${MAX_TERRAZAS}];
  float relieveCrudo(vec2 xz) { return texture2D(tRelieve, (xz - uRelieveHoja.xy) / uRelieveHoja.zw).r; }
  // cuánto se hincha el suelo en xz: la misma ola que levanta la ciudad
  float hinchadoEn(vec2 xz) { return uExageracion * smoothstep(0.0, 1.0, (uOla - length(xz)) / uAnchoOla); }
  // dentro del rectángulo de una terraza, su plano (a, b: el punto en su marco); afuera, el talud hasta el terreno
  float conTerrazas(vec2 xz, float h) {
    for (int i = 0; i < ${MAX_TERRAZAS}; i++) {
      vec4 m = uTerrazaMarco[i], d = uTerrazaMedida[i];
      if (d.w < 0.5) continue;
      vec2 p = xz - m.xy;
      float a = dot(p, m.zw), b = dot(p, vec2(-m.w, m.z));
      float fuera = max(abs(a) - d.x, abs(b) - d.y);
      h = mix(h, d.z + dot(vec2(a, b), uTerrazaPendiente[i]), 1.0 - smoothstep(0.0, ${TALUD_M.toFixed(1)}, fuera));
    }
    return h;
  }
  float sueloEn(vec2 xz) {
    return conTerrazas(xz, relieveCrudo(xz)) * hinchadoEn(xz);
  }
  // el piso de un vértice de hito: anclado en una terraza, su plano bajo el vértice (prolongado, para lo que sale a
  // la calle, como una escalinata); si no, el más alto de su ancla y su apoyo (plano donde el terreno baja)
  float pisoDeHito(vec2 ancla, vec2 apoyo, vec2 xz) {
    for (int i = 0; i < ${MAX_TERRAZAS}; i++) {
      vec4 m = uTerrazaMarco[i], d = uTerrazaMedida[i];
      if (d.w < 0.5) continue;
      vec2 q = ancla - m.xy;
      if (max(abs(dot(q, m.zw)) - d.x, abs(dot(q, vec2(-m.w, m.z))) - d.y) > 0.0) continue;
      vec2 p = xz - m.xy;
      return (d.z + dot(vec2(dot(p, m.zw), dot(p, vec2(-m.w, m.z))), uTerrazaPendiente[i])) * hinchadoEn(xz);
    }
    return max(sueloEn(ancla), sueloEn(apoyo));
  }
  // normal por diferencias finitas, una celda a cada lado
  vec3 normalSuelo(vec2 xz) {
    vec2 d = uRelieveCelda;
    float dx = sueloEn(xz + vec2(d.x, 0.0)) - sueloEn(xz - vec2(d.x, 0.0));
    float dz = sueloEn(xz + vec2(0.0, d.y)) - sueloEn(xz - vec2(0.0, d.y));
    return normalize(vec3(-dx / (2.0 * d.x), 1.0, -dz / (2.0 * d.y)));
  }
  // hacia dónde sube el terreno tal cual es (sin la ola ni la exageración), en m/m: su largo es la pendiente
  vec2 pendienteEn(vec2 xz) {
    vec2 d = uRelieveCelda;
    float dx = relieveCrudo(xz + vec2(d.x, 0.0)) - relieveCrudo(xz - vec2(d.x, 0.0));
    float dz = relieveCrudo(xz + vec2(0.0, d.y)) - relieveCrudo(xz - vec2(0.0, d.y));
    return vec2(dx / (2.0 * d.x), dz / (2.0 * d.y));
  }
  // el terreno tal cual es: altura sobre la plaza (m) y pendiente (m/m)
  vec2 terrenoEn(vec2 xz) { return vec2(relieveCrudo(xz), length(pendienteEn(xz))); }
  // las casas suben enteras a la altura de su ancla; el pie baja hasta el suelo para no flotar
  float apoyoCasa(vec2 ancla, vec2 xz, bool esPie) {
    float s = sueloEn(ancla);
    return esPie ? min(s, sueloEn(xz)) - ${MARGEN_PIE_M.toFixed(1)} : s;
  }
`

/**
 * GLSL del fragment de la ciudad (necesita GLSL_EPOCAS antes): ¿el punto del suelo está bajo la plataforma de un
 * hito de terraza en pie? Ahí el suelo no se dibuja. Su malla interpola la altura entre vértices de 24 m (96 m sin
 * GPU): un triángulo que cruza el borde de la terraza sube en rampa por adentro y tapaba los patios del hito.
 */
export const GLSL_TERRAZAS_TAPADAS = /* glsl */ `
  uniform vec4 uTerrazaMarco[${MAX_TERRAZAS}]; uniform vec4 uTerrazaMedida[${MAX_TERRAZAS}]; uniform vec2 uTerrazaVida[${MAX_TERRAZAS}];
  uniform float uOla;
  // solo con el hito en pie y levantado del todo: sube con la ola desde su distancia a la plaza, corrida hasta 60 m
  // por su azar (src/hitos/material.js); acostada la ciudad, el suelo vuelve y no queda un hueco
  bool bajoUnHito(vec2 xz) {
    for (int i = 0; i < ${MAX_TERRAZAS}; i++) {
      vec4 m = uTerrazaMarco[i], d = uTerrazaMedida[i];
      if (d.w < 0.5) continue;
      vec2 p = xz - m.xy;
      float fuera = max(abs(dot(p, m.zw)) - d.x, abs(dot(p, vec2(-m.w, m.z))) - d.y);
      if (fuera < -${TAPADO_M.toFixed(1)} && vivoEn(uTerrazaVida[i], epocaAqui(length(xz))) > 0.5
          && smoothstep(0.0, 1.0, (uOla - length(m.xy) - 60.0) / uAnchoOla) > 0.99) return true;
    }
    return false;
  }`
