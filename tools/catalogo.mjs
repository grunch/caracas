#!/usr/bin/env node
// Lee fuentes/mapas/*/ficha.json → fuentes/catalogo.json, fuentes/CATALOGO.md,
// fuentes/por-periodo/<periodo>/<carpeta> (enlaces) y una vista.jpg de 2048 px por mapa.
// Las carpetas vienen de descargas: se tratan como datos no confiables.
import { readdir, readFile, writeFile, rm, mkdir, symlink, lstat, rename } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { armarCatalogo, markdown, esCarpetaValida, esOriginalValido, FORMATOS_ORIGINAL } from './catalogo-lib.mjs'

const run = promisify(execFile)
const RAIZ = path.resolve(import.meta.dirname, '..', 'fuentes')
const MAPAS = path.join(RAIZ, 'mapas')
const LADO_VISTA = 2048

const tipoDe = (p) => lstat(p).then((s) => (s.isFile() ? 'archivo' : s.isSymbolicLink() ? 'enlace' : 'otro'), () => null)

async function leerFichas() {
  const entradas = []
  for (const d of await readdir(MAPAS, { withFileTypes: true })) {
    if (!d.isDirectory()) continue
    if (!esCarpetaValida(d.name)) { console.warn(`aviso: carpeta con nombre no válido, se ignora: ${JSON.stringify(d.name)}`); continue }
    const archivo = path.join(MAPAS, d.name, 'ficha.json')
    if ((await tipoDe(archivo)) !== 'archivo') { console.warn(`aviso: ${d.name} sin ficha.json (archivo regular)`); continue }
    try {
      entradas.push({ carpeta: d.name, ficha: JSON.parse(await readFile(archivo, 'utf8')) })
    } catch {
      console.warn(`aviso: ${d.name}/ficha.json no es JSON válido`)
    }
  }
  return entradas
}

async function hacerVista(carpeta) {
  const dir = path.join(MAPAS, carpeta)
  const vista = path.join(dir, 'vista.jpg')
  const tipo = await tipoDe(vista)
  if (tipo === 'archivo') return true
  if (tipo) await rm(vista) // un enlace u otra cosa con ese nombre: no escribir a través de él
  const originales = (await readdir(dir)).filter(esOriginalValido).sort()
  if (!originales.length) return false
  const original = originales[0]
  if ((await tipoDe(path.join(dir, original))) !== 'archivo') return false
  const coder = FORMATOS_ORIGINAL[path.extname(original).slice(1).toLowerCase()]
  const temporal = path.join(dir, 'vista.tmp.jpg')
  try {
    await run('convert', ['-limit', 'memory', '2GiB', '-limit', 'map', '4GiB',
      `${coder}:${path.join(dir, original)}[0]`, '-auto-orient', '-strip', '-colorspace', 'sRGB',
      '-resize', `${LADO_VISTA}x${LADO_VISTA}>`, '-quality', '85', `JPEG:${temporal}`],
      { timeout: 10 * 60_000 })
    await rename(temporal, vista)
    return true
  } catch (e) {
    // ImageMagick del sistema limita el área (policy.xml): para escaneos enormes, sharp/libvips
    if (await vistaConSharp(path.join(dir, original), temporal)) { await rename(temporal, vista); return true }
    await rm(temporal, { force: true })
    console.warn(`aviso: no se pudo hacer la vista de ${carpeta}: ${String(e.message).split('\n')[0]}`)
    return false
  }
}

async function vistaConSharp(entrada, salida) {
  try {
    const { default: sharp } = await import('sharp')
    await sharp(entrada, { limitInputPixels: false, sequentialRead: true })
      .rotate().resize(LADO_VISTA, LADO_VISTA, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 }).toFile(salida) // sharp no copia EXIF salvo que se pida
    return true
  } catch {
    return false
  }
}

async function porPeriodo(catalogo) {
  const base = path.join(RAIZ, 'por-periodo')
  await rm(base, { recursive: true, force: true })
  for (const m of catalogo) {
    const dir = path.join(base, m.periodo)
    await mkdir(dir, { recursive: true })
    await symlink(path.join('..', '..', 'mapas', m.carpeta), path.join(dir, m.carpeta))
  }
}

const catalogo = []
for (const m of armarCatalogo(await leerFichas())) {
  catalogo.push({ ...m, vista: (await hacerVista(m.carpeta)) ? `mapas/${m.carpeta}/vista.jpg` : null })
}
await writeFile(path.join(RAIZ, 'catalogo.json'), JSON.stringify(catalogo, null, 2) + '\n')
await writeFile(path.join(RAIZ, 'CATALOGO.md'), markdown(catalogo) + '\n')
await porPeriodo(catalogo)
console.log(`catálogo: ${catalogo.length} mapas, ${catalogo.filter((m) => m.candidato_base).length} candidatos a base`)
