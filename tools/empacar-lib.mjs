// JSON del vectorizador (tools/geo/vectorizar.py) → partes del contenedor .pak (src/ciudad.js las lee).
import { empacarTecho } from '../src/ciudad.js'

export const EPOCAS = 8 // nace y muere caben en 3 bits: nace + 8·muere
export const CUANTAS_EPOCAS = 6 // épocas de la línea de tiempo: 0 → 1578 … 5 → 1936

export function partesDeCiudad({ vertices, techos, vida }) {
  if (vertices.length % 2 !== 0) throw new Error('ciudad: los vértices deben venir de a pares (px, py)')
  const nVertices = vertices.length / 2
  const datosTechos = new Uint32Array(techos.length * 4)
  techos.forEach(([inicio, cuantos, pisos, estilo, semilla], k) => {
    if (inicio + cuantos > nVertices || cuantos < 3) {
      throw new Error(`ciudad: el techo ${k} apunta fuera de los vértices (${inicio}+${cuantos} de ${nVertices})`)
    }
    datosTechos.set([inicio, cuantos, empacarTecho({ pisos, estilo }), semilla], k * 4)
  })
  const partes = {
    vertices: { datos: Float32Array.from(vertices), registro: 8 },
    techos: { datos: datosTechos, registro: 16 },
  }
  if (vida !== undefined) partes.vida = { datos: empacarVida(vida, techos.length), registro: 4 }
  return partes
}

/** [[nace, muere], …] (0 = desde siempre / nunca muere) → Uint32 nace + 8·muere por techo. */
export function empacarVida(vida, cuantosTechos) {
  if (!Array.isArray(vida)) throw new Error('ciudad: "vida" tiene que ser una lista de [nace, muere]')
  if (vida.length !== cuantosTechos) {
    throw new Error(`ciudad: la vida tiene ${vida.length} entradas y hay ${cuantosTechos} techos`)
  }
  return Uint32Array.from(vida, (par, k) => {
    const [nace, muere] = Array.isArray(par) ? par : []
    if (!Number.isInteger(nace) || !Number.isInteger(muere)) {
      throw new Error(`ciudad: la vida del techo ${k} tiene que ser un par de enteros [nace, muere]`)
    }
    if (nace < 0 || nace >= CUANTAS_EPOCAS || muere < 0 || muere >= CUANTAS_EPOCAS) {
      throw new Error(`ciudad: la vida del techo ${k} sale de las épocas 0…${CUANTAS_EPOCAS - 1}`)
    }
    if (muere !== 0 && muere <= nace) throw new Error(`ciudad: el techo ${k} muere (${muere}) antes de nacer (${nace})`)
    return nace + EPOCAS * muere
  })
}
