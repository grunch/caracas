#!/usr/bin/env node
// Uso (desde la raíz del checkout con los datos): node tools/empacar-ciudad.mjs <ciudad.json> → public/datos/ciudad.pak
// Si el JSON trae "vida" (tools/geo/epocas.py), el .pak lleva también la parte vida (ver specs/02).
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { codificarPak } from './pak.mjs'
import { partesDeCiudad } from './empacar-lib.mjs'

const [entrada] = process.argv.slice(2)
if (!entrada) {
  console.error('uso: node tools/empacar-ciudad.mjs <ciudad.json>')
  process.exit(1)
}
const json = JSON.parse(await readFile(entrada, 'utf8'))
const pak = codificarPak(partesDeCiudad(json))
const salida = path.resolve('public', 'datos', 'ciudad.pak')
await writeFile(salida, pak)
console.log(`${json.techos.length} techos${json.vida ? ' con vida' : ''}, ${(pak.length / 1024 / 1024).toFixed(1)} MB → ${salida}`)
