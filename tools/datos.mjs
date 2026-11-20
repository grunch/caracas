#!/usr/bin/env node
// Uso: npm run datos [-- --forzar | --desde <paso> | --verificar | --descargar]
// Regenera todos los datos del sitio desde los escaneos originales (como make: solo los pasos viejos),
// verifica los conteos contra tools/datos-esperados.json y escribe public/datos/manifiesto.json (sha256).
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { createReadStream, existsSync } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pendientes, verificarConteos, conteosDelManifiesto, publicosDelManifiesto, salidasDeTeselas, firmasCambiadas, resolverOriginales, fichasDeEpocas } from './datos-lib.mjs'
import { decodificarPak } from '../src/pak.js'
import { salidasPlanosEpocas } from './planos-epocas-lib.mjs'
import { salidasDeFotos, fotosSinOrigen } from './fotos-lib.mjs'
import { leerCalzados } from './planos-epocas.mjs'
import { fichasDeCreditos, creditosSinOrigen, paquetesDeCreditos } from './creditos-lib.mjs'
import { PRIMERA_EPOCA } from '../src/epocas.js'
import { PASOS, CALCES, D, DESCARGAR, leerJson, leerJsonSiHay } from './datos-pasos.mjs'

const RAIZ = path.resolve(import.meta.dirname, '..')

function argumentos(argv) {
  const a = { forzar: argv.includes('--forzar'), verificar: argv.includes('--verificar'), marcar: argv.includes('--marcar'), desde: null }
  const i = argv.indexOf('--desde')
  if (i !== -1) a.desde = argv[i + 1] ?? null
  return a
}

/** Los archivos de cada carpeta de fuentes/mapas/ que usan los calces (para resolver original:<carpeta>). */
async function archivosDeCalces() {
  const archivos = {}
  for (const [, carpeta] of CALCES) archivos[carpeta] = await readdir(path.join(RAIZ, 'fuentes/mapas', carpeta)).catch(() => [])
  return archivos
}

/** Las fichas y los originales de fuentes/imagenes/ (entradas del paso `fotos`). */
async function archivosDeImagenes() {
  const base = 'fuentes/imagenes'
  const carpetas = (await readdir(path.join(RAIZ, base), { withFileTypes: true }).catch(() => [])).filter((d) => d.isDirectory())
  const rutas = []
  for (const { name } of carpetas) {
    const archivos = await readdir(path.join(RAIZ, base, name))
    rutas.push(...archivos.filter((n) => n === 'ficha.json' || /^original\.[a-z0-9]+$/i.test(n)).map((n) => `${base}/${name}/${n}`))
  }
  return rutas.sort()
}

/**
 * Lo que lee el paso `creditos` además de sus entradas fijas: las fichas de los planos usados, todas las de
 * fuentes/datos/ y el package.json instalado de cada dependencia (su versión y su licencia).
 */
async function entradasDelAcerca() {
  const { epocas = [] } = (await leerJsonSiHay('tools/geo/epocas/epocas.json')) ?? {}
  const base = ((await leerJsonSiHay('tools/geo/mosaico-1936.json'))?.hojas ?? []).map((h) => h.fuente)
  const datos = (await readdir(path.join(RAIZ, 'fuentes/datos'), { withFileTypes: true }).catch(() => []))
    .filter((d) => d.isDirectory()).map((d) => `fuentes/datos/${d.name}/ficha.json`).sort()
  return [...fichasDeCreditos({ epocas, desde: PRIMERA_EPOCA, base }), ...datos, ...paquetesDeCreditos(await leerJsonSiHay('package.json'))]
}

/** `regenerar`: si se va a planificar una regeneración (solo ahí se exigen los escaneos originales). */
async function pasosCompletos({ regenerar = true } = {}) {
  const teselas = salidasDeTeselas(await leerJsonSiHay('public/plano/laminas.json'))
  // epocas.py copia a crece.json (público) los créditos y la licencia de la ficha de cada plano
  const fichas = fichasDeEpocas((await leerJsonSiHay('tools/geo/epocas/epocas.json')) ?? {})
  // las texturas de cada plano de época dependen del recorte de su calce (calzado.json, si ya está)
  const planosEpocas = salidasPlanosEpocas(await leerCalzados(path.join(RAIZ, 'fuentes', 'derivados')))
  const imagenes = await archivosDeImagenes()
  const manifiestoFotos = await leerJsonSiHay('public/datos/fotos.json')
  const fotos = salidasDeFotos(manifiestoFotos)
  // una foto publicada cuya ficha u original se borró: el paso se rehace aunque las fechas digan que está al día
  const rehacerFotos = fotosSinOrigen(manifiestoFotos, imagenes).length > 0
  const entradasCreditos = await entradasDelAcerca()
  // una fuente acreditada cuya ficha se quitó: el paso se rehace aunque las fechas digan que está al día
  const rehacerCreditos = creditosSinOrigen(await leerJsonSiHay('public/datos/creditos.json'), entradasCreditos).length > 0
  const pasos = PASOS.map((p) => {
    if (p.id === 'fotos') return { ...p, entradas: imagenes, salidas: [...p.salidas, ...fotos], rehacer: rehacerFotos }
    if (p.id === 'plano') return { ...p, salidas: [...p.salidas, ...teselas] }
    if (p.id === 'epocas') return { ...p, entradas: [...new Set([...p.entradas, ...fichas])] }
    if (p.id === 'planos-epocas') return { ...p, salidas: planosEpocas }
    if (p.id === 'creditos') return { ...p, entradas: [...p.entradas, ...entradasCreditos], rehacer: rehacerCreditos }
    return p
  })
  return resolverOriginales(pasos, await archivosDeCalces(), { exigir: regenerar })
}

