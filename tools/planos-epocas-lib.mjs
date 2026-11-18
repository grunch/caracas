// Lógica pura de los planos de cada época (la usa tools/planos-epocas.mjs): qué texturas se generan
// de cada plano calzado (fuentes/derivados/<año>/calzado.tif) y el índice que lee el visor.

// Los planos viejos son más gruesos que el de 1936: 4096 alcanza para casi todos; 8192 solo si el recorte
// es más grande que eso (1889, 1911). Sin teselas finas: de cerca no hay más detalle que mostrar.
const LADOS = [
  { archivo: 'chico.webp', lado: 2048 },
  { archivo: 'medio.webp', lado: 4096 },
  { archivo: 'grande.webp', lado: 8192 },
]

/** El color con que se rellena el RGB donde el alfa es 0: claro, para que el filtrado no oscurezca el borde. */
export const PAPEL = { r: 241, g: 230, b: 205 }

/** Los niveles del recorte: chico siempre; los demás, si el recorte no es más chico que el nivel (no se agranda). */
export function nivelesEpoca(ancho, alto) {
  if (!(ancho > 0 && alto > 0)) throw new Error(`planos: medidas inválidas ${ancho}×${alto}`)
  const mayor = Math.max(ancho, alto)
  return LADOS.filter((n, k) => k === 0 || n.lado <= mayor).map((n) => ({ ...n }))
}

const medidas = ({ año, recorte }) => {
  const [x0, y0, x1, y1] = recorte ?? []
  if (!(x1 > x0 && y1 > y0)) throw new Error(`planos: recorte inválido en ${año}: ${JSON.stringify(recorte)}`)
  return [x1 - x0, y1 - y0]
}

/**
 * plano/epocas.json: por año, el plano de origen, el recorte en píxeles de la hoja de 1936 (lo que cubre
 * la textura) y sus niveles, de menor a mayor. `calzados`: [{ año, plano, recorte }] de cada calzado.json.
 */
export function indicePlanos(calzados) {
  const planos = [...calzados].sort((a, b) => a.año - b.año).map((c) => ({
    año: c.año,
    plano: c.plano,
    recorte: [...c.recorte],
    niveles: nivelesEpoca(...medidas(c)).map(({ archivo, lado }) => ({ url: `plano/${c.año}/${archivo}`, lado })),
  }))
  return { planos }
}

/** Todo lo que escribe tools/planos-epocas.mjs, relativo a la raíz del repo. */
export function salidasPlanosEpocas(calzados) {
  const { planos } = indicePlanos(calzados)
  return ['public/plano/epocas.json', ...planos.flatMap((p) => p.niveles.map((n) => `public/${n.url}`))]
}

/** Copia de un RGBA con el RGB de los píxeles transparentes en PAPEL (el filtrado los mezcla con el borde). */
export function rellenarTransparente(rgba) {
  const r = Uint8Array.from(rgba)
  for (let i = 0; i < r.length; i += 4) {
    if (r[i + 3] === 0) { r[i] = PAPEL.r; r[i + 1] = PAPEL.g; r[i + 2] = PAPEL.b }
  }
  return r
}
