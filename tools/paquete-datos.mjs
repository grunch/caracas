#!/usr/bin/env node
// Los datos generados del sitio (public/datos, public/plano, public/fotos) no van a git: viajan como
// un paquete (datos.tar.gz) en un release de GitHub con etiqueta datos-AAAA-MM-DD-<commit>.
//
//   npm run datos:bajar      baja el paquete más nuevo y lo pone en public/ (un clon nuevo, el build de Pages)
//   npm run datos:publicar   empaqueta lo de public/datos/manifiesto.json y lo sube como release nuevo (gh)
//
// El paquete bajado es un dato no confiable: se revisa el listado (solo archivos regulares dentro de
// public/datos|plano|fotos), se extrae aparte y solo se copia si cada archivo tiene el sha256 del manifiesto.
// Requiere GNU tar (Linux, el runner de GitHub); con otro tar el listado no se reconoce y no se extrae nada.
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import {
  ACTIVO, MANIFIESTO, archivosDelPaquete, elegirRelease, etiquetaDeDatos, revisarListado, sumasQueNoCoinciden,
} from './paquete-datos-lib.mjs'

const RAIZ = path.resolve(import.meta.dirname, '..')
const CACHE = path.join(RAIZ, '.cache/paquete-datos')
const REPO = process.env.DATOS_REPO ?? process.env.GITHUB_REPOSITORY ?? 'grunch/caracas'
const AGENTE = 'caracas-datos'

/** Corre un comando y devuelve su salida estándar; falla con su salida de error. */
function correr(cmd, args, opciones = {}) {
  return new Promise((resolver, rechazar) => {
    const p = spawn(cmd, args, { cwd: RAIZ, ...opciones })
    let salida = ''
    let error = ''
    p.stdout?.on('data', (d) => { salida += d })
    p.stderr?.on('data', (d) => { error += d })
    p.on('error', rechazar)
    p.on('close', (codigo) => (codigo === 0 ? resolver(salida) : rechazar(new Error(`${cmd} ${args.join(' ')}: ${error.trim() || codigo}`))))
  })
}

function sha256(ruta) {
  return new Promise((resolver, rechazar) => {
    const h = createHash('sha256')
    createReadStream(ruta).on('error', rechazar).on('data', (d) => h.update(d)).on('end', () => resolver(h.digest('hex')))
  })
}

async function sumas(base, rutas) {
  const medidas = {}
  for (const r of rutas) medidas[r] = await sha256(path.join(base, r)).catch(() => null)
  return medidas
}

async function exigirSumas(base, manifiesto, que) {
  const malas = sumasQueNoCoinciden(manifiesto, await sumas(base, Object.keys(manifiesto.archivos)))
  if (malas.length) throw new Error(`${que}: ${malas.length} archivos faltan o no coinciden con el manifiesto (${malas.slice(0, 5).join(', ')}…)`)
}

async function api(ruta) {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
  const r = await fetch(`https://api.github.com/repos/${REPO}/${ruta}`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': AGENTE, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!r.ok) throw new Error(`GitHub ${ruta}: ${r.status} ${r.statusText}`)
  return r.json()
}

async function bajar() {
  const elegido = elegirRelease(await api('releases?per_page=50'))
  if (!elegido) throw new Error(`${REPO} no tiene ningún release datos-* con ${ACTIVO}: publícalo con npm run datos:publicar`)
  await rm(CACHE, { recursive: true, force: true })
  const extraido = path.join(CACHE, 'extraido')
  await mkdir(extraido, { recursive: true })
  const paquete = path.join(CACHE, ACTIVO)
  console.log(`bajando ${elegido.etiqueta}…`)
  const r = await fetch(elegido.url, { headers: { 'User-Agent': AGENTE } })
  if (!r.ok || !r.body) throw new Error(`${elegido.url}: ${r.status}`)
  await pipeline(Readable.fromWeb(r.body), createWriteStream(paquete))

  const problemas = revisarListado(await correr('tar', ['-tvzf', paquete]))
  if (problemas.length) throw new Error(`el paquete trae lo que no debe:\n  ${problemas.slice(0, 10).join('\n  ')}`)
  await correr('tar', ['-xzf', paquete, '-C', extraido, '--no-same-owner', '--no-same-permissions'])
  const manifiesto = JSON.parse(await readFile(path.join(extraido, MANIFIESTO), 'utf8'))
  const archivos = archivosDelPaquete(manifiesto)
  await exigirSumas(extraido, manifiesto, elegido.etiqueta)

  for (const a of archivos) {
    await mkdir(path.dirname(path.join(RAIZ, a)), { recursive: true })
    await copyFile(path.join(extraido, a), path.join(RAIZ, a))
  }
  await rm(CACHE, { recursive: true, force: true })
  console.log(`${elegido.etiqueta}: ${archivos.length} archivos en public/ · conteos ${JSON.stringify(manifiesto.conteos)}`)
}

async function publicar() {
  const manifiesto = JSON.parse(await readFile(path.join(RAIZ, MANIFIESTO), 'utf8'))
  const archivos = archivosDelPaquete(manifiesto)
  await exigirSumas(RAIZ, manifiesto, 'public/ no está al día (corre npm run datos)')
  const commit = (await correr('git', ['rev-parse', 'HEAD'])).trim()
  const etiqueta = etiquetaDeDatos(new Date(), commit)

  await mkdir(CACHE, { recursive: true })
  const lista = path.join(CACHE, 'archivos.txt')
  const paquete = path.join(CACHE, ACTIVO)
  await writeFile(lista, archivos.join('\n') + '\n')
  await correr('tar', ['-czf', paquete, '--owner=0', '--group=0', '--numeric-owner', '-C', RAIZ, '-T', lista])
  const notas = `Datos generados del sitio (npm run datos) desde ${commit}.\n\nConteos: ${JSON.stringify(manifiesto.conteos)}\n` +
    `Archivos: ${archivos.length} (sha256 en ${MANIFIESTO}).\n\nSe bajan con npm run datos:bajar.`
  await correr('gh', ['release', 'create', etiqueta, paquete, '--repo', REPO, '--target', commit,
    '--title', `Datos ${etiqueta.slice(6)}`, '--notes', notas, '--latest=false'])
  await rm(CACHE, { recursive: true, force: true })
  console.log(`→ release ${etiqueta} en ${REPO}`)
}

const ORDENES = { bajar, publicar }
const orden = ORDENES[process.argv[2]]
if (!orden) {
  console.error('uso: node tools/paquete-datos.mjs bajar|publicar')
  process.exit(2)
}
orden().catch((e) => {
  console.error(`error: ${e.message}`)
  process.exit(1)
})
