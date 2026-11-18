#!/usr/bin/env node
// Uso: node tools/arboles.mjs <arboles.json> <mosaico.json> [jardines.json] → public/datos/arboles.bin (specs/02)
// Los árboles del plano de 1936 (los símbolos que detectó la segmentación, más los de los canteros de
// plazas y patios de tools/geo/jardines.py), con la época en que aparecen: lee
// public/plano/crece.png + public/datos/crece.json (desde cuándo está edificado cada lugar) y
// public/datos/ciudad.pak (las casas que desaparecen). Sin esos datos, todos nacen en la primera época.
import { readFile, writeFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import path from 'node:path'
import sharp from 'sharp'
import { decodificarPak } from '../src/pak.js'
import { codificarArboles, naceArbol, casasQueMueren, desdeEnCrece, desdeDelEntorno } from './arboles-lib.mjs'

const RAIZ = path.resolve(import.meta.dirname, '..')
const ETAPAS = 6
const ENTORNO_JARDIN = 3 // celdas de crece.png (8 m) alrededor de un árbol de jardín

const [entrada, mosaico, jardines] = process.argv.slice(2)
if (!entrada || !mosaico) {
  console.error('uso: node tools/arboles.mjs <arboles.json> <mosaico.json> [jardines.json]')
  process.exit(1)
}
const leer = (ruta) => readFile(path.resolve(RAIZ, ruta))
const siHay = (promesa, que) => promesa.catch((e) => { console.warn(`arboles: sin ${que} (${e.code ?? e.message}); nacen en la primera época`); return null })

// los del plano, y los de los canteros (marcados: nacen con lo edificado alrededor)
const arboles = [...JSON.parse(await leer(entrada)),
  ...(jardines ? JSON.parse(await leer(jardines)).map((a) => ({ ...a, jardin: true })) : [])]
const { metro } = JSON.parse(await leer(mosaico))
const crece = await siHay(Promise.all([
  leer('public/datos/crece.json').then((b) => JSON.parse(b)),
  sharp(path.resolve(RAIZ, 'public/plano/crece.png')).raw().toBuffer({ resolveWithObject: true }),
]), 'crece')
const ciudad = await siHay(leer('public/datos/ciudad.pak').then((b) => {
  const crudo = gunzipSync(b)
  return decodificarPak(crudo.buffer.slice(crudo.byteOffset, crudo.byteOffset + crudo.byteLength),
    { vertices: Float32Array, techos: Uint32Array, vida: Uint32Array })
}), 'ciudad.pak')

const grilla = crece && {
  datos: crece[1].data, cols: crece[1].info.width, rows: crece[1].info.height, canales: crece[1].info.channels,
  celdaPx: (crece[0].celda_m ?? 8) / metro, etapas: ETAPAS,
}
const desde = grilla ? (x, y) => desdeEnCrece(grilla, x, y) : () => Infinity
const desdeJardin = grilla ? (x, y) => desdeDelEntorno(grilla, x, y, ENTORNO_JARDIN) : () => Infinity
const casas = ciudad ? casasQueMueren(ciudad) : []
const conNace = arboles.map((a) => ({ ...a, nace: naceArbol(a, { desde: a.jardin ? desdeJardin : desde, casas }) }))

const salida = path.resolve(RAIZ, 'public/datos/arboles.bin')
await writeFile(salida, codificarArboles(conNace, metro))
const porEpoca = Array.from({ length: ETAPAS }, (_, e) => conNace.filter((a) => a.nace === e).length)
console.log(`${conNace.length} árboles (nacen por época: ${porEpoca.join(' · ')}; ${casas.length} casas que mueren) → ${salida}`)
