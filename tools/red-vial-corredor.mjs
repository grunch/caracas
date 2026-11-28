#!/usr/bin/env node
// Mide las vías posteriores a 1946 del catálogo contra las manzanas de cada época del sitio (#277, #278).
// Offline y de solo lectura sobre los datos generados; escribe un informe chico, que sí va a git.
//   node tools/red-vial-corredor.mjs <carpeta public con los datos completos> [informe.json]
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { decodificarCalles } from '../src/calles.js'
import { ANIOS_RED } from './red-vial-lib.mjs'
import { ANCHO_SOSPECHOSO_M, CORREDOR_MINIMO, MAX_M, PASO_M, medirVia, tramosDeVia } from './red-vial-corredor-lib.mjs'

const raiz = fileURLToPath(new URL('../', import.meta.url))
const CATALOGO = 'tools/geo/referencias/vialidad-posterior-1946.json'
const INFORME = 'docs/mediciones/vialidad/secciones-modernas.json'
const CAMPOS = ['suelo-manzanas', 'suelo-manzanas-modernas']
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

async function leerCampo(publico, nombre, entradas) {
  const rutaMeta = `datos/${nombre}.json`, rutaImagen = `plano/${nombre}.png`
  const bytesMeta = await readFile(resolve(publico, rutaMeta)), bytesImagen = await readFile(resolve(publico, rutaImagen))
  entradas[`public/${rutaMeta}`] = sha256(bytesMeta)
  entradas[`public/${rutaImagen}`] = sha256(bytesImagen)
  const { data, info } = await sharp(bytesImagen).raw().toBuffer({ resolveWithObject: true })
  return { meta: JSON.parse(bytesMeta.toString('utf8')), ancho: info.width, alto: info.height, canales: info.channels, datos: data }
}

async function leerCalles(publico, entradas) {
  const bin = await readFile(resolve(publico, 'datos/calles.bin')), json = await readFile(resolve(publico, 'datos/calles.json'))
  entradas['public/datos/calles.bin'] = sha256(bin)
  entradas['public/datos/calles.json'] = sha256(json)
  return decodificarCalles(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), JSON.parse(json.toString('utf8')))
}

/** Una vía del catálogo contra los seis cortes; los sospechosos solo cuentan antes de su apertura. */
function medirEnLasEpocas(via, tramosDeHoy, campos) {
  const tramos = tramosDeVia(tramosDeHoy, via.nombres_osm)
  const epocas = {}, sospechosos = []
  for (const anio of ANIOS_RED) {
    const campo = campos.find((c) => c.meta.canales.includes(anio))
    const m = medirVia(tramos, campo, anio)
    const { sospechosos: lista, ...resumen } = m
    epocas[anio] = resumen
    if (anio < via.desde) sospechosos.push(...lista.map((s) => ({ año: anio, ...s })))
  }
  return { id: via.id, desde: via.desde, nombres_osm: via.nombres_osm, tramos_de_hoy: tramos.length, largo_m: tramos.reduce((s, t) => s + t.largo, 0), epocas, sospechosos }
}

export async function medir(publico) {
  const entradas = {}
  const catalogo = JSON.parse(await readFile(resolve(raiz, CATALOGO), 'utf8'))
  const tramosDeHoy = await leerCalles(publico, entradas)
  const campos = []
  for (const nombre of CAMPOS) campos.push(await leerCampo(publico, nombre, entradas))
  const vias = catalogo.tramos.filter((t) => Array.isArray(t.nombres_osm) && t.nombres_osm.length > 0)
  return {
    alcance: 'Las vías posteriores a 1946 del catálogo, medidas sobre el eje de la capa Hoy contra las manzanas de cada época del sitio. Los sospechosos son tramos a revisar contra el plano de la época, no errores confirmados.',
    catalogo: CATALOGO, entradas,
    parametros: { paso_m: PASO_M, max_m: MAX_M, ancho_sospechoso_m: ANCHO_SOSPECHOSO_M, corredor_minimo: CORREDOR_MINIMO, resolucion_del_campo_m: campos[0].meta.m_por_px },
    vias: vias.map((v) => medirEnLasEpocas(v, tramosDeHoy, campos)),
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [publico, salida = resolve(raiz, INFORME)] = process.argv.slice(2)
  if (!publico) { console.error('uso: node tools/red-vial-corredor.mjs <carpeta public> [informe.json]'); process.exit(1) }
  const informe = await medir(resolve(publico))
  await mkdir(dirname(resolve(salida)), { recursive: true })
  await writeFile(resolve(salida), JSON.stringify(informe, null, 1) + '\n')
  console.table(informe.vias.flatMap((v) => [1936, 1946].map((a) => ({ vía: v.id, año: a, ...v.epocas[a], sospechosos: v.sospechosos.filter((s) => s.año === a).length }))))
}
