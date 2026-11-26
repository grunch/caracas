// El suelo verde de las manzanas de cada época: de los contornos de manzana del generador (el límite real con sus huecos)
// (fuentes/derivados/epocas/manzanas-<año>-informe.json, px del plano base) a un campo de distancia firmada por
// época, uno por canal (R 1772 · G 1843 · B 1889). Cada texel dice a cuántos metros está el borde de manzana más
// cercano: positivo adentro (patios, solares, jardines de las casas: verde) y negativo afuera (calle: tierra; más
// lejos que BANDA_CALLE_M, terreno desocupado: verde). Las plazas de la época se despejan: quedan como calle,
// como estaban. El shader (src/shader/suelo-manzanas.js) lo lee; nada viene de la segmentación de 1936 (I1772-008).
// Lógica pura, sin efectos.

/** Metros por texel del campo que se publica. */
export const M_POR_PX = 2
/** Metros por texel de la máscara fina con que se mide la distancia (se promedia de a 2×2 al publicar). */
export const M_FINO = 1
/** Hasta dónde se guarda la distancia (m), a cada lado del borde. */
export const DIST_MAX_M = 16
/** Afuera de las manzanas, hasta esta distancia es calle (tierra); más lejos, terreno desocupado (verde). */
export const BANDA_CALLE_M = 12
/** Un claro mayor que esto (m²) es campo abierto, no una plaza: no se despeja. */
export const PLAZA_MAX_M2 = 30000
/**
 * Las épocas con suelo verde y su canal. Sus plazas no se tocan: siguen como calle (la Plaza Mayor, mercado de
 * tierra; desde 1889, el jardín que dibuja su hito).
 */
export const EPOCAS_SUELO = Object.freeze([
  Object.freeze({ año: 1772, epoca: 1 }),
  Object.freeze({ año: 1843, epoca: 2 }),
  Object.freeze({ año: 1889, epoca: 3 }),
])

const esCoordenada = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)

const anillo = (puntos) => Object.freeze(puntos.map((p) => Object.freeze([...p])))

/**
 * Las manzanas de un informe, validadas y congeladas: cada una, sus anillos ([contorno, ...huecos]). El contorno es
 * el límite real (`limite`, con sus `huecos`: el generador recorta las casas contra él) y, si no lo hay, el
 * rectángulo del plan (`poligono`). Salta los anillos de menos de tres puntos y las manzanas sin contorno.
 */
export function poligonosDeInforme(informe) {
  if (!Array.isArray(informe?.manzanas)) throw new Error('informe de manzanas: falta la lista de manzanas')
  const manzanas = []
  for (const m of informe.manzanas) {
    const contorno = Array.isArray(m.limite) && m.limite.length >= 3 ? m.limite : m.poligono
    if (!Array.isArray(contorno) || contorno.length < 3) continue
    const anillos = [contorno, ...(Array.isArray(m.limite) ? (m.huecos ?? []) : [])]
    if (!anillos.every((a) => Array.isArray(a) && a.every(esCoordenada))) throw new Error(`manzana ${m.id}: hay una coordenada que no es un par de números`)
    manzanas.push(Object.freeze(anillos.filter((a) => a.length >= 3).map(anillo)))
  }
  return Object.freeze(manzanas)
}

/** [x0, y0, x1, y1] en px enteros del plano: todas las manzanas (de anillos) de todas las épocas, con DIST_MAX_M de margen. */
export function cajaDeManzanas(manzanasPorEpoca, metro) {
  const margen = DIST_MAX_M / metro
  // sin Math.min(...): los límites reales traen decenas de miles de vértices
  const [x0, y0, x1, y1] = manzanasPorEpoca.flat(3).reduce(([a, b, c, d], [x, y]) =>
    [Math.min(a, x), Math.min(b, y), Math.max(c, x), Math.max(d, y)], [Infinity, Infinity, -Infinity, -Infinity])
  return [Math.floor(x0 - margen), Math.floor(y0 - margen), Math.ceil(x1 + margen), Math.ceil(y1 + margen)]
}

/**
 * Llena cada manzana en la máscara: par-impar por fila con todos sus anillos juntos, así sus huecos quedan
 * afuera. Las manzanas que se pisan se suman, no se restan.
 */