// firmas del código de cada paso: si cambia un script, ese paso (y lo que sigue) se vuelve a correr
const FIRMAS = '.cache/datos/firmas.json'
async function firmasActuales(pasos) {
  const firmas = {}
  for (const p of pasos) {
    const h = createHash('sha256')
    for (const archivo of p.codigo ?? []) h.update(archivo).update(await readFile(path.join(RAIZ, archivo)))
    firmas[p.id] = h.digest('hex')
  }
  return firmas
}
async function guardarFirmas(firmas) {
  await mkdir(path.join(RAIZ, path.dirname(FIRMAS)), { recursive: true })
  await writeFile(path.join(RAIZ, FIRMAS), JSON.stringify(firmas, null, 2) + '\n')
}

async function tiempos(pasos) {
  const rutas = [...new Set(pasos.flatMap((p) => [...p.entradas, ...(p.opcionales ?? []), ...p.salidas]))]
  const t = {}
  for (const r of rutas) {
    try { t[r] = (await stat(path.join(RAIZ, r))).mtimeMs } catch { /* no existe */ }
  }
  return t
}

function correr([bin, ...args]) {
  return new Promise((ok, mal) => {
    const hijo = spawn(bin, args, { cwd: RAIZ, stdio: 'inherit' })
    hijo.on('error', mal)
    hijo.on('exit', (codigo) => (codigo === 0 ? ok() : mal(new Error(`${bin} ${args[0]} terminó con código ${codigo}`))))
  })
}

const sha256 = (ruta) => new Promise((ok, mal) => {
  const h = createHash('sha256')
  createReadStream(path.join(RAIZ, ruta)).on('data', (d) => h.update(d)).on('end', () => ok(h.digest('hex'))).on('error', mal)
})

async function verificar(pasos) {
  const ciudad = await leerJson(`${D}/ciudad-1936.json`)
  const arboles = await leerJson(`${D}/segmentacion/mosaico/arboles.json`)
  const medidos = { techos: ciudad.techos.length, manzanas: ciudad.manzanas, arboles: arboles.length }
  const { _nota, ...esperados } = await leerJson('tools/datos-esperados.json')
  const errores = verificarConteos(medidos, esperados)
  const crudo = gunzipSync(await readFile(path.join(RAIZ, 'public/datos/ciudad.pak')))
  const partes = decodificarPak(crudo.buffer.slice(crudo.byteOffset, crudo.byteOffset + crudo.byteLength), { techos: Uint32Array }, () => {})
  const publicados = conteosDelManifiesto(medidos, partes.techos, await readFile(path.join(RAIZ, 'public/datos/arboles.bin')))
  const publicos = publicosDelManifiesto(pasos, (r) => existsSync(path.join(RAIZ, r)))
  const archivos = {}
  for (const s of publicos) archivos[s] = await sha256(s)
  await writeFile(path.join(RAIZ, 'public/datos/manifiesto.json'), JSON.stringify({ ...publicados, archivos }, null, 2) + '\n')
  console.log(`conteos publicados: ${JSON.stringify(publicados.conteos)} · origen: ${JSON.stringify(medidos)} · manifiesto: public/datos/manifiesto.json`)
  return errores
}

const opciones = argumentos(process.argv.slice(2))
const regenerar = !opciones.verificar && !opciones.marcar
let pasos = await pasosCompletos({ regenerar })
const firmas = await firmasActuales(pasos)
if (opciones.marcar) {
  // los datos actuales se dan por generados con el código actual (p. ej. al adoptar este comando)
  await guardarFirmas(firmas)
  console.log('firmas del código guardadas: los pasos quedan al día')
} else if (!opciones.verificar) {
  const guardadas = (await leerJsonSiHay(FIRMAS)) ?? {}
  const codigoCambiado = new Set([...firmasCambiadas(firmas, guardadas), ...(DESCARGAR ? ['hoy-osm'] : []), ...pasos.filter((p) => p.rehacer).map((p) => p.id)])
  const ids = pendientes(pasos, await tiempos(pasos), { ...opciones, codigoCambiado })
  console.log(ids.length ? `pasos a correr: ${ids.join(' → ')}` : 'todo al día')
  for (const id of ids) {
    const paso = pasos.find((p) => p.id === id)
    console.log(`\n▶ ${id}`)
    const inicio = Date.now()
    await correr(await paso.cmd())
    console.log(`✓ ${id} (${((Date.now() - inicio) / 1000).toFixed(0)} s)`)
    await guardarFirmas({ ...((await leerJsonSiHay(FIRMAS)) ?? {}), [id]: firmas[id] })
  }
}
pasos = await pasosCompletos({ regenerar }) // el plano pudo cambiar la grilla de teselas
const errores = await verificar(pasos)
if (errores.length) {
  console.error(`\nconteos fuera de lo esperado:\n  ${errores.join('\n  ')}`)
  process.exit(1)
}
