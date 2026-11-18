// JSON del vectorizador (tools/geo/vectorizar.py) → partes del contenedor .pak (src/ciudad.js las lee).
import { empacarTecho } from '../src/ciudad.js'

export const EPOCAS = 8 // nace y muere caben en 3 bits: nace + 8·muere

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
  if (vida) partes.vida = { datos: empacarVida(vida, techos.length), registro: 4 }
  return partes
}

/** [[nace, muere], …] (0 = desde siempre / nunca muere) → Uint32 nace + 8·muere por techo. */
export function empacarVida(vida, cuantosTechos) {
  if (vida.length !== cuantosTechos) {
    throw new Error(`ciudad: la vida tiene ${vida.length} entradas y hay ${cuantosTechos} techos`)
  }
  return Uint32Array.from(vida, ([nace, muere], k) => {
    if (!(nace >= 0 && nace < EPOCAS && muere >= 0 && muere < EPOCAS)) {
      throw new Error(`ciudad: la vida del techo ${k} sale de las épocas 0…${EPOCAS - 1}`)
    }
    if (muere !== 0 && muere <= nace) throw new Error(`ciudad: el techo ${k} muere (${muere}) antes de nacer (${nace})`)
    return nace + EPOCAS * muere
  })
}
