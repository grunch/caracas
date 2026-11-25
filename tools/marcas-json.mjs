// Las marcas (src/marcas-datos.js) con su punto en píxeles del mosaico y su vida, resueltas como en el visor
// (normalizarMarcas: las que apuntan a un hito toman de él su punto y su época). Las lee la puerta R9 de las reglas
// de construcción (tools/geo/reglas_mapa.py). Uso: node tools/marcas-json.mjs → JSON por la salida estándar.
import { pathToFileURL } from 'node:url'
import { normalizarMarcas } from '../src/marcas.js'
import { MARCAS } from '../src/marcas-datos.js'
import { HITOS } from '../src/hitos.js'

const SIN_COORDS = { aMundo: (px, py) => ({ x: px, z: py }) }

/** [{id, px, py, nace, muere, hito}] de `filas` con `hitos` ({id, x, y, nace}). */
export function marcasConPosicion(filas, hitos) {
  return normalizarMarcas(filas, { hitos, coords: SIN_COORDS })
    .map(({ id, px, py, nace, muere, hito }) => ({ id, px, py, nace, muere, hito }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(JSON.stringify(marcasConPosicion(MARCAS, HITOS)))
}