function rellenar(mascara, ancho, alto, manzanas, aTexel) {
  for (const anillos of manzanas) {
    const lados = anillos.flatMap((a) => {
      const p = a.map(aTexel)
      return p.map((q, k) => [q, p[(k + 1) % p.length]])
    })
    const ys = lados.map(([a]) => a[1])
    const j0 = Math.max(0, Math.floor(Math.min(...ys)))
    const j1 = Math.min(alto - 1, Math.ceil(Math.max(...ys)))
    for (let j = j0; j <= j1; j++) {
      const y = j + 0.5
      const cortes = []
      for (const [a, b] of lados) {
        if ((a[1] <= y) !== (b[1] <= y)) cortes.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]))
      }
      cortes.sort((u, v) => u - v)
      for (let c = 0; c + 1 < cortes.length; c += 2) {
        const i0 = Math.max(0, Math.ceil(cortes[c] - 0.5))
        const i1 = Math.min(ancho - 1, Math.floor(cortes[c + 1] - 0.5))
        for (let i = i0; i <= i1; i++) mascara[j * ancho + i] = 1
      }
    }
  }
}

const INF = 1e20

/** Distancia euclídea al cuadrado de una fila (Felzenszwalb y Huttenlocher, 2012), sobre f; escribe en d. */
function edt1d(f, n, d, v, z) {
  let k = 0
  v[0] = 0
  z[0] = -INF
  z[1] = INF
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) {
      k--
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    }
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = INF
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
  }
}

/** Distancia (en texeles, entre centros) de cada texel al texel más cercano con mascara === objetivo. */
function distanciaA(mascara, ancho, alto, objetivo) {
  const n = Math.max(ancho, alto)
  const f = new Float64Array(n)
  const d = new Float64Array(n)
  const v = new Int32Array(n)
  const z = new Float64Array(n + 1)
  const g = new Float64Array(ancho * alto)
  for (let k = 0; k < g.length; k++) g[k] = mascara[k] === objetivo ? 0 : INF
  for (let i = 0; i < ancho; i++) {
    for (let j = 0; j < alto; j++) f[j] = g[j * ancho + i]
    edt1d(f, alto, d, v, z)
    for (let j = 0; j < alto; j++) g[j * ancho + i] = d[j]
  }
  for (let j = 0; j < alto; j++) {
    for (let i = 0; i < ancho; i++) f[i] = g[j * ancho + i]
    edt1d(f, ancho, d, v, z)
    for (let i = 0; i < ancho; i++) g[j * ancho + i] = Math.sqrt(d[i])
  }
  return g
}

/**
 * La distancia firmada a la unión de las manzanas (cada una, sus anillos) sobre la caja (px del plano): { ancho, alto, pasoX, pasoY,
 * distancias } con un Float32 por texel de M_POR_PX (fila 0 al norte), en metros, positiva adentro, saturada en
 * ±DIST_MAX_M. Se mide en una máscara de M_FINO y se promedia: la distancia a un borde recto es lineal.
 */
export function distanciaFirmada(manzanas, caja, { metro }) {
  const [x0, y0, x1, y1] = caja
  const factor = Math.round(M_POR_PX / M_FINO)
  const ancho = Math.ceil((x1 - x0) * metro / M_POR_PX)
  const alto = Math.ceil((y1 - y0) * metro / M_POR_PX)
  // el shader estira la textura sobre la caja exacta: el paso real de cada eje (≤ M_POR_PX), no M_POR_PX
  const pasoX = (x1 - x0) * metro / ancho
  const pasoY = (y1 - y0) * metro / alto
  const [anchoF, altoF] = [ancho * factor, alto * factor]
  const [pasoFX, pasoFY] = [pasoX / factor, pasoY / factor]
  const mascara = new Uint8Array(anchoF * altoF)
  rellenar(mascara, anchoF, altoF, manzanas, ([x, y]) => [(x - x0) * metro / pasoFX, (y - y0) * metro / pasoFY])
  const hastaAfuera = distanciaA(mascara, anchoF, altoF, 0)
  const hastaAdentro = distanciaA(mascara, anchoF, altoF, 1)
  const pasoF = (pasoFX + pasoFY) / 2
  const distancias = new Float32Array(ancho * alto)
  for (let j = 0; j < alto; j++) {
    for (let i = 0; i < ancho; i++) {
      let suma = 0
      for (let b = 0; b < factor; b++) {
        for (let a = 0; a < factor; a++) {
          const k = (j * factor + b) * anchoF + i * factor + a
          // el borde pasa a medio texel del centro del último texel de cada lado
          suma += mascara[k] ? (hastaAfuera[k] - 0.5) * pasoF : -(hastaAdentro[k] - 0.5) * pasoF
        }
      }
      distancias[j * ancho + i] = Math.max(-DIST_MAX_M, Math.min(DIST_MAX_M, suma / (factor * factor)))
    }
  }
  return { ancho, alto, pasoX, pasoY, distancias }
}

/** El nombre de una marca en la época e (el último que rige), como src/marcas.js. */
function nombreEnEpoca(marca, e) {
  const lista = marca.nombres ?? [[-Infinity, marca.nombre]]
  return lista.filter(([desde]) => desde <= e).at(-1)?.[1] ?? null
}

