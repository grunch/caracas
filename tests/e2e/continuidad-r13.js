// La continuidad de las casas entre épocas con la R13 (specs/13: «ningún hito sobre una manzana»): una casa en pie
// en la época anterior solo puede faltar en esta si un hito retiró su manzana entera. Se mide con lo que el sitio
// sirve: el campo de distancia a las manzanas de cada época (plano/suelo-manzanas*.png, positivo adentro) y los
// recintos de los hitos (src/hitos/plantas.js). Lógica pura, sin efectos.
import { puntoEnPoligono } from '../../src/hitos/suprimir.js'

const ADENTRO = 128 // el byte de 0 m es 127,5 (tools/suelo-manzanas-lib.mjs, codificar): de 128 para arriba es manzana

/** El texel del campo ({ caja, ancho, alto, canales, datos }) bajo un punto en px del plano, o −1 fuera de la caja. */
export function texelDe({ caja: [x0, y0, x1, y1], ancho, alto }, [x, y]) {
  const i = Math.floor(((x - x0) / (x1 - x0)) * ancho)
  const j = Math.floor(((y - y0) / (y1 - y0)) * alto)
  return i < 0 || j < 0 || i >= ancho || j >= alto ? -1 : j * ancho + i
}

/** El centro de un texel, en px del plano. */
function centroDe({ caja: [x0, y0, x1, y1], ancho, alto }, k) {
  return [x0 + (((k % ancho) + 0.5) / ancho) * (x1 - x0), y0 + ((Math.floor(k / ancho) + 0.5) / alto) * (y1 - y0)]
}

/** ¿Hay manzana en el texel k, en el canal de esa época? */
export const hayManzana = (campo, canal, k) => k >= 0 && campo.datos[k * campo.canales + canal] >= ADENTRO

/** Los texeles de la manzana (los conexos que son manzana) que contiene el texel k; ninguno si ahí no hay manzana. */
export function manzanaDe(campo, canal, k) {
  if (!hayManzana(campo, canal, k)) return []
  const { ancho, alto } = campo
  const vistos = new Set([k])
  const manzana = [k]
  for (let c = 0; c < manzana.length; c++) {
    const [i, j] = [manzana[c] % ancho, Math.floor(manzana[c] / ancho)]
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const [ni, nj] = [i + di, j + dj]
      const n = nj * ancho + ni
      if (ni < 0 || nj < 0 || ni >= ancho || nj >= alto || vistos.has(n) || !hayManzana(campo, canal, n)) continue
      vistos.add(n)
      manzana.push(n)
    }
  }
  return manzana
}

const enPie = (h, e) => (h.nace ?? 0) <= e && (!h.muere || h.muere > e)

/** Los recintos (px del plano) de los hitos en pie en la época e: sus plantas y lo que reservan (`suprime`). */
export const recintosDe = (hitos, e) => hitos.filter((h) => enPie(h, e)).flatMap((h) => [...(h.planta ?? []), ...(h.suprime ?? [])])

/**
 * El centro de área de una huella. No el promedio de sus vértices: una casa recortada contra el borde en diagonal
 * de su manzana trae decenas de vértices en ese borde (la escalera del recorte) y el promedio cae sobre él.
 */
export function centroDeHuella(huella) {
  let [a, x, y] = [0, 0, 0]
  huella.forEach(([xa, ya], k) => {
    const [xb, yb] = huella[(k + 1) % huella.length]
    const cruz = xa * yb - xb * ya
    a += cruz
    x += (xa + xb) * cruz
    y += (ya + yb) * cruz
  })
  if (!a) throw new Error('continuidad: una huella sin área')
  return [x / (3 * a), y / (3 * a)]
}

const cajaDe = (poligono) => poligono.reduce(([a, b, c, d], [x, y]) => [Math.min(a, x), Math.min(b, y), Math.max(c, x), Math.max(d, y)], [Infinity, Infinity, -Infinity, -Infinity])

/**
 * Las casas que murieron sin que la R13 lo explique: [{ casa, motivo }]. `muertas` son las que estaban en pie en la
 * época anterior y no en esta ([{ casa, huella }], la huella en px del plano); `antes` y `ahora`, el campo y el canal
 * de cada época ({ campo, canal }); `recintos`, los de los hitos en pie en esta. La R13 explica una muerte si en
 * esta época ya no hay manzana bajo la casa y la manzana en que estaba pisa el recinto de un hito.
 */
export function muertesSinR13({ muertas, antes, ahora, recintos }) {
  const zonas = recintos.map((poligono) => ({ poligono, caja: cajaDe(poligono) }))
  const pisaUnHito = (k) => {
    const p = centroDe(antes.campo, k)
    return zonas.some(({ poligono, caja: [x0, y0, x1, y1] }) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1 && puntoEnPoligono(p, poligono))
  }
  const retiradas = new Map() // por texel de la manzana de antes: ¿la pisa un hito?
  const sin = []
  for (const { casa, huella } of muertas) {
    const centro = centroDeHuella(huella)
    if (hayManzana(ahora.campo, ahora.canal, texelDe(ahora.campo, centro))) {
      sin.push({ casa, motivo: 'su manzana sigue en pie' })
      continue
    }
    const k = texelDe(antes.campo, centro)
    if (!retiradas.has(k)) {
      const manzana = manzanaDe(antes.campo, antes.canal, k)
      const pisada = manzana.some(pisaUnHito)
      for (const t of manzana) retiradas.set(t, pisada)
      if (!manzana.length) retiradas.set(k, null)
    }
    const pisada = retiradas.get(k)
    if (pisada === null) sin.push({ casa, motivo: 'no estaba en una manzana' })
    else if (!pisada) sin.push({ casa, motivo: 'ningún hito pisa su manzana' })
  }
  return sin
}
