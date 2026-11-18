/**
 * Coordenadas: los datos viven en píxeles del escaneo base; el mundo, en metros con
 * la plaza en el origen. x crece a la derecha del plano y z hacia abajo (sur, si el
 * plano está orientado al norte).
 */
export function crearCoords({ ancho, alto, metro, plaza }) {
  if (!(metro > 0)) throw new Error(`plano: "metro" debe ser > 0 (vino ${metro})`)
  if (!Array.isArray(plaza) || plaza.length !== 2) throw new Error('plano: "plaza" debe ser [px, py]')
  const [px0, py0] = plaza
  return Object.freeze({
    metro,
    aMundo: (px, py) => ({ x: (px - px0) * metro, z: (py - py0) * metro }),
    aPixel: (x, z) => ({ px: x / metro + px0, py: z / metro + py0 }),
    hoja: Object.freeze({ ancho: ancho * metro, alto: alto * metro, x0: -px0 * metro, z0: -py0 * metro }),
  })
}
