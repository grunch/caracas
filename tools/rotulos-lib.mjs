// Máscara de rótulos del plano (tools/geo/rotulos.py: 255 = letra, cifra o símbolo) → textura de un
// canal para el modo color (src/shader/suelo.js): donde vale 1, el dibujo del plano no se marca.
// La cobertura se achica por máximo, con un margen: un trazo de medio metro tiene que quedar tapado
// entero, con su borde difuminado, aunque el texel mida más de dos metros. El visor la lee con
// filtrado bilineal y la duplica (el borde de un texel prendido da 0,5 y tiene que tapar igual).

/** Píxeles de la máscara que se suman alrededor de cada rótulo: el borde difuminado de la tinta en el plano. */
export const MARGEN_PX = 2

function validar({ datos, ancho, alto }, lado) {
  if (!Number.isInteger(ancho) || !Number.isInteger(alto) || ancho < 1 || alto < 1) {
    throw new Error(`rótulos: tamaño inválido ${ancho}×${alto}`)
  }
  if (!datos || datos.length < ancho * alto) {
    throw new Error(`rótulos: la máscara tiene ${datos?.length ?? 0} píxeles y se esperaban ${ancho * alto}`)
  }
  if (!Number.isInteger(lado) || lado < 1) throw new Error(`rótulos: lado inválido ${lado}`)
}

/**
 * Cobertura a `lado` px de lado mayor (nunca más grande que la entrada): 255 si la celda tiene un rótulo
 * a `margen` píxeles o menos (en cuadrado). Devuelve una imagen nueva.
 */
export function achicarPorMaximo({ datos, ancho, alto }, lado, margen = 0) {
  validar({ datos, ancho, alto }, lado)
  if (!Number.isInteger(margen) || margen < 0) throw new Error(`rótulos: margen inválido ${margen}`)
  const factor = Math.min(1, lado / Math.max(ancho, alto))
  const width = Math.max(1, Math.round(ancho * factor))
  const height = Math.max(1, Math.round(alto * factor))
  const celda = (v, total, celdas) => Math.min(celdas - 1, Math.floor((Math.min(total - 1, Math.max(0, v)) * celdas) / total))
  // por columna de la entrada, la primera y la última columna de la salida que toca con su margen
  const desdeX = Int32Array.from({ length: ancho }, (_, x) => celda(x - margen, ancho, width))
  const hastaX = Int32Array.from({ length: ancho }, (_, x) => celda(x + margen, ancho, width))
  const data = new Uint8Array(width * height)
  for (let y = 0; y < alto; y++) {
    const desdeY = celda(y - margen, alto, height)
    const hastaY = celda(y + margen, alto, height)
    const fila = y * ancho
    for (let x = 0; x < ancho; x++) {
      if (!datos[fila + x]) continue
      for (let v = desdeY; v <= hastaY; v++) data.fill(255, v * width + desdeX[x], v * width + hastaX[x] + 1)
    }
  }
  return { data, width, height }
}

export const generarRotulos = (mascara, lado) => achicarPorMaximo(mascara, lado, MARGEN_PX)

/** WebP sin pérdida de un canal (el codificador lo guarda como gris). */
export async function codificarRotulos({ data, width, height }) {
  const { default: sharp } = await import('sharp')
  return sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width, height, channels: 1 } })
    .webp({ lossless: true }).toBuffer()
}
