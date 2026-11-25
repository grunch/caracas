// Los triángulos de techo de una época como los dibuja el visor (tools/cubiertas-lib.mjs), sacados de los datos
// generados (public/datos: ciudad.pak, ciudad.json, relieve.bin), para la puerta de cubiertas de cada auditoría de
// época (la de 1772: tools/geo/cierre_fase6.py; la metodología: specs/12).
// Uso: node tools/cubiertas.mjs [salida]                  1772 (por omisión, fuentes/derivados/epocas/cubiertas-1772.json)
//      node tools/cubiertas.mjs --epoca <año> [salida]    esa época (por omisión, …/cubiertas-<año>.json)
//      node tools/cubiertas.mjs --todas                   cada época de la línea de tiempo, en …/cubiertas-<año>.json
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { DataUtils } from 'three'
import { decodificarPak } from '../src/pak.js'
import { crearCoords } from '../src/coords.js'
import { decodificarRelieve, crearRelieve, muestrear } from '../src/relieve.js'
import { cubiertasDeEpoca, huellasSha256, pedidoDeCubiertas, prepararCubiertas } from './cubiertas-lib.mjs'

const comoBuffer = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
let pedidos
try {
  pedidos = pedidoDeCubiertas(process.argv.slice(2))
} catch (e) {
  console.error(e.message)
  process.exit(2)
}

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

const procedencia = {
  // la procedencia: la puerta no acepta cubiertas de otros datos
  pak_sha256: createHash('sha256').update(pak).digest('hex'),
  relieve_sha256: createHash('sha256').update(relieveBin).digest('hex'),
  huellas_sha256: huellasSha256(datos),
}
const preparada = prepararCubiertas(datos, coords)
for (const { epoca, año, salida } of pedidos) {
  const { triangulos } = cubiertasDeEpoca(datos, coords, { epoca, altura, preparada })
  writeFileSync(salida, JSON.stringify({
    epoca,
    año,
    ...procedencia,
    metodo: 'CPU: geometría de src/ciudad.js, pisos de la época, aleros con pretil fuera y relieve half-float relativo, como el shader (T33j.1l). No lee el GPU.',
    triangulos,
  }))
  console.log(`cubiertas de ${año}: ${triangulos.length} triángulos de ${new Set(triangulos.map((t) => t.techo)).size} casas → ${salida}`)
}
