/**
 * Teselas finas del plano (plano/f/<i>-<j>.webp, 3072 px): de cerca, el shader usa las cuatro que
 * rodean lo que se mira en vez de la textura de 8192, que no alcanza para leer los rótulos.
 */
export const RANURAS = 4
const EN_CACHE = 8

/** Las columnas (o filas) del par más cercano al punto: la suya y la vecina hacia el borde más próximo. */
function par(pos, largo, tesela, cuantas) {
  const p = Math.min(largo - 1, Math.max(0, pos))
  const k = Math.floor(p / tesela)
  if (cuantas === 1) return [0]
  let vecina = p - k * tesela < tesela / 2 ? k - 1 : k + 1
  if (vecina < 0 || vecina >= cuantas) vecina = k === 0 ? 1 : k - 1
  return [Math.min(k, vecina), Math.max(k, vecina)]
}

/** Nombres "<i>-<j>" del bloque de (hasta) 2×2 teselas alrededor del píxel (px, py) del plano. */
export function teselasCercanas(px, py, { ancho, alto, tesela, cols, rows }) {
  const columnas = par(px, ancho, tesela, cols)
  const filas = par(py, alto, tesela, rows)
  return filas.flatMap((j) => columnas.map((i) => `${i}-${j}`))
}

/** [x0, y0, x1, y1] de la tesela en coordenadas de la hoja normalizadas (0–1, y hacia abajo). */
export function rectTesela(nombre, { ancho, alto, tesela }) {
  const [i, j] = nombre.split('-').map(Number)
  return [(i * tesela) / ancho, (j * tesela) / alto, Math.min((i + 1) * tesela, ancho) / ancho, Math.min((j + 1) * tesela, alto) / alto]
}

/**
 * Mantiene cargadas las teselas que tocan y las pone en las ranuras del shader
 * (U.uFino[k], U.uFinoRect[k], U.uFinoOn[k]). `cargar(url)` devuelve una promesa de textura.
 */
export function crearTeselasFinas({ laminas, cargar, U, pedirCuadro }) {
  const cache = new Map() // nombre → { textura, pedida, uso }
  let reloj = 0

  function pedir(nombre) {
    let e = cache.get(nombre)
    if (!e) {
      e = { textura: null, uso: 0 }
      e.pedida = cargar(`plano/f/${nombre}.webp`)
        .then((t) => { e.textura = t; pedirCuadro(3) })
        .catch(() => cache.delete(nombre))
      cache.set(nombre, e)
    }
    e.uso = ++reloj
    return e
  }

  function descartarViejas(enUso) {
    const sobrantes = [...cache.entries()].filter(([n]) => !enUso.has(n)).sort((a, b) => a[1].uso - b[1].uso)
    while (cache.size > EN_CACHE && sobrantes.length) {
      const [nombre, e] = sobrantes.shift()
      e.textura?.dispose()
      cache.delete(nombre)
    }
  }

  /** px, py: píxel del plano que se mira; activo: si la cámara está lo bastante cerca. */
  function update(px, py, activo) {
    const nombres = activo ? teselasCercanas(px, py, laminas) : []
    for (let k = 0; k < RANURAS; k++) {
      const nombre = nombres[k]
      const e = nombre ? pedir(nombre) : null
      const lista = Boolean(e?.textura)
      U.uFinoOn.value[k] = lista ? 1 : 0
      if (lista) {
        U.uFino.value[k] = e.textura
        U.uFinoRect.value[k].fromArray(rectTesela(nombre, laminas))
      }
    }
    descartarViejas(new Set(nombres))
  }

  return { update, get cargadas() { return [...cache.keys()] } }
}
