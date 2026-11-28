#!/usr/bin/env node
// Uso: node tools/fotos.mjs [--descargar] [--solo-informe]
// Las fotos de las fichas (T43): lee fuentes/imagenes/*/ficha.json, se queda con las que la ficha permite
// publicar (dominio público o licencia libre, con fuente, autor y fecha: tools/fotos-lib.mjs) y que nombran
// alguna marca, y escribe public/fotos/<id>.webp (1600 px), public/fotos/m/<id>.webp (640 px) y
// public/datos/fotos.json. Lo que no es publicable no se copia nunca, y lo que dejó de serlo se borra.
//   --descargar     baja de Wikimedia Commons, con curl, los originales publicables que falten (url_descarga)
//   --solo-informe  no escribe nada: solo dice qué entraría y qué no, y por qué
// Los originales son datos no confiables: solo se decodifican como imagen (sharp).
import { execFile } from 'node:child_process'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import path from 'node:path'
import sharp from 'sharp'
import { armarManifiesto, publicablesSinOriginal, descargable, elegibilidad, entradaDeFoto, informe, LADO_GRANDE, LADO_MINIATURA } from './fotos-lib.mjs'
import { MARCAS } from '../src/marcas-datos.js'

const RAIZ = path.resolve(import.meta.dirname, '..')
const IMAGENES = path.join(RAIZ, 'fuentes/imagenes')
const FOTOS = path.join(RAIZ, 'public/fotos')
const MANIFIESTO = path.join(RAIZ, 'public/datos/fotos.json')
const correr = promisify(execFile)
// genérico y sin datos personales (CLAUDE.md)
const AGENTE = 'caracas-historica/0.1 (sitio estatico; descarga de originales de Wikimedia Commons)'
const MAX_DESCARGA = 120 * 1024 * 1024
const PAUSA_MS = 20_000
const FORMATOS = ['jpeg', 'png', 'gif', 'tiff', 'webp']
const ESPERA_429_MS = 130_000
const INTENTOS_429 = 6
const CALIDAD = { grande: 82, miniatura: 76 }
const DESCARGAR = process.argv.includes('--descargar')
const SOLO_INFORME = process.argv.includes('--solo-informe')

const original = (archivos) => archivos.find((n) => /^original\.[a-z0-9]+$/i.test(n)) ?? null

async function leerFichas() {
  const carpetas = (await readdir(IMAGENES, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  const lista = []
  for (const id of carpetas) {
    const archivos = await readdir(path.join(IMAGENES, id))
    if (!archivos.includes('ficha.json')) continue
    const ficha = JSON.parse(await readFile(path.join(IMAGENES, id, 'ficha.json'), 'utf8'))
    lista.push({ id, ficha, original: original(archivos) })
  }
  return lista
}

/** Baja el original de una ficha publicable (solo de Wikimedia, con tope de tamaño) y devuelve su nombre. */
async function descargar(id, ficha) {
  if (!descargable(ficha.url_descarga)) throw new Error(`fotos: ${id} no tiene una url_descarga de Wikimedia`)
  // con curl (sin shell): solo https, sin redirecciones y con tope de tamaño; falla con el código del servidor
  const temporal = path.join(IMAGENES, id, 'descarga.parcial')
  const curl = () => correr('curl', ['--silent', '--show-error', '--fail', '--proto', '=https', '--max-redirs', '0',
    '--globoff', '--max-time', '300', '--max-filesize', String(MAX_DESCARGA), '--user-agent', AGENTE, '--output', temporal, '--', ficha.url_descarga])
  try {
    for (let intento = 1; ; intento++) {
      try { await curl(); break } catch (e) {
        // 429: el servidor pide esperar; se le hace caso (unas pocas veces) en vez de insistir
        if (!String(e.stderr).includes(' 429') || intento === INTENTOS_429) throw e
        console.log(`  … ${id}: Wikimedia pide esperar; se reintenta en ${ESPERA_429_MS / 1000} s`)
        await new Promise((ok) => setTimeout(ok, ESPERA_429_MS))
      }
    }
    const bytes = await readFile(temporal)
    const { format } = await sharp(bytes).metadata() // si no es una imagen, falla acá y no se guarda
    if (!FORMATOS.includes(format)) throw new Error(`formato no admitido (${format})`)
    const nombre = `original.${format === 'jpeg' ? 'jpg' : format}`
    await writeFile(path.join(IMAGENES, id, nombre), bytes)
    console.log(`  ↓ ${id}/${nombre} (${(bytes.length / 1e6).toFixed(1)} MB)`)
    await new Promise((ok) => setTimeout(ok, PAUSA_MS)) // de a una y sin apuro: es un servidor ajeno
    return nombre
  } catch (e) {
    throw new Error(`fotos: no se pudo bajar el original de ${id}: ${String(e.stderr ?? e.message).trim()}`)
  } finally {
    await rm(temporal, { force: true })
  }
}

async function derivados(id, archivo) {
  const entrada = path.join(IMAGENES, id, archivo)
  const meta = await sharp(entrada).metadata()
  const { width: ancho, height: alto } = meta.autoOrient ?? meta // las medidas ya con la orientación EXIF aplicada
  const escribir = (lado, calidad, salida) => sharp(entrada).rotate()
    .resize({ width: lado, height: lado, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: calidad, effort: 5 }).toFile(salida)
  await escribir(LADO_GRANDE, CALIDAD.grande, path.join(FOTOS, `${id}.webp`))
  await escribir(LADO_MINIATURA, CALIDAD.miniatura, path.join(FOTOS, 'm', `${id}.webp`))
  return { ancho, alto }
}

let lista = await leerFichas()
if (DESCARGAR && !SOLO_INFORME) {
  for (const f of lista) {
    if (f.original || !(f.ficha.marcas ?? []).length || !elegibilidad(f.ficha).elegible) continue
    f.original = await descargar(f.id, f.ficha)
  }
}
const resultado = armarManifiesto(lista, { marcas: new Set(MARCAS.map((m) => m.id)) })
console.log(informe(resultado))
if (SOLO_INFORME) process.exit(0)
const faltan = publicablesSinOriginal(resultado)
if (faltan.length) {
  // sin este corte el paso borraba public/fotos/ y publicaba un manifiesto con menos fotos, o vacío, sin avisar
  console.error(`\nfotos: faltan los originales de ${faltan.length} fotos publicables (${faltan.join(', ')}).\n` +
    'No viajan en git: cópialos a fuentes/imagenes/<id>/original.* o bájalos con node tools/fotos.mjs --descargar. No se escribió nada.')
  process.exit(1)
}

// se parte de cero: lo que dejó de ser publicable no puede quedar servido
await rm(FOTOS, { recursive: true, force: true })
await mkdir(path.join(FOTOS, 'm'), { recursive: true })
const fotos = []
for (const { id, ficha, original: archivo } of resultado.publicables) {
  fotos.push(entradaDeFoto(id, ficha, await derivados(id, archivo)))
}
await mkdir(path.dirname(MANIFIESTO), { recursive: true })
await writeFile(MANIFIESTO, JSON.stringify({ fotos }, null, 1) + '\n')
const conFoto = new Set(fotos.flatMap((f) => f.marcas))
console.log(`\n${fotos.length} fotos → public/fotos/ y public/datos/fotos.json · ${conFoto.size} de ${MARCAS.length} marcas con foto`)
console.log(`sin foto: ${MARCAS.filter((m) => !conFoto.has(m.id)).map((m) => m.id).join(', ')}`)
