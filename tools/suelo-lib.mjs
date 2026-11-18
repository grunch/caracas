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
