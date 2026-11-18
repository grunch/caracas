#!/usr/bin/env node
// Uso: node tools/rotulos.mjs <rotulos.png>  → public/plano/rotulos.webp (4096) y rotulos-2k.webp (2048)
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { generarRotulos, codificarRotulos } from './rotulos-lib.mjs'

const [entrada] = process.argv.slice(2)
if (!entrada) {
  console.error('uso: node tools/rotulos.mjs <rotulos.png>')
  process.exit(1)
}
const SALIDA = path.resolve(import.meta.dirname, '..', 'public', 'plano')
try {
  const { data, info } = await sharp(entrada, { limitInputPixels: false }).extractChannel(0).raw().toBuffer({ resolveWithObject: true })
  const mascara = { datos: data, ancho: info.width, alto: info.height }
  await mkdir(SALIDA, { recursive: true })
  for (const [archivo, lado] of [['rotulos.webp', 4096], ['rotulos-2k.webp', 2048]]) {
    await writeFile(path.join(SALIDA, archivo), await codificarRotulos(generarRotulos(mascara, lado)))
    console.log(`  ${archivo}`)
  }
} catch (e) {
  console.error(`error: ${e.message}`)
  process.exit(1)
}