/**
 * Las plazas en pie en la época e (marcas de src/marcas-datos.js cuyo nombre en esa época dice «Plaza» o
 * «Plazuela»): [{ id, x, y }] en px del plano. La posición de las que apuntan a un hito sale del hito.
 */
export function plazasDeEpoca(marcas, hitos, e) {
  const porId = new Map(hitos.map((h) => [h.id, h]))
  const plazas = []
  for (const m of marcas) {
    const hito = m.hito ? porId.get(m.hito) : null
    if (m.hito && !hito) throw new Error(`marca ${m.id}: hito desconocido "${m.hito}"`)
    const nace = m.nace ?? hito?.nace ?? 1
    const muere = m.muere ?? 0
    const viva = nace <= e && (muere === 0 || e < muere)
    if (!viva || !/\bplaz(a|uela)\b/i.test(nombreEnEpoca(m, e) ?? '')) continue
    plazas.push({ id: m.id, x: m.x ?? hito.x, y: m.y ?? hito.y })
  }
  return plazas
}

/**
 * Un campo nuevo donde cada plaza queda como calle: el claro (texeles conexos más lejos que BANDA_CALLE_M de toda
 * manzana) que contiene su punto pasa a −BANDA_CALLE_M / 2, si no supera maxM2. No toca `campo`.
 */
export function despejarPlazas(campo, caja, plazas, { metro, maxM2 = PLAZA_MAX_M2 }) {
  const { ancho, alto, pasoX, pasoY } = campo
  const distancias = Float32Array.from(campo.distancias)
  const abierto = (k) => distancias[k] < -BANDA_CALLE_M
  const maxTexeles = maxM2 / (pasoX * pasoY)
  for (const { x, y } of plazas) {
    const i = Math.floor(((x - caja[0]) * metro) / pasoX)
    const j = Math.floor(((y - caja[1]) * metro) / pasoY)
    if (i < 0 || j < 0 || i >= ancho || j >= alto || !abierto(j * ancho + i)) continue
    const visto = new Uint8Array(ancho * alto)
    const claro = [j * ancho + i]
    visto[claro[0]] = 1
    for (let c = 0; c < claro.length && claro.length <= maxTexeles; c++) {
      const k = claro[c]
      const [ki, kj] = [k % ancho, Math.floor(k / ancho)]
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const [ni, nj] = [ki + di, kj + dj]
        const n = nj * ancho + ni
        if (ni < 0 || nj < 0 || ni >= ancho || nj >= alto || visto[n] || !abierto(n)) continue
        visto[n] = 1
        claro.push(n)
      }
    }
    if (claro.length > maxTexeles) continue
    for (const k of claro) distancias[k] = -BANDA_CALLE_M / 2
  }
  return { ...campo, distancias }
}

/** Los campos de las épocas en una imagen de un canal por época (0 m = 128; ±DIST_MAX_M = 255 / 0). */
export function codificar(campos) {
  const [{ ancho, alto }] = campos
  if (campos.some((c) => c.ancho !== ancho || c.alto !== alto)) throw new Error('suelo de manzanas: los campos no tienen las mismas medidas')
  const canales = campos.length
  const datos = new Uint8Array(ancho * alto * canales)
  campos.forEach(({ distancias }, c) => {
    for (let k = 0; k < ancho * alto; k++) {
      const v = 127.5 + (Math.max(-DIST_MAX_M, Math.min(DIST_MAX_M, distancias[k])) * 127.5) / DIST_MAX_M
      datos[k * canales + c] = Math.round(v)
    }
  })
  return { ancho, alto, canales, datos }
}

/** El índice que lee el sitio (datos/suelo-manzanas.json): dónde va la textura, sus medidas y de dónde sale. */
export function metaSueloManzanas({ caja, ancho, alto, manzanas }) {
  return {
    imagen: 'plano/suelo-manzanas.png',
    caja: [...caja],
    ancho,
    alto,
    m_por_px: M_POR_PX,
    dist_max_m: DIST_MAX_M,
    banda_calle_m: BANDA_CALLE_M,
    canales: EPOCAS_SUELO.map((e) => e.año),
    manzanas: { ...manzanas },
    fuente: 'fuentes/derivados/epocas/manzanas-<año>-informe.json',
    nota: 'Distancia firmada al borde de las manzanas del generador de cada época (positiva adentro). Adentro, '
      + 'patios y solares: verde. Afuera, calle de tierra hasta banda_calle_m; más lejos, terreno desocupado: verde. '
      + 'Las plazas de cada época quedan como calle, como estaban.',
  }
}
