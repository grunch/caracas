#!/usr/bin/env node
// Uso: npm run datos [-- --forzar | --desde <paso> | --verificar | --descargar]
// Regenera todos los datos del sitio desde los escaneos originales (como make: solo los pasos viejos),
// verifica los conteos contra tools/datos-esperados.json y escribe public/datos/manifiesto.json (sha256).
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pendientes, verificarConteos, salidasDeTeselas, firmasCambiadas, resolverOriginales, fichasDeEpocas } from './datos-lib.mjs'
import { salidasPlanosEpocas } from './planos-epocas-lib.mjs'
import { salidasDeFotos, fotosSinOrigen } from './fotos-lib.mjs'
import { leerCalzados } from './planos-epocas.mjs'
import { fichasDeCreditos } from './creditos-lib.mjs'
import { PRIMERA_EPOCA } from '../src/epocas.js'

const RAIZ = path.resolve(import.meta.dirname, '..')
const PY = process.env.PY ?? '.venv/bin/python'
const D = 'fuentes/derivados/1936'
const E = 'fuentes/derivados/epocas'
// planos de la línea de tiempo que se calzan sobre 1936: [año, carpeta en fuentes/mapas/]
const CALCES = [
  [1911, '1911-princeton-plano-de-caracas-razetti'],
  [1889, '1889-bnf-mestre'],
  [1843, '1843-nypl-jesurun-facsimil-muller-stapler'],
  [1772, '1772-pares-agi-exato-mapa'],
]
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
    salidas: [`${D}/segmentacion/mosaico/clases.png`, `${D}/segmentacion/mosaico/arboles.json`],
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
    salidas: [`${D}/ciudad-1936.json`, `${D}/patios-de-casas.png`],
    codigo: GEO('vectorizar', 'lotes', 'alas'),
    cmd: async () => {
      const { plaza, metro } = await leerJson(`${D}/mosaico.json`)
      return [PY, 'tools/geo/vectorizar.py', `${D}/segmentacion/mosaico/clases-costura.png`, `${D}/ciudad-1936.json`,
        '--escala', String(metro), '--plaza', plaza.join(','), '--patios', `${D}/patios-de-casas.png`]
    },
  },
  // --- la línea de tiempo: los planos viejos calzados sobre 1936, la ciudad de 1578 y las épocas ---
  ...CALCES.map(([año, carpeta]) => ({
    id: `calce-${año}`,
    entradas: [`original:${carpeta}`, `fuentes/mapas/${carpeta}/ficha.json`, `tools/geo/gcp/calce-${carpeta}.json`,
      'tools/geo/gcp/plaza-1936.json',
      `${D}/mosaico.json`, `${D}/segmentacion/mosaico/clases-costura.png`],
    salidas: [`fuentes/derivados/${año}/calzado.tif`, `fuentes/derivados/${año}/calzado.json`],
    codigo: GEO('calce', 'calce_correlacion', 'tps'),
    cmd: () => [PY, 'tools/geo/calce.py', carpeta],
  })),
  {
    // plaza-1936.json da las semillas de las esquinas y la ruta de las clases (clases-costura.png)
    id: 'epocas-1578',
    entradas: ['tools/geo/epocas/1578-pimentel.json', 'tools/geo/gcp/plaza-1936.json', `${D}/mosaico.json`,
      `${D}/segmentacion/mosaico/clases-costura.png`],
    salidas: ['fuentes/derivados/1578/ciudad-1578.json'],
    codigo: GEO('epocas_1578', 'vectorizar'),
    cmd: () => [PY, 'tools/geo/epocas_1578.py'],
  },
  {
    id: 'epocas',
    entradas: ['tools/geo/epocas/epocas.json', `${D}/ciudad-1936.json`, 'fuentes/derivados/1578/ciudad-1578.json',
      ...CALCES.map(([año]) => `fuentes/derivados/${año}/calzado.tif`)],
    salidas: [`${E}/ciudad-epocas.json`, `${E}/crece.json`, 'public/datos/crece.json', 'public/plano/crece.png'],
    // relieve.bin (tools/geo/relieve.py, fuera de este pipeline) da las cuestas y la altura del monte
    opcionales: ['public/datos/relieve.bin'],
    codigo: GEO('epocas', 'valle', 'calce_correlacion', 'vectorizar', 'segmentar_clases'),
    cmd: () => [PY, 'tools/geo/epocas.py'],
  },
  {
    id: 'estilos', entradas: [`${E}/ciudad-epocas.json`, `${D}/mosaico.json`], salidas: [`${E}/ciudad-estilos.json`],
    codigo: GEO('estilos'),
    cmd: async () => {
      const { plaza, metro } = await leerJson(`${D}/mosaico.json`)
      return [PY, 'tools/geo/estilos.py', `${E}/ciudad-epocas.json`, `${E}/ciudad-estilos.json`,
        '--escala', String(metro), '--plaza', plaza.join(',')]
    },
  },
  {
    // la ciudad que se publica: la de las épocas, con estilos (la de 1936 sola no tiene "vida")
    id: 'empacar', entradas: [`${E}/ciudad-estilos.json`], salidas: ['public/datos/ciudad.pak'],
    codigo: ['tools/empacar-ciudad.mjs', 'tools/empacar-lib.mjs', 'tools/pak.mjs', 'src/ciudad.js'],
    cmd: () => ['node', 'tools/empacar-ciudad.mjs', `${E}/ciudad-estilos.json`],
  },
  {
    id: 'jardines', codigo: GEO('jardines'),
    entradas: [`${D}/segmentacion/mosaico/clases-costura.png`, `${D}/segmentacion/mosaico/arboles.json`],
    salidas: [`${D}/segmentacion/mosaico/jardines.json`],
    cmd: () => [PY, 'tools/geo/jardines.py', `${D}/segmentacion/mosaico/clases-costura.png`,
      `${D}/segmentacion/mosaico/arboles.json`, `${D}/segmentacion/mosaico/jardines.json`],
  },
  {
    // crece.png/crece.json (tools/geo/epocas.py, fuera de este pipeline) dan la época de cada árbol si
    // están; sin ellos todos nacen en la primera: son opcionales (si aparecen o cambian, el paso se rehace)
    id: 'arboles',
    // y el monte del valle (los árboles silvestres) sale de crece.png (G y B) y de la segmentación de 1936
    entradas: [`${D}/segmentacion/mosaico/arboles.json`, `${D}/segmentacion/mosaico/jardines.json`, `${D}/mosaico.json`,
      'public/datos/ciudad.pak', `${D}/segmentacion/mosaico/clases-costura.png`],
    opcionales: ['public/plano/crece.png', 'public/datos/crece.json'],
    salidas: ['public/datos/arboles.bin'],
    codigo: ['tools/arboles.mjs', 'tools/arboles-lib.mjs', 'tools/silvestres-lib.mjs', 'src/pak.js', 'src/epocas.js', 'src/alas.js', 'src/techos.js'],
    cmd: () => ['node', 'tools/arboles.mjs', `${D}/segmentacion/mosaico/arboles.json`, `${D}/mosaico.json`,
      `${D}/segmentacion/mosaico/jardines.json`, `${D}/segmentacion/mosaico/clases-costura.png`],
  },
  {
    // con los patios que el vectorizador abrió por regla en las casas de patio: ahí el suelo es de patio
    id: 'suelo', entradas: [`${D}/segmentacion/mosaico/clases-costura.png`, `${D}/patios-de-casas.png`],
    salidas: ['public/plano/suelo.webp', 'public/plano/suelo-2k.webp'],
    codigo: ['tools/suelo.mjs', 'tools/suelo-lib.mjs'],
    cmd: () => ['node', 'tools/suelo.mjs', `${D}/segmentacion/mosaico/clases-costura.png`, `${D}/patios-de-casas.png`],
  },
  {
    // lo que en el plano es letra, cifra o símbolo y no dibujo: en modo color no se marca
    id: 'rotulos', entradas: [`${D}/mosaico-costura.tif`, `${D}/mosaico.json`, 'tools/geo/paleta-1936.json'],
    salidas: [`${D}/segmentacion/mosaico/rotulos.png`],
    codigo: GEO('rotulos', 'segmentar', 'segmentar_color', 'segmentar_morfologia', 'segmentar_parametros'),
    cmd: async () => {
      const { metro } = await leerJson(`${D}/mosaico.json`)
      return [PY, 'tools/geo/rotulos.py', `${D}/mosaico-costura.tif`, `${D}/segmentacion/mosaico/rotulos.png`, '--escala', String(metro)]
    },
  },
  {
    id: 'rotulos-textura', entradas: [`${D}/segmentacion/mosaico/rotulos.png`],
    salidas: ['public/plano/rotulos.webp', 'public/plano/rotulos-2k.webp'],
    codigo: ['tools/rotulos.mjs', 'tools/rotulos-lib.mjs'],
    cmd: () => ['node', 'tools/rotulos.mjs', `${D}/segmentacion/mosaico/rotulos.png`],
  },
  {
    id: 'plano', entradas: [`${D}/mosaico-costura.tif`, `${D}/mosaico.json`],
    // + las teselas de public/plano/f/ según laminas.json (se suman al arrancar, ver pasosCompletos)
    salidas: ['public/plano/laminas.json', 'public/datos/ciudad.json', ...PLANO],
    codigo: ['tools/plano.mjs', 'tools/plano-lib.mjs'],
    cmd: () => ['node', 'tools/plano.mjs', `${D}/mosaico-costura.tif`, `${D}/mosaico.json`],
  },
  {
    // los planos viejos calzados sobre 1936 (pasos calce-<año>): una textura con alfa por época; las
    // salidas según el recorte de cada calzado.json (se suman en pasosCompletos)
    id: 'planos-epocas', salidas: ['public/plano/epocas.json'],
    entradas: CALCES.flatMap(([año]) => ['tif', 'json'].map((x) => `fuentes/derivados/${año}/calzado.${x}`)),
    codigo: ['tools/planos-epocas.mjs', 'tools/planos-epocas-lib.mjs'],
    cmd: () => ['node', 'tools/planos-epocas.mjs'],
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
  {
    // las fotos de las fichas: solo las que su ficha permite publicar (tools/fotos-lib.mjs); las entradas (las
    // fichas y los originales que haya) y las salidas (un par de .webp por foto) se suman en pasosCompletos
    id: 'fotos', entradas: [], salidas: ['public/datos/fotos.json'],
    codigo: ['tools/fotos.mjs', 'tools/fotos-lib.mjs', 'src/marcas-datos.js'],
    cmd: () => ['node', 'tools/fotos.mjs'],
  },
  {
    // los créditos del «Acerca»: las fichas de las fuentes que el sitio usa (tools/creditos-lib.mjs); las
    // fichas de los planos y de fuentes/datos/ se suman en pasosCompletos
    id: 'creditos', salidas: ['public/datos/creditos.json'],
    entradas: ['public/datos/crece.json', 'public/datos/fotos.json', 'tools/geo/mosaico-1936.json', 'package.json'],
    codigo: ['tools/creditos.mjs', 'tools/creditos-lib.mjs', 'src/epocas.js'],
    cmd: () => ['node', 'tools/creditos.mjs'],
  },
]

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

