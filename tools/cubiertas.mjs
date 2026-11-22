// Los triángulos de techo de 1772 como los dibuja el visor (tools/cubiertas-lib.mjs), sacados de los datos generados
// (public/datos: ciudad.pak, ciudad.json, relieve.bin), para la puerta de la fase 6 (tools/geo/cierre_fase6.py).
// Uso: node tools/cubiertas.mjs [salida] (por omisión, fuentes/derivados/epocas/cubiertas-1772.json)
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { DataUtils } from 'three'
import { decodificarPak } from '../src/pak.js'
import { crearCoords } from '../src/coords.js'
import { decodificarRelieve, crearRelieve, muestrear } from '../src/relieve.js'
import { cubiertasDeEpoca } from './cubiertas-lib.mjs'

const EPOCA_1772 = 1
const comoBuffer = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
const salida = process.argv[2] ?? 'fuentes/derivados/epocas/cubiertas-1772.json'

const datos = decodificarPak(comoBuffer(gunzipSync(readFileSync('public/datos/ciudad.pak'))), {
  vertices: Float32Array, techos: Uint32Array, vida: Uint32Array, historia: Uint8Array, marcos: Float32Array, alas: Float32Array,
})
const coords = crearCoords(JSON.parse(readFileSync('public/datos/ciudad.json', 'utf8')).plano)
const relieve = crearRelieve(decodificarRelieve(comoBuffer(readFileSync('public/datos/relieve.bin'))), coords.hoja)
// la textura del relieve va en half-float relativa a la referencia: la misma cuantización que ve el shader
const textura = { ...relieve, alturas: Float32Array.from(relieve.alturas, (a) => DataUtils.fromHalfFloat(DataUtils.toHalfFloat(a - relieve.referencia))) }
const altura = (x, z) => muestrear(textura, (x - coords.hoja.x0) / coords.hoja.ancho, (z - coords.hoja.z0) / coords.hoja.alto)

const { triangulos } = cubiertasDeEpoca(datos, coords, { epoca: EPOCA_1772, altura })
writeFileSync(salida, JSON.stringify({
  epoca: EPOCA_1772,
  metodo: 'CPU: geometría de src/ciudad.js, pisos de la época, aleros con pretil fuera y relieve half-float relativo, como el shader (T33j.1l). No lee el GPU.',
  triangulos,
}))
console.log(`cubiertas de 1772: ${triangulos.length} triángulos de ${new Set(triangulos.map((t) => t.techo)).size} casas → ${salida}`)
