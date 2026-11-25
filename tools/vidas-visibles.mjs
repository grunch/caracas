// La vida de cada casa como la ve el visor: la de public/datos/ciudad.pak con los hitos puestos (suprimirTechos, la
// misma llamada que src/main.js). La leen las puertas de las reglas de construcción (tools/geo/reglas_mapa.py), que así
// miden las casas a la vista y no las del JSON antes del paso de estilos ni con otra regla de supresión.
// Uso: node tools/vidas-visibles.mjs → JSON {pak_sha256, techos, vida: [[nace, muere], …]} por la salida estándar.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'
import { decodificarPak } from '../src/pak.js'
import { HITOS, suprimirTechos, zonasDeSupresion } from '../src/hitos.js'

const ETAPAS_POR_VIDA = 8   // vida = nace + 8 · muere (src/ciudad.js)

/** [[nace, muere]] de cada techo de `datos` (vertices, techos, vida, marcos, alas, historia) con `hitos` puestos. */
export function vidasVisibles(datos, hitos) {
  const vida = suprimirTechos(datos, zonasDeSupresion(hitos))
  return Array.from(vida, (v) => [v % ETAPAS_POR_VIDA, Math.floor(v / ETAPAS_POR_VIDA)])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pak = readFileSync('public/datos/ciudad.pak')
  const b = gunzipSync(pak)
  const datos = decodificarPak(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), {
    vertices: Float32Array, techos: Uint32Array, vida: Uint32Array, historia: Uint8Array, marcos: Float32Array, alas: Float32Array, vuelos: Uint8Array,
  })
  process.stdout.write(JSON.stringify({
    pak_sha256: createHash('sha256').update(pak).digest('hex'),
    techos: datos.techos.length / 4,
    vida: vidasVisibles(datos, HITOS),
  }))
}