/** Las fichas que lee el paso `creditos`: las de los planos usados y todas las de fuentes/datos/. */
async function fichasDelAcerca() {
  const { epocas = [] } = (await leerJsonSiHay('tools/geo/epocas/epocas.json')) ?? {}
  const base = ((await leerJsonSiHay('tools/geo/mosaico-1936.json'))?.hojas ?? []).map((h) => h.fuente)
  const datos = (await readdir(path.join(RAIZ, 'fuentes/datos'), { withFileTypes: true }).catch(() => []))
    .filter((d) => d.isDirectory()).map((d) => `fuentes/datos/${d.name}/ficha.json`).sort()
  return [...fichasDeCreditos({ epocas, desde: PRIMERA_EPOCA, base }), ...datos]
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
  const fichasCreditos = await fichasDelAcerca()
  const pasos = PASOS.map((p) => {
    if (p.id === 'fotos') return { ...p, entradas: imagenes, salidas: [...p.salidas, ...fotos], rehacer: rehacerFotos }
    if (p.id === 'plano') return { ...p, salidas: [...p.salidas, ...teselas] }
    if (p.id === 'epocas') return { ...p, entradas: [...new Set([...p.entradas, ...fichas])] }
    if (p.id === 'planos-epocas') return { ...p, salidas: planosEpocas }
    if (p.id === 'creditos') return { ...p, entradas: [...p.entradas, ...fichasCreditos] }
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
  const publicos = pasos.flatMap((p) => p.salidas).filter((s) => s.startsWith('public/'))
  const archivos = {}
  for (const s of publicos) archivos[s] = await sha256(s)
  await writeFile(path.join(RAIZ, 'public/datos/manifiesto.json'), JSON.stringify({ conteos: medidos, archivos }, null, 2) + '\n')
  console.log(`conteos: ${JSON.stringify(medidos)} · manifiesto: public/datos/manifiesto.json`)
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
