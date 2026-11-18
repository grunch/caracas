// Clases de la segmentación (tools/geo/segmentar.py) → textura de suelo para el modo color.
// Canales: R agua · G vegetación (verde, cultivo) · B edificado (casas y edificios públicos) ·
// A manzana (todo lo que está dentro de una manzana: edificado, patio, jardín).
const CANALES = {
  1: [0, 0, 0, 0], // calle
  2: [0, 0, 0, 255], // patio
  3: [0, 0, 255, 255], // edificado
  4: [0, 0, 255, 255], // edificio público
  5: [0, 255, 0, 255], // verde (jardín, plaza, árboles)
  6: [0, 255, 0, 0], // cultivo
  7: [255, 0, 0, 0], // agua
  8: [0, 0, 0, 0], // cerro / terreno libre
}
const NADA = [0, 0, 0, 0]

export const rgbaDeClase = (clase) => [...(CANALES[clase] ?? NADA)]

export function tablaSuelo() {
  const tabla = new Uint8Array(256 * 4)
  for (let c = 0; c < 256; c++) tabla.set(rgbaDeClase(c), c * 4)
  return tabla
}

/**
 * Máscara RGBA a `lado` px de lado mayor. RGB y A se redimensionan por separado: sharp premultiplica
 * por alfa al redimensionar, y el agua y los cultivos tienen A = 0 (no son manzana) — juntos se perderían.
 */
export async function generarMascara({ datos, ancho, alto }, lado) {
  const { default: sharp } = await import('sharp')
  const tabla = new Uint32Array(tablaSuelo().buffer)
  const n = ancho * alto
  const rgb = Buffer.alloc(n * 3)
  const a = Buffer.alloc(n)
  for (let i = 0; i < n; i++) {
    const v = tabla[datos[i]] // little-endian: R en el byte bajo
    rgb[i * 3] = v & 0xff
    rgb[i * 3 + 1] = (v >> 8) & 0xff
    rgb[i * 3 + 2] = (v >> 16) & 0xff
    a[i] = v >>> 24
  }
  // b-w en el alfa: sin eso sharp sale en sRGB y devuelve tres canales iguales
  const achicar = (buf, canales) => sharp(buf, { raw: { width: ancho, height: alto, channels: canales }, limitInputPixels: false })
    .resize(lado, lado, { fit: 'inside' }).toColourspace(canales === 1 ? 'b-w' : 'srgb').raw().toBuffer({ resolveWithObject: true })
  const [color, alfa] = await Promise.all([achicar(rgb, 3), achicar(a, 1)])
  const { width, height } = color.info
  const [cc, ca] = [color.info.channels, alfa.info.channels] // se indexa con lo que sharp informa
  const data = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = color.data[i * cc]
    data[i * 4 + 1] = color.data[i * cc + 1]
    data[i * 4 + 2] = color.data[i * cc + 2]
    data[i * 4 + 3] = alfa.data[i * ca]
  }
  return { data, width, height }
}

/** WebP sin pérdida que conserva RGB bajo alfa 0 (por defecto el codificador lo descarta). */
export async function codificarMascara({ data, width, height }) {
  const { default: sharp } = await import('sharp')
  return sharp(data, { raw: { width, height, channels: 4 } }).webp({ lossless: true, exact: true }).toBuffer()
}
