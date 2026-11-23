// Los triángulos de techo de 1772 como los dibuja el visor (tools/cubiertas-lib.mjs), sacados de los datos generados
// (public/datos: ciudad.pak, ciudad.json, relieve.bin), para la puerta de la fase 6 (tools/geo/cierre_fase6.py).
// Uso: node tools/cubiertas.mjs [salida] (por omisión, fuentes/derivados/epocas/cubiertas-1772.json)
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { DataUtils } from 'three'
import { decodificarPak } from '../src/pak.js'
import { crearCoords } from '../src/coords.js'
import { decodificarRelieve, crearRelieve, muestrear } from '../src/relieve.js'
import { cubiertasDeEpoca, huellasSha256 } from './cubiertas-lib.mjs'

const EPOCA_1772 = 1
const comoBuffer = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
const salida = process.argv[2] ?? 'fuentes/derivados/epocas/cubiertas-1772.json'

const pak = readFileSync('public/datos/ciudad.pak')
const datos = decodificarPak(comoBuffer(gunzipSync(pak)), {
  vertices: Float32Array, techos: Uint32Array, vida: Uint32Array, historia: Uint8Array, marcos: Float32Array, alas: Float32Array, vuelos: Uint8Array,
})
const coords = crearCoords(JSON.parse(readFileSync('public/datos/ciudad.json', 'utf8')).plano)
const relieveBin = readFileSync('public/datos/relieve.bin')
const relieve = crearRelieve(decodificarRelieve(comoBuffer(relieveBin)), coords.hoja)
// la textura del relieve va en half-float relativa a la referencia: la misma cuantización que ve el shader
const textura = { ...relieve, alturas: Float32Array.from(relieve.alturas, (a) => DataUtils.fromHalfFloat(DataUtils.toHalfFloat(a - relieve.referencia))) }
const altura = (x, z) => muestrear(textura, (x - coords.hoja.x0) / coords.hoja.ancho, (z - coords.hoja.z0) / coords.hoja.alto)

const { triangulos } = cubiertasDeEpoca(datos, coords, { epoca: EPOCA_1772, altura })
writeFileSync(salida, JSON.stringify({
  epoca: EPOCA_1772,
  // la procedencia: la puerta (tools/geo/cierre_fase6.py) no acepta cubiertas de otros datos
  pak_sha256: createHash('sha256').update(pak).digest('hex'),
  relieve_sha256: createHash('sha256').update(relieveBin).digest('hex'),
  huellas_sha256: huellasSha256(datos),
  metodo: 'CPU: geometría de src/ciudad.js, pisos de la época, aleros con pretil fuera y relieve half-float relativo, como el shader (T33j.1l). No lee el GPU.',
  triangulos,
}))
console.log(`cubiertas de 1772: ${triangulos.length} triángulos de ${new Set(triangulos.map((t) => t.techo)).size} casas → ${salida}`)
