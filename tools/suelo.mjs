#!/usr/bin/env node
// Uso: node tools/suelo.mjs <clases.png>  → public/plano/suelo.webp (4096) y suelo-2k.webp (2048)
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { generarMascara, codificarMascara } from './suelo-lib.mjs'

const [entrada] = process.argv.slice(2)
if (!entrada) {
  console.error('uso: node tools/suelo.mjs <clases.png>')
  process.exit(1)
}
const SALIDA = path.resolve(import.meta.dirname, '..', 'public', 'plano')
const { data, info } = await sharp(entrada, { limitInputPixels: false }).extractChannel(0).raw().toBuffer({ resolveWithObject: true })
const clases = { datos: data, ancho: info.width, alto: info.height }
for (const [archivo, lado] of [['suelo.webp', 4096], ['suelo-2k.webp', 2048]]) {
  await writeFile(path.join(SALIDA, archivo), await codificarMascara(await generarMascara(clases, lado)))
  console.log(`  ${archivo}`)
}
