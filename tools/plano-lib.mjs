// Lógica pura del teselado del plano (la usa tools/plano.mjs).

export const TESELA = 3072
const LADOS = [
  { archivo: 'primero.webp', lado: 1024 },
  { archivo: 'chico.webp', lado: 2048 },
  { archivo: 'medio-4k.webp', lado: 4096 },
  { archivo: 'medio.webp', lado: 8192 },
]

export function grillaTeselas(ancho, alto, tesela = TESELA) {
  if (!(ancho > 0 && alto > 0)) throw new Error(`plano: medidas inválidas ${ancho}×${alto}`)
  if (!(tesela > 0)) throw new Error(`plano: tesela inválida ${tesela}`)
  const cols = Math.ceil(ancho / tesela)
  const rows = Math.ceil(alto / tesela)
  const teselas = []
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = i * tesela
      const y = j * tesela
      teselas.push({ i, j, x, y, ancho: Math.min(tesela, ancho - x), alto: Math.min(tesela, alto - y), nombre: `${i}-${j}` })
    }
  }
  return { cols, rows, tesela, teselas }
}

/** Los niveles de detalle cuyo lado mayor no supera al de la imagen. */
export function nivelesLOD(ancho, alto) {
  const mayor = Math.max(ancho, alto)
  return LADOS.filter((n, k) => k === 0 || n.lado <= mayor)
}

/** mosaico.json (tools/geo/mosaico.py) → bloque "plano" de public/datos/ciudad.json. */
export function planoDesdeMosaico({ metro, ancho, alto, origen_m, marco, plaza }) {
  if (!(metro > 0)) throw new Error('mosaico: falta "metro"')
  if (!Array.isArray(plaza) || plaza.length !== 2) throw new Error('mosaico: falta "plaza" (Plaza Bolívar en píxeles)')
  const caja = marco ?? [0, 0, ancho, alto]
  return { ancho, alto, metro, plaza: [...plaza], marco: [...caja], interior: [...caja], origen_m: origen_m ? [...origen_m] : null }
}
