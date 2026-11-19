/**
 * WGS84 → píxel del plano de 1936, lo mínimo de tools/geo/geo1936.py para el buscador:
 * lat/lon → UTM 19N (serie de Krüger hasta n⁴) → cuadrícula impresa del plano (la similitud ajustada con
 * los puntos de control de tools/geo/gcp/1936-wgs84.json) → píxel del mosaico.
 */
const A = 6378137
const F = 1 / 298.257223563
const K0 = 0.9996
const FALSO_ESTE = 500000
const N = F / (2 - F)
const A_RECT = (A / (1 + N)) * (1 + N ** 2 / 4 + N ** 4 / 64)
const ALFA = [
  N / 2 - (2 * N ** 2) / 3 + (5 * N ** 3) / 16 + (41 * N ** 4) / 180,
  (13 * N ** 2) / 48 - (3 * N ** 3) / 5 + (557 * N ** 4) / 1440,
  (61 * N ** 3) / 240 - (103 * N ** 4) / 140,
  (49561 * N ** 4) / 161280,
]
const EXC = Math.sqrt(F * (2 - F))
const rad = (g) => (g * Math.PI) / 180

/** Grados → [E, N] en metros (hemisferio norte). */
export function wgs84AUtm(lat, lon, zona = 19) {
  const fi = rad(lat)
  const dl = rad(lon) - rad(-183 + 6 * zona)
  const t = Math.sinh(Math.atanh(Math.sin(fi)) - EXC * Math.atanh(EXC * Math.sin(fi)))
  const xi0 = Math.atan2(t, Math.cos(dl))
  const eta0 = Math.atanh(Math.sin(dl) / Math.sqrt(1 + t * t))
  const [xi, eta] = ALFA.reduce(([x, e], a, k) => {
    const j = 2 * (k + 1)
    return [x + a * Math.sin(j * xi0) * Math.cosh(j * eta0), e + a * Math.cos(j * xi0) * Math.sinh(j * eta0)]
  }, [xi0, eta0])
  return [FALSO_ESTE + K0 * A_RECT * eta, K0 * A_RECT * xi]
}

const esPar = (v) => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite)

/**
 * `transformacion`: la del JSON de puntos de control ({ centro_grid, matriz, traslacion }: cuadrícula → UTM);
 * `plano`: { metro, origen_m, marco } de ciudad.json. Devuelve { aPixel(lat, lon) → [px, py] | null, dentro(px) }.
 */
export function crearGeo({ transformacion: t, plano }) {
  if (!t || !esPar(t.centro_grid) || !esPar(t.traslacion) || !Array.isArray(t.matriz) || t.matriz.length !== 2 || !t.matriz.every(esPar)) {
    throw new Error('geo: transformación cuadrícula ⇄ UTM inválida')
  }
  const [[a, b], [c, d]] = t.matriz
  const det = a * d - b * c
  if (!(Math.abs(det) > 1e-9)) throw new Error('geo: transformación cuadrícula ⇄ UTM sin inversa')
  if (!(plano?.metro > 0) || !esPar(plano.origen_m)) throw new Error('geo: al plano le falta "metro" u "origen_m"')
  const [ox, oy] = plano.origen_m
  const [x0, y0, x1, y1] = plano.marco ?? [0, 0, plano.ancho ?? Infinity, plano.alto ?? Infinity]
  return Object.freeze({
    /** ¿El píxel cae dentro de lo dibujado (el marco del plano)? */
    dentro: (px) => !!px && px[0] >= x0 && px[0] <= x1 && px[1] >= y0 && px[1] <= y1,
    aPixel(lat, lon) {
      if (![lat, lon].every((v) => typeof v === 'number' && Number.isFinite(v)) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
      const [e, n] = wgs84AUtm(lat, lon)
      const [de, dn] = [e - t.traslacion[0], n - t.traslacion[1]]
      const x = (d * de - b * dn) / det + t.centro_grid[0]
      const y = (-c * de + a * dn) / det + t.centro_grid[1]
      return [(x - ox) / plano.metro, (oy - y) / plano.metro]
    },
  })
}

/**
 * De los lugares que devolvió Nominatim ({ nombre, lat, lon }), el que se muestra: el primero que cae
 * dentro del plano; si ninguno, el primero (para decir que queda fuera). Como resultado del buscador:
 * { tipo: 'moderna', nombre, px, dentro } o null si no hay ninguno.
 */
export function elegirLugar(lugares, geo) {
  const ubicados = lugares.map((l) => {
    const px = geo.aPixel(l.lat, l.lon)
    return { tipo: 'moderna', nombre: l.nombre, px, dentro: geo.dentro(px) }
  })
  return ubicados.find((l) => l.dentro) ?? ubicados[0] ?? null
}
