// JSON del vectorizador (tools/geo/vectorizar.py) → partes del contenedor .pak (src/ciudad.js las lee).
import { empacarTecho } from '../src/ciudad.js'

export function partesDeCiudad({ vertices, techos }) {
  if (vertices.length % 2 !== 0) throw new Error('ciudad: los vértices deben venir de a pares (px, py)')
  const nVertices = vertices.length / 2
  const datosTechos = new Uint32Array(techos.length * 4)
  techos.forEach(([inicio, cuantos, pisos, estilo, semilla], k) => {
    if (inicio + cuantos > nVertices || cuantos < 3) {
      throw new Error(`ciudad: el techo ${k} apunta fuera de los vértices (${inicio}+${cuantos} de ${nVertices})`)
    }
    datosTechos.set([inicio, cuantos, empacarTecho({ pisos, estilo }), semilla], k * 4)
  })
  return {
    vertices: { datos: Float32Array.from(vertices), registro: 8 },
    techos: { datos: datosTechos, registro: 16 },
  }
}
