// JSON del vectorizador (tools/geo/vectorizar.py) → partes del contenedor .pak (src/ciudad.js las lee).
import { empacarTecho } from '../src/ciudad.js'

export const EPOCAS = 8 // nace y muere caben en 3 bits: nace + 8·muere
export const CUANTAS_EPOCAS = 6 // épocas de la línea de tiempo: 0 → 1578 … 5 → 1936

export const CAMPOS_MARCO = 11 // techo, ox, oy, eux, euy, ancho, fondo, calles, crujía, primera ala, cuántas
export const CAMPOS_ALA = 5 // tipo, u0, v0, u1, v1
const TIPOS_DE_ALA = 9 // tools/geo/alas.py: patio, solar, frente, cruzada, laterales, esquinas, fondo

export function partesDeCiudad({ vertices, techos, vida, historia, marcos, alas }) {
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
  if (historia !== undefined) partes.historia = { datos: empacarHistorias(historia, techos.length), registro: CUANTAS_EPOCAS }
  if (marcos?.length) Object.assign(partes, empacarAlas(marcos, alas ?? [], techos.length))
  return partes
}

/**
 * Las casas de patio (tools/geo/alas.py): "marcos" [[techo, ox, oy, eux, euy, ancho, fondo, calles, crujía,
 * primera ala, cuántas], …] y "alas" [[tipo, u0, v0, u1, v1], …] → dos partes Float32 (los índices caben exactos).
 */
export function empacarAlas(marcos, alas, cuantosTechos) {
  const vistos = new Set()
  marcos.forEach((m, k) => {
    if (!Array.isArray(m) || m.length !== CAMPOS_MARCO || !m.every(Number.isFinite)) {
      throw new Error(`ciudad: el marco ${k} tiene que traer ${CAMPOS_MARCO} números`)
    }
    const [techo, , , , , ancho, fondo, , , primera, cuantas] = m
    if (!Number.isInteger(techo) || techo < 0 || techo >= cuantosTechos || vistos.has(techo)) {
      throw new Error(`ciudad: el marco ${k} apunta a un techo que no existe o repetido (${techo})`)
    }
    vistos.add(techo)
    if (!(ancho > 0) || !(fondo > 0)) throw new Error(`ciudad: el marco ${k} no tiene ancho ni fondo`)
    if (!Number.isInteger(primera) || !Number.isInteger(cuantas) || primera < 0 || cuantas < 0 || primera + cuantas > alas.length) {
      throw new Error(`ciudad: el marco ${k} apunta fuera de las alas (${primera}+${cuantas} de ${alas.length})`)
    }
  })
  alas.forEach((a, k) => {
    if (!Array.isArray(a) || a.length !== CAMPOS_ALA || !a.every(Number.isFinite)) {
      throw new Error(`ciudad: el ala ${k} tiene que traer ${CAMPOS_ALA} números`)
    }
    const [tipo, u0, v0, u1, v1] = a
    if (!Number.isInteger(tipo) || tipo < 0 || tipo >= TIPOS_DE_ALA) throw new Error(`ciudad: el ala ${k} es de un tipo desconocido (${tipo})`)
    if (!(u1 > u0) || !(v1 > v0)) throw new Error(`ciudad: el ala ${k} no tiene área`)
  })
  return {
    marcos: { datos: Float32Array.from(marcos.flat()), registro: CAMPOS_MARCO * 4 },
    alas: { datos: Float32Array.from(alas.flat()), registro: CAMPOS_ALA * 4 },
  }
}

/** [[byte × 6 épocas], …] por techo (tools/geo/estilos.py: estilo + 16·pisos) → Uint8, 6 por techo. */
export function empacarHistorias(historia, cuantosTechos) {
  if (!Array.isArray(historia) || historia.length !== cuantosTechos) {
    throw new Error(`ciudad: "historia" tiene que ser una lista con una entrada por techo (${cuantosTechos})`)
  }
  const datos = new Uint8Array(cuantosTechos * CUANTAS_EPOCAS)
  historia.forEach((bytes, k) => {
    if (!Array.isArray(bytes) || bytes.length !== CUANTAS_EPOCAS) {
      throw new Error(`ciudad: la historia del techo ${k} tiene que traer ${CUANTAS_EPOCAS} épocas`)
    }
    for (const b of bytes) {
      if (!Number.isInteger(b) || b < 16 || b > 255) {
        throw new Error(`ciudad: la historia del techo ${k} trae ${b}; se espera estilo + 16·pisos (16…255)`)
      }
    }
    datos.set(bytes, k * CUANTAS_EPOCAS)
  })
  return datos
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
