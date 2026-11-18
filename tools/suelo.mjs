#!/usr/bin/env node
// Uso: node tools/suelo.mjs <clases.png>  → public/plano/suelo.webp (4096) y suelo-2k.webp (2048)
import path from 'node:path'
import sharp from 'sharp'
import { tablaSuelo } from './suelo-lib.mjs'

const [entrada] = process.argv.slice(2)
if (!entrada) {
  console.error('uso: node tools/suelo.mjs <clases.png>')
  process.exit(1)
}
const SALIDA = path.resolve(import.meta.dirname, '..', 'public', 'plano')
const { data, info } = await sharp(entrada, { limitInputPixels: false }).extractChannel(0).raw().toBuffer({ resolveWithObject: true })
// una asignación de 32 bits por píxel: la tabla y la salida vistas como Uint32
const tabla = new Uint32Array(tablaSuelo().buffer)
const rgba = Buffer.alloc(info.width * info.height * 4)
const salida32 = new Uint32Array(rgba.buffer, rgba.byteOffset, info.width * info.height)
for (let i = 0; i < data.length; i++) salida32[i] = tabla[data[i]]
const imagen = () => sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 }, limitInputPixels: false })
for (const [archivo, lado] of [['suelo.webp', 4096], ['suelo-2k.webp', 2048]]) {
  await imagen().resize(lado, lado, { fit: 'inside' }).webp({ quality: 90, alphaQuality: 90 }).toFile(path.join(SALIDA, archivo))
  console.log(`  ${archivo}`)
}
