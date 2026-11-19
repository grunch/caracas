#!/usr/bin/env node
// Uso: node tools/creditos.mjs [--informe]
// Los créditos del panel «Acerca» (T44): junta las fichas de las fuentes que el sitio usa de verdad y escribe
// public/datos/creditos.json (tools/creditos-lib.mjs). Lee:
//   · public/datos/crece.json      qué plano da cada año de la línea de tiempo (tools/geo/epocas.py)
//   · tools/geo/mosaico-1936.json  las hojas del plano base
//   · fuentes/mapas/<plano>/ficha.json y fuentes/datos/*/ficha.json
//   · public/datos/fotos.json      las fotos que muestran las fichas (tools/fotos.mjs); si falta, ninguna
//   · package.json y node_modules/<dependencia>/package.json   las bibliotecas que viajan en el sitio
//   --informe  no escribe nada: solo lista lo que entraría
// No baja nada ni ejecuta nada de lo que lee: solo JSON.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { armarCreditos, mapasUsados } from './creditos-lib.mjs'
import { PRIMERA_EPOCA } from '../src/epocas.js'

const RAIZ = path.resolve(import.meta.dirname, '..')
const SALIDA = 'public/datos/creditos.json'
const leer = async (ruta) => JSON.parse(await readFile(path.join(RAIZ, ruta), 'utf8'))
const leerSiHay = (ruta) => leer(ruta).catch((e) => { if (e.code === 'ENOENT') return null; throw e })

const { epocas } = await leer('public/datos/crece.json')
const base = (await leer('tools/geo/mosaico-1936.json')).hojas.map((h) => h.fuente)
const uso = { epocas, desde: PRIMERA_EPOCA, base }

const fichasMapas = {}
for (const id of mapasUsados(uso).flatMap((g) => g.ids)) fichasMapas[id] = await leerSiHay(`fuentes/mapas/${id}/ficha.json`)
const fichasDatos = {}
for (const d of await readdir(path.join(RAIZ, 'fuentes/datos'), { withFileTypes: true })) {
  if (!d.isDirectory()) continue
  const ficha = await leerSiHay(`fuentes/datos/${d.name}/ficha.json`)
  if (ficha) fichasDatos[d.name] = ficha
}
const fotos = (await leerSiHay('public/datos/fotos.json'))?.fotos ?? []
const paquetes = []
for (const nombre of Object.keys((await leer('package.json')).dependencies ?? {}).sort()) {
  paquetes.push(await leer(`node_modules/${nombre}/package.json`))
}

const creditos = armarCreditos({ ...uso, fichasMapas, fichasDatos, fotos, paquetes })
for (const m of creditos.mapas) console.log(`  ${m.año} · ${m.id}${m.hojas > 1 ? ` (${m.hojas} hojas)` : ''} · ${m.licencia}`)
for (const d of creditos.datos) console.log(`  dato · ${d.id} · ${d.licencia}`)
for (const p of creditos.programas) console.log(`  programa · ${p.nombre} ${p.version} · ${p.licencia ?? 'sin licencia declarada'}`)
const pendientes = [...creditos.mapas, ...creditos.datos].filter((x) => x.porVerificar)
console.log(`${creditos.mapas.length} planos, ${creditos.datos.length} datos, ${creditos.fotos.length} fotos, ${creditos.programas.length} programas` +
  ` · con derechos por verificar: ${pendientes.map((x) => x.id).join(', ') || 'ninguno'}`)
if (!process.argv.includes('--informe')) {
  await mkdir(path.join(RAIZ, path.dirname(SALIDA)), { recursive: true })
  await writeFile(path.join(RAIZ, SALIDA), JSON.stringify(creditos, null, 1) + '\n')
  console.log(`→ ${SALIDA}`)
}
