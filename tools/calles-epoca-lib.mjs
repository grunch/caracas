// Las calles de una época para el suelo del sitio (T33j.8b, I1772-008): de los tramos curados de la referencia
// (tools/geo/referencias/1772-calles-1936.json, ejes en píxeles del plano base) a un campo de distancia: cada
// texel dice cuánto falta hasta el eje de calle más cercano. El shader (src/shader/calles.js) dibuja con eso la
// calzada y su orilla a cualquier distancia sin pegar ningún escaneo. Lógica pura, sin efectos.

/** El núcleo de calzada que se dibuja (m): el ancho inferido del generador (tools/geo/calles_1772.py). */
export const NUCLEO_M = 4
/** Metros por texel del campo. La distancia a una recta es lineal: el filtrado bilineal la reconstruye entera. */
export const M_POR_PX = 2
/** Hasta dónde se guarda la distancia (m); más lejos, 255. */
export const DIST_MAX_M = 10

const esCoordenada = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)

/** Los tramos medibles de la referencia, validados y congelados: [{ tramo, puntos }]. No toca `ref`. */
export function tramosDibujables(ref) {
  if (!Array.isArray(ref?.tramos)) throw new Error('referencia de calles: falta la lista de tramos')
  const tramos = ref.tramos.map((t) => {
    if (typeof t?.medible !== 'boolean') throw new Error(`tramo ${t?.tramo}: medible tiene que ser true o false`)
    if (!Array.isArray(t.puntos) || t.puntos.length < 2) throw new Error(`tramo ${t.tramo}: necesita al menos dos puntos`)
    if (!t.puntos.every(esCoordenada)) throw new Error(`tramo ${t.tramo}: hay una coordenada que no es un par de números`)
    return t
  })
  const medibles = tramos.filter((t) => t.medible)
  if (medibles.length === 0) throw new Error('referencia de calles: ningún tramo medible')
  return Object.freeze(medibles.map((t) => Object.freeze({
    tramo: t.tramo, puntos: Object.freeze(t.puntos.map((p) => Object.freeze([...p]))),
  })))
}

/** [x0, y0, x1, y1] en píxeles enteros del plano: todos los ejes, con DIST_MAX_M de margen. */
export function cajaDeCalles(tramos, metro) {
  const margen = DIST_MAX_M / metro
  const xs = tramos.flatMap((t) => t.puntos.map((p) => p[0]))
  const ys = tramos.flatMap((t) => t.puntos.map((p) => p[1]))
  return [Math.floor(Math.min(...xs) - margen), Math.floor(Math.min(...ys) - margen),
    Math.ceil(Math.max(...xs) + margen), Math.ceil(Math.max(...ys) + margen)]
}

/** Distancia (m) del punto (x, y) al segmento a–b, todo en metros. */
function alSegmento(x, y, [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const largo2 = dx * dx + dy * dy
  const t = largo2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / largo2)) : 0
  return Math.hypot(x - ax - t * dx, y - ay - t * dy)
}

/**
 * El campo de distancia sobre la caja (px del plano): { ancho, alto, datos } con un byte por texel, fila 0 al
 * norte; 0 sobre un eje, 255 a DIST_MAX_M o más. Cada segmento solo recorre los texeles a su alcance.
 */
export function campoDeDistancia(tramos, caja, { metro }) {
  const [x0, y0, x1, y1] = caja
  const ancho = Math.ceil((x1 - x0) * metro / M_POR_PX)
  const alto = Math.ceil((y1 - y0) * metro / M_POR_PX)
  const distancia = new Float32Array(ancho * alto).fill(DIST_MAX_M)
  const aMetros = ([x, y]) => [(x - x0) * metro, (y - y0) * metro] // desde la esquina de la caja
  for (const { puntos } of tramos) {
    const m = puntos.map(aMetros)
    for (let k = 0; k + 1 < m.length; k++) {
      const [a, b] = [m[k], m[k + 1]]
      const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - DIST_MAX_M) / M_POR_PX))
      const i1 = Math.min(ancho - 1, Math.ceil((Math.max(a[0], b[0]) + DIST_MAX_M) / M_POR_PX))
      const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - DIST_MAX_M) / M_POR_PX))
      const j1 = Math.min(alto - 1, Math.ceil((Math.max(a[1], b[1]) + DIST_MAX_M) / M_POR_PX))
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const d = alSegmento((i + 0.5) * M_POR_PX, (j + 0.5) * M_POR_PX, a, b)
          if (d < distancia[j * ancho + i]) distancia[j * ancho + i] = d
        }
      }
    }
  }
  const datos = Uint8Array.from(distancia, (d) => Math.round(255 * Math.min(d, DIST_MAX_M) / DIST_MAX_M))
  return { ancho, alto, datos }
}

/** El índice que lee el sitio (datos/calles-<año>.json): dónde va la textura, sus medidas y de dónde sale. */
export function metaCalles({ año, ref, tramos, caja, campo }) {
  return {
    año,
    imagen: `plano/calles-${año}.png`,
    caja: [...caja],
    ancho: campo.ancho,
    alto: campo.alto,
    m_por_px: M_POR_PX,
    dist_max_m: DIST_MAX_M,
    nucleo_m: NUCLEO_M,
    tramos: tramos.length,
    fuente: `tools/geo/referencias/${año}-calles-1936.json`,
    red_sha256: ref.red_sha256 ?? null,
    nota: 'Ejes de los tramos medibles de la referencia curada (fase 2 de specs/08). El ancho que se dibuja es el '
      + 'núcleo de calzada inferido del generador: el original no da anchos. Los tramos de los sectores límite del '
      + 'calce no se dibujan.',
  }
}
