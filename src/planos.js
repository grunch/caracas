/**
 * El plano de cada época sobre la hoja (plano/epocas.json, tools/planos-epocas.mjs): cada plano viejo
 * calzado es una textura con alfa que cubre solo su recorte de la hoja de 1936. El shader
 * (src/shader/plano.js) recibe el de la época "de" y el de la época "a" de la ola y los funde con su
 * frente; fuera de cada plano (alfa 0), y en 1936, se ve el plano de 1936.
 */

/**
 * El plano calzado de la época `año`: el suyo; antes del primero (1578: Pimentel es un esquema, no se
 * puede calzar) el más antiguo, que es lo más cercano en el tiempo; si no (1936), null: el de 1936.
 */
export function planoDeEpoca(año, planos) {
  if (año === undefined || !planos?.length) return null
  const exacto = planos.find((p) => p.año === año)
  if (exacto) return exacto
  const primero = planos.reduce((a, b) => (b.año < a.año ? b : a))
  return año < primero.año ? primero : null
}

/** [x0, y0, x1, y1] del recorte (píxeles de la hoja) en coordenadas de la hoja normalizadas, y hacia abajo. */
export const rectHoja = ([x0, y0, x1, y1], { ancho, alto }) => [x0 / ancho, y0 / alto, x1 / ancho, y1 / alto]

/** Las URLs a bajar, en orden: chico para el primer cuadro; después, salvo en livianos, el mayor que admite la GPU. */
export function nivelesAUsar(niveles, { liviano, maxTextura }) {
  const [chico, ...resto] = niveles
  const mejor = resto.filter((n) => n.lado <= maxTextura).at(-1)
  return liviano || !mejor ? [chico.url] : [chico.url, mejor.url]
}

/**
 * Las texturas de los planos de época: las baja la primera vez que hacen falta y guarda solo las de la ola
 * en curso (de, a) y la precargada; las demás se liberan. `cargar(url)` → promesa de textura; `vacio`, la
 * textura transparente de las ranuras sin plano (U.uPlanoDe/A, con su rectángulo en U.uPlanoDeRect/ARect).
 * Las épocas se nombran por el año de su plano (planoDeEpoca), null = 1936.
 */
export function crearPlanosDeEpoca({ planos, hoja, cargar, U, pedirCuadro, vacio, liviano, maxTextura }) {
  const porAño = new Map(planos.map((p) => [p.año, p]))
  const cache = new Map() // año → { textura, primero, mejor }
  let enUso = [null, null]
  let precargado = null

  function poner() {
    for (const [ranura, año] of [['De', enUso[0]], ['A', enUso[1]]]) {
      const textura = cache.get(año)?.textura
      U[`uPlano${ranura}`].value = textura ?? vacio
      if (textura) U[`uPlano${ranura}Rect`].value.fromArray(rectHoja(porAño.get(año).recorte, hoja))
    }
  }

  // un pedido cuya entrada ya fue descartada (o reemplazada) no toca el caché: si trae textura, se libera
  function traer(año, e, url) {
    const vigente = () => cache.get(año) === e
    return cargar(url).then((t) => {
      if (!vigente()) return t.dispose()
      const vieja = e.textura
      e.textura = t
      poner() // las ranuras dejan la vieja antes de liberarla
      vieja?.dispose()
      pedirCuadro(3)
    }).catch((err) => {
      console.warn(`plano de ${año}: ${err.message}`)
      if (vigente() && !e.textura) cache.delete(año) // sin nada que mostrar: la próxima vez se vuelve a pedir
    })
  }

  function pedir(año, completo) {
    if (año === null || !porAño.has(año)) return null
    const urls = nivelesAUsar(porAño.get(año).niveles, { liviano, maxTextura })
    let e = cache.get(año)
    if (!e) {
      e = { textura: null, mejor: null }
      cache.set(año, e)
      e.primero = traer(año, e, urls[0])
    }
    if (completo && urls.length > 1 && !e.mejor) {
      const entrada = e
      e.mejor = e.primero.then(() => (cache.get(año) === entrada ? traer(año, entrada, urls[1]) : null))
    }
    return e
  }

  function descartar() {
    const quedan = new Set([...enUso, precargado])
    for (const [año, e] of cache) {
      if (quedan.has(año)) continue
      e.textura?.dispose()
      cache.delete(año)
    }
  }

  return {
    /** Precarga el plano (solo el nivel chico); resuelve cuando llegó o falló (nunca rechaza). */
    preparar(año) {
      precargado = año
      const e = pedir(año, false)
      descartar()
      return e ? e.primero : Promise.resolve()
    },
    /** La ola va de la época `de` a la `a`: sus planos a las ranuras, y al nivel mejor. */
    usar(de, a) {
      enUso = [de, a]
      pedir(de, true)
      pedir(a, true)
      poner()
      descartar()
    },
    get cargados() { return [...cache.keys()] },
  }
}
