#!/usr/bin/env node
// Uso (desde la raíz del checkout con los datos): node tools/suelo.mjs <clases.png> [patios.png]  → public/plano/suelo.webp (4096) y suelo-2k.webp (2048)
// patios.png: la máscara de los patios abiertos por regla (tools/geo/vectorizar.py --patios), del tamaño de las clases.
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { generarMascara, codificarMascara, conPatios } from './suelo-lib.mjs'

const [entrada, patios] = process.argv.slice(2)
if (!entrada) {
  console.error('uso: node tools/suelo.mjs <clases.png> [patios.png]')
  process.exit(1)
}
const SALIDA = path.resolve('public', 'plano')
const { data, info } = await sharp(entrada, { limitInputPixels: false }).extractChannel(0).raw().toBuffer({ resolveWithObject: true })
const leerCanal = (ruta) => sharp(ruta, { limitInputPixels: false }).extractChannel(0).raw().toBuffer()
const clases = { datos: patios ? conPatios(data, await leerCanal(patios)) : data, ancho: info.width, alto: info.height }
for (const [archivo, lado] of [['suelo.webp', 4096], ['suelo-2k.webp', 2048]]) {
  await writeFile(path.join(SALIDA, archivo), await codificarMascara(await generarMascara(clases, lado)))
  console.log(`  ${archivo}`)
}
