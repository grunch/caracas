#!/usr/bin/env node
// Uso: npm run datos [-- --forzar | --desde <paso> | --verificar]
// Regenera todos los datos del sitio desde los escaneos originales (como make: solo los pasos viejos),
// verifica los conteos contra tools/datos-esperados.json y escribe public/datos/manifiesto.json (sha256).
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pendientes, verificarConteos } from './datos-lib.mjs'

const RAIZ = path.resolve(import.meta.dirname, '..')
const PY = process.env.PY ?? '.venv/bin/python'
const D = 'fuentes/derivados/1936'
const HOJA = (n) => `fuentes/mapas/1936-archiveorg-caracas-dcn-hoja${n}/original.tif`
const PLANO = ['primero', 'chico', 'medio-4k', 'medio'].map((n) => `public/plano/${n}.webp`)
const leerJson = async (ruta) => JSON.parse(await readFile(path.join(RAIZ, ruta), 'utf8'))

const PASOS = [
  ...[1, 2].map((n) => ({
    id: `cuadricula-${n}`, entradas: [HOJA(n), 'tools/geo/gcp/semillas-1936.json'],
    salidas: [`tools/geo/gcp/1936-hoja${n}.json`, `tools/geo/gcp/1936-hoja${n}-lineas.json`],
    cmd: () => [PY, 'tools/geo/cuadricula.py', '--semillas', 'tools/geo/gcp/semillas-1936.json', '--hoja', `1936-hoja${n}`],
  })),
  {
    id: 'mosaico', entradas: ['tools/geo/mosaico-1936.json', 'tools/geo/gcp/1936-hoja1.json', 'tools/geo/gcp/1936-hoja2.json'],
    salidas: [`${D}/mosaico.tif`, `${D}/mosaico.json`],
    cmd: () => [PY, 'tools/geo/mosaico.py', '--config', 'tools/geo/mosaico-1936.json'],
  },
  {
    id: 'segmentar', entradas: [`${D}/mosaico.tif`, 'tools/geo/paleta-1936.json'],
    salidas: [`${D}/segmentacion/mosaico/clases.png`],
    cmd: () => [PY, 'tools/geo/segmentar.py', `${D}/mosaico.tif`, `${D}/segmentacion/mosaico`, '--escala', '0.5'],
  },
  {
    id: 'costura', entradas: [`${D}/mosaico.tif`, `${D}/mosaico.json`, `${D}/segmentacion/mosaico/clases.png`],
    salidas: [`${D}/mosaico-costura.tif`, `${D}/segmentacion/mosaico/clases-costura.png`],
    cmd: () => [PY, 'tools/geo/costura.py', '--mosaico', `${D}/mosaico.tif`, '--meta', `${D}/mosaico.json`,
      '--clases', `${D}/segmentacion/mosaico/clases.png`],
  },
  {
    id: 'vectorizar', entradas: [`${D}/segmentacion/mosaico/clases-costura.png`, `${D}/mosaico.json`],
    salidas: [`${D}/ciudad-1936.json`],
    cmd: async () => {
      const { plaza, metro } = await leerJson(`${D}/mosaico.json`)
      return [PY, 'tools/geo/vectorizar.py', `${D}/segmentacion/mosaico/clases-costura.png`, `${D}/ciudad-1936.json`,
        '--escala', String(metro), '--plaza', plaza.join(',')]
    },
  },
  {
    id: 'empacar', entradas: [`${D}/ciudad-1936.json`], salidas: ['public/datos/ciudad.pak'],
    cmd: () => ['node', 'tools/empacar-ciudad.mjs', `${D}/ciudad-1936.json`],
  },
  {
    id: 'suelo', entradas: [`${D}/segmentacion/mosaico/clases-costura.png`],
    salidas: ['public/plano/suelo.webp', 'public/plano/suelo-2k.webp'],
    cmd: () => ['node', 'tools/suelo.mjs', `${D}/segmentacion/mosaico/clases-costura.png`],
  },
  {
    id: 'plano', entradas: [`${D}/mosaico-costura.tif`, `${D}/mosaico.json`],
    salidas: ['public/plano/laminas.json', ...PLANO],
    cmd: () => ['node', 'tools/plano.mjs', `${D}/mosaico-costura.tif`, `${D}/mosaico.json`],
  },
]

function argumentos(argv) {
  const a = { forzar: argv.includes('--forzar'), verificar: argv.includes('--verificar'), desde: null }
  const i = argv.indexOf('--desde')
  if (i !== -1) a.desde = argv[i + 1] ?? null
  return a
}

async function tiempos() {
  const rutas = [...new Set(PASOS.flatMap((p) => [...p.entradas, ...p.salidas]))]
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

async function verificar() {
  const ciudad = await leerJson(`${D}/ciudad-1936.json`)
  const medidos = { techos: ciudad.techos.length, manzanas: ciudad.manzanas }
  const { _nota, ...esperados } = await leerJson('tools/datos-esperados.json')
  const errores = verificarConteos(medidos, esperados)
  const publicos = PASOS.flatMap((p) => p.salidas).filter((s) => s.startsWith('public/'))
  const archivos = {}
  for (const s of publicos) archivos[s] = await sha256(s)
  await writeFile(path.join(RAIZ, 'public/datos/manifiesto.json'), JSON.stringify({ conteos: medidos, archivos }, null, 2) + '\n')
  console.log(`conteos: ${JSON.stringify(medidos)} · manifiesto: public/datos/manifiesto.json`)
  return errores
}

const opciones = argumentos(process.argv.slice(2))
if (!opciones.verificar) {
  const ids = pendientes(PASOS, await tiempos(), opciones)
  console.log(ids.length ? `pasos a correr: ${ids.join(' → ')}` : 'todo al día')
  for (const id of ids) {
    const paso = PASOS.find((p) => p.id === id)
    console.log(`\n▶ ${id}`)
    const inicio = Date.now()
    await correr(await paso.cmd())
    console.log(`✓ ${id} (${((Date.now() - inicio) / 1000).toFixed(0)} s)`)
  }
}
const errores = await verificar()
if (errores.length) {
  console.error(`\nconteos fuera de lo esperado:\n  ${errores.join('\n  ')}`)
  process.exit(1)
}
