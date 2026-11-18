#!/usr/bin/env node
// Uso: npm run datos [-- --forzar | --desde <paso> | --verificar | --descargar]
// Regenera todos los datos del sitio desde los escaneos originales (como make: solo los pasos viejos),
// verifica los conteos contra tools/datos-esperados.json y escribe public/datos/manifiesto.json (sha256).
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pendientes, verificarConteos, salidasDeTeselas, firmasCambiadas } from './datos-lib.mjs'

const RAIZ = path.resolve(import.meta.dirname, '..')
const PY = process.env.PY ?? '.venv/bin/python'
const D = 'fuentes/derivados/1936'
const HOJA = (n) => `fuentes/mapas/1936-archiveorg-caracas-dcn-hoja${n}/original.tif`
const PLANO = ['primero', 'chico', 'medio-4k', 'medio'].map((n) => `public/plano/${n}.webp`)
const leerJson = async (ruta) => JSON.parse(await readFile(path.join(RAIZ, ruta), 'utf8'))
const leerJsonSiHay = (ruta) => leerJson(ruta).catch(() => null)
const GEO = (...nombres) => nombres.map((n) => `tools/geo/${n}.py`)
const OSM_HOY = 'fuentes/derivados/hoy/osm.json'
const DESCARGAR = process.argv.includes('--descargar') // vuelve a bajar OSM aunque haya caché

const PASOS = [
  ...[1, 2].map((n) => ({
    id: `cuadricula-${n}`, entradas: [HOJA(n), 'tools/geo/gcp/semillas-1936.json'],
    salidas: [`tools/geo/gcp/1936-hoja${n}.json`, `tools/geo/gcp/1936-hoja${n}-lineas.json`],
    codigo: GEO('cuadricula', 'tps'),
    cmd: () => [PY, 'tools/geo/cuadricula.py', '--semillas', 'tools/geo/gcp/semillas-1936.json', '--hoja', `1936-hoja${n}`],
  })),
  {
    id: 'mosaico',
    entradas: ['tools/geo/mosaico-1936.json', ...[1, 2].flatMap((n) => [`tools/geo/gcp/1936-hoja${n}.json`, `tools/geo/gcp/1936-hoja${n}-lineas.json`])],
    codigo: GEO('mosaico', 'lineas', 'tps'),
    salidas: [`${D}/mosaico.tif`, `${D}/mosaico.json`],
    cmd: () => [PY, 'tools/geo/mosaico.py', '--config', 'tools/geo/mosaico-1936.json'],
  },
  {
    id: 'segmentar', entradas: [`${D}/mosaico.tif`, 'tools/geo/paleta-1936.json'],
    codigo: GEO('segmentar', 'segmentar_arboles', 'segmentar_clases', 'segmentar_color', 'segmentar_marco',
      'segmentar_morfologia', 'segmentar_parametros', 'segmentar_salidas', 'segmentar_texturas', 'segmentar_topologia'),
    salidas: [`${D}/segmentacion/mosaico/clases.png`],
    cmd: () => [PY, 'tools/geo/segmentar.py', `${D}/mosaico.tif`, `${D}/segmentacion/mosaico`, '--escala', '0.5'],
  },
  {
    id: 'costura', codigo: GEO('costura'), entradas: [`${D}/mosaico.tif`, `${D}/mosaico.json`, `${D}/segmentacion/mosaico/clases.png`],
    salidas: [`${D}/mosaico-costura.tif`, `${D}/segmentacion/mosaico/clases-costura.png`],
    cmd: () => [PY, 'tools/geo/costura.py', '--mosaico', `${D}/mosaico.tif`, '--meta', `${D}/mosaico.json`,
      '--clases', `${D}/segmentacion/mosaico/clases.png`],
  },
  {
    id: 'vectorizar', entradas: [`${D}/segmentacion/mosaico/clases-costura.png`, `${D}/mosaico.json`],
    salidas: [`${D}/ciudad-1936.json`],
    codigo: GEO('vectorizar'),
    cmd: async () => {
      const { plaza, metro } = await leerJson(`${D}/mosaico.json`)
      return [PY, 'tools/geo/vectorizar.py', `${D}/segmentacion/mosaico/clases-costura.png`, `${D}/ciudad-1936.json`,
        '--escala', String(metro), '--plaza', plaza.join(',')]
    },
  },
  {
    id: 'empacar', entradas: [`${D}/ciudad-1936.json`], salidas: ['public/datos/ciudad.pak'],
    codigo: ['tools/empacar-ciudad.mjs', 'tools/empacar-lib.mjs', 'tools/pak.mjs', 'src/ciudad.js'],
    cmd: () => ['node', 'tools/empacar-ciudad.mjs', `${D}/ciudad-1936.json`],
  },
  {
    id: 'suelo', entradas: [`${D}/segmentacion/mosaico/clases-costura.png`],
    salidas: ['public/plano/suelo.webp', 'public/plano/suelo-2k.webp'],
    codigo: ['tools/suelo.mjs', 'tools/suelo-lib.mjs'],
    cmd: () => ['node', 'tools/suelo.mjs', `${D}/segmentacion/mosaico/clases-costura.png`],
  },
  {
    id: 'plano', entradas: [`${D}/mosaico-costura.tif`, `${D}/mosaico.json`],
    // + las teselas de public/plano/f/ según laminas.json (se suman al arrancar, ver pasosCompletos)
    salidas: ['public/plano/laminas.json', 'public/datos/ciudad.json', ...PLANO],
    codigo: ['tools/plano.mjs', 'tools/plano-lib.mjs'],
    cmd: () => ['node', 'tools/plano.mjs', `${D}/mosaico-costura.tif`, `${D}/mosaico.json`],
  },
  {
    // la única descarga del pipeline: solo si falta la caché (o con --descargar); sin código propio,
    // así un cambio en hoy.py no vuelve a pedirle a Overpass
    id: 'hoy-osm', entradas: [], salidas: [OSM_HOY], codigo: [],
    cmd: () => [PY, 'tools/geo/hoy.py', '--solo-descargar', '--osm', OSM_HOY, ...(DESCARGAR ? ['--descargar'] : [])],
  },
  {
    id: 'hoy', entradas: [OSM_HOY, `${D}/mosaico.json`, 'tools/geo/gcp/1936-wgs84.json'],
    salidas: ['public/plano/hoy-lejos.webp', 'public/plano/hoy-cerca.webp', 'public/datos/calles.json', 'public/datos/calles.bin'],
    codigo: GEO('hoy', 'hoy_osm', 'geo1936'),
    cmd: () => [PY, 'tools/geo/hoy.py', '--osm', OSM_HOY],
  },
]

