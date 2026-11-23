#!/usr/bin/env node
// Uso (desde la raíz del checkout con los datos): node tools/arboles.mjs <arboles.json> <mosaico.json> [jardines.json] [clases.png] → public/datos/arboles.bin (specs/02)
// Los árboles del plano de 1936 (los símbolos que detectó la segmentación, más los de los canteros de
// plazas y patios de tools/geo/jardines.py), con la época en que aparecen: lee
// public/plano/crece.png + public/datos/crece.json (desde cuándo está edificado cada lugar) y
// public/datos/ciudad.pak (las casas que desaparecen). Sin esos datos, todos nacen en la primera época.
// Y el monte del valle antes de la ciudad (tools/silvestres-lib.mjs): árboles silvestres donde crece.png
// (B) dice que hay monte, que mueren cuando su lugar se urbaniza (G) o, con la segmentación de 1936
// (clases.png), cuando el plano de 1936 dibuja ahí un sembradío o un camino. Sin crece.png no hay monte.
// Y los árboles de los patios y solares de las casas de patio (marcos y alas de ciudad.pak), por regla.
import { readFile, writeFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import path from 'node:path'
import sharp from 'sharp'
import { decodificarPak } from '../src/pak.js'
import {
  codificarArboles, naceArbol, esDePlaza, naceEnPlaza, JARDINES_DESDE, casasQueMueren, techosQueQuedan, bajoUnTecho, desdeEnCrece, desdeDelEntorno,
  arbolesDePatio,
} from './arboles-lib.mjs'
import { arbolesSilvestres, monteEnCrece, muereSilvestre, cercaDeOtro } from './silvestres-lib.mjs'

const RAIZ = process.cwd() // se corre desde la raíz del checkout con los datos (como tools/empacar-ciudad.mjs)
const ETAPAS = 6
const ENTORNO_JARDIN = 3 // celdas de crece.png (8 m) alrededor de un árbol de jardín
const CELDA_TECHOS_PX = 100 // grilla para buscar techos bajo un árbol
// el monte: un candidato cada PASO_MONTE_M (los que quedan dependen del monte de crece.png)
const SEMILLA_MONTE = 1578
const PASO_MONTE_M = 19.5
const RADIO_MONTE_M = [1.6, 6.5] // de la mata al árbol grande
const LEJOS_DE_OTRO_M = 6 // de un árbol del plano
// lejos de la plaza se ralea (de cerca no se ve el valle entero y de lejos un árbol es menos que un píxel)
const RALO_M = [2000, 3800]
const RALO_LEJOS = 0.2
const CANAL_URBANO = 1 // crece.png G

const [entrada, mosaico, jardines, clases] = process.argv.slice(2)
if (!entrada || !mosaico) {
  console.error('uso: node tools/arboles.mjs <arboles.json> <mosaico.json> [jardines.json] [clases.png]')
  process.exit(1)
}
const leer = (ruta) => readFile(path.resolve(RAIZ, ruta))
const siHay = (promesa, que) => promesa.catch((e) => { console.warn(`arboles: sin ${que} (${e.code ?? e.message}); nacen en la primera época`); return null })

// los del plano, y los de los canteros (marcados: nacen con lo edificado alrededor)
const arboles = [...JSON.parse(await leer(entrada)),
  ...(jardines ? JSON.parse(await leer(jardines)).map((a) => ({ ...a, jardin: true })) : [])]
const { metro, ancho, alto, marco, plaza } = JSON.parse(await leer(mosaico))
const crece = await siHay(Promise.all([
  leer('public/datos/crece.json').then((b) => JSON.parse(b)),
  sharp(path.resolve(RAIZ, 'public/plano/crece.png')).raw().toBuffer({ resolveWithObject: true }),
]), 'crece')
const ciudad = await siHay(leer('public/datos/ciudad.pak').then((b) => {
  const crudo = gunzipSync(b)
  return decodificarPak(crudo.buffer.slice(crudo.byteOffset, crudo.byteOffset + crudo.byteLength),
    { vertices: Float32Array, techos: Uint32Array, vida: Uint32Array, historia: Uint8Array, marcos: Float32Array, alas: Float32Array, vuelos: Uint8Array })
}), 'ciudad.pak')

const grilla = crece && {
  datos: crece[1].data, cols: crece[1].info.width, rows: crece[1].info.height, canales: crece[1].info.channels,
  celdaPx: (crece[0].celda_m ?? 8) / metro, etapas: ETAPAS,
}
const desde = grilla ? (x, y) => desdeEnCrece(grilla, x, y) : () => Infinity
const desdeJardin = grilla ? (x, y) => desdeDelEntorno(grilla, x, y, ENTORNO_JARDIN) : () => Infinity
const casas = ciudad ? casasQueMueren(ciudad) : []
// el centro de la copa bajo un techo que queda en pie: el árbol estaría siempre adentro de una casa
const bajoTecho = ciudad ? bajoUnTecho(techosQueQuedan(ciudad), CELDA_TECHOS_PX) : () => false
const libres = arboles.filter((a) => !bajoTecho(a.x, a.y))
// la segmentación de 1936: qué es plaza o calle (sus árboles no son coloniales) y dónde no va el monte
const segmentacion = clases && grilla
  ? await siHay(sharp(path.resolve(RAIZ, clases), { limitInputPixels: false }).extractChannel(0).raw().toBuffer({ resolveWithObject: true }), 'clases')
  : null
const claseEn = segmentacion
  ? (x, y) => segmentacion.data[Math.min(segmentacion.info.height - 1, Math.floor(y)) * segmentacion.info.width + Math.min(segmentacion.info.width - 1, Math.floor(x))]
  : () => undefined
const MIRAR = { pasoPx: 2 / metro, maxPx: 45 / metro }
// solo en lo que ya era ciudad antes de 1889 (crece.png G): los árboles de los caminos del campo no cambian
const enLaCiudadVieja = (a, nace) => nace < JARDINES_DESDE && segmentacion !== null && desdeEnCrece(grilla, a.x, a.y, CANAL_URBANO) < JARDINES_DESDE
const conNace = libres.map((a) => {
  const nace = naceArbol(a, { desde: a.jardin ? desdeJardin : desde, casas })
  return { ...a, nace: naceEnPlaza(nace, enLaCiudadVieja(a, nace) && esDePlaza(claseEn, a.x, a.y, MIRAR)) }
})

// el monte: solo si crece.png trae lo urbanizado y el monte (G y B)
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const monte = grilla && grilla.canales >= 3 ? arbolesSilvestres({
  ancho, alto, marco, pasoPx: PASO_MONTE_M / metro, semilla: SEMILLA_MONTE, radioPx: RADIO_MONTE_M.map((r) => r / metro),
  monte: (x, y) => monteEnCrece(grilla, x, y),
  muere: (x, y) => muereSilvestre({ urbano: desdeEnCrece(grilla, x, y, CANAL_URBANO), clase: claseEn(x, y) }),
  ralo: (x, y) => 1 - (1 - RALO_LEJOS) * suave(...RALO_M, Math.hypot(x - plaza[0], y - plaza[1]) * metro),
  ocupado: cercaDeOtro(conNace, LEJOS_DE_OTRO_M / metro),
}) : []

// los de los patios y solares de las casas de patio (por regla: el plano no los dibuja); van dentro de la
// huella de su casa, así que no pasan por el descarte de "bajo un techo"
const dePatio = ciudad ? arbolesDePatio(ciudad, metro) : []

const todos = [...conNace, ...dePatio, ...monte]
const salida = path.resolve(RAIZ, 'public/datos/arboles.bin')
await writeFile(salida, codificarArboles(todos, metro))
const porEpoca = (lista, campo) => Array.from({ length: ETAPAS }, (_, e) => lista.filter((a) => a[campo] === e).length).join(' · ')
console.log(`${conNace.length} árboles del plano (${arboles.length - libres.length} descartados bajo un techo; nacen por época: ${porEpoca(conNace, 'nace')}; ${casas.length} casas que mueren)`)
console.log(`${dePatio.length} árboles de patio y de solar (nacen por época: ${porEpoca(dePatio, 'nace')})`)
console.log(`${monte.length} árboles silvestres (mueren por época, el primero = nunca: ${porEpoca(monte, 'muere')})`)
console.log(`${todos.length} en total → ${salida}`)
