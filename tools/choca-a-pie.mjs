// ¿Choca el caminante del modo a pie en estos puntos? La rejilla de colisión del visor (src/a-pie.js) armada como en
// src/a-pie-modo.js con los datos generados (public/datos/ciudad.pak), para la puerta de la fase 7 de 1772
// (tools/geo/cierre_fase7.py: lo visible choca). Entrada (stdin): [[px, py], …] del plano; salida: [true|false, …].
// Uso: node tools/choca-a-pie.mjs <época>
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { decodificarPak } from '../src/pak.js'
import { crearCoords } from '../src/coords.js'
import { choca } from '../src/a-pie.js'
import { rejillaComoElVisor } from './choca-a-pie-lib.mjs'

const epoca = Number(process.argv[2] ?? 1)
const pak = gunzipSync(readFileSync('public/datos/ciudad.pak'))
const datos = decodificarPak(pak.buffer.slice(pak.byteOffset, pak.byteOffset + pak.byteLength),
  { vertices: Float32Array, techos: Uint32Array, vida: Uint32Array }, () => {})
const coords = crearCoords(JSON.parse(readFileSync('public/datos/ciudad.json', 'utf8')).plano)
const rejilla = rejillaComoElVisor(datos, epoca, coords.aMundo)
const puntos = JSON.parse(readFileSync(0, 'utf8'))
console.log(JSON.stringify(puntos.map(([px, py]) => {
  const { x, z } = coords.aMundo(px, py)
  return choca(rejilla, x, z)
})))