function argumentos(argv) {
  const a = { forzar: argv.includes('--forzar'), verificar: argv.includes('--verificar'), marcar: argv.includes('--marcar'), desde: null }
  const i = argv.indexOf('--desde')
  if (i !== -1) a.desde = argv[i + 1] ?? null
  return a
}

/** Los pasos con las teselas que corresponden como salidas del plano. */
async function pasosCompletos() {
  const teselas = salidasDeTeselas(await leerJsonSiHay('public/plano/laminas.json'))
  return PASOS.map((p) => (p.id === 'plano' ? { ...p, salidas: [...p.salidas, ...teselas] } : p))
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
  const rutas = [...new Set(pasos.flatMap((p) => [...p.entradas, ...p.salidas]))]
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
  const medidos = { techos: ciudad.techos.length, manzanas: ciudad.manzanas }
  const { _nota, ...esperados } = await leerJson('tools/datos-esperados.json')
  const errores = verificarConteos(medidos, esperados)
  const publicos = pasos.flatMap((p) => p.salidas).filter((s) => s.startsWith('public/'))
  const archivos = {}
  for (const s of publicos) archivos[s] = await sha256(s)
  await writeFile(path.join(RAIZ, 'public/datos/manifiesto.json'), JSON.stringify({ conteos: medidos, archivos }, null, 2) + '\n')
  console.log(`conteos: ${JSON.stringify(medidos)} · manifiesto: public/datos/manifiesto.json`)
  return errores
}

const opciones = argumentos(process.argv.slice(2))
let pasos = await pasosCompletos()
const firmas = await firmasActuales(pasos)
if (opciones.marcar) {
  // los datos actuales se dan por generados con el código actual (p. ej. al adoptar este comando)
  await guardarFirmas(firmas)
  console.log('firmas del código guardadas: los pasos quedan al día')
} else if (!opciones.verificar) {
  const guardadas = (await leerJsonSiHay(FIRMAS)) ?? {}
  const codigoCambiado = new Set([...firmasCambiadas(firmas, guardadas), ...(DESCARGAR ? ['hoy-osm'] : [])])
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
pasos = await pasosCompletos() // el plano pudo cambiar la grilla de teselas
const errores = await verificar(pasos)
if (errores.length) {
  console.error(`\nconteos fuera de lo esperado:\n  ${errores.join('\n  ')}`)
  process.exit(1)
}
