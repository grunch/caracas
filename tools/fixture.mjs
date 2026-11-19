#!/usr/bin/env node
// La fixture chica de los E2E (T12 en specs/07): un recorte de 1 km² alrededor de la plaza de los datos
// reales del pipeline, versionado en tests/fixtures/publico/ con la misma estructura que public/.
//
//   node tools/fixture.mjs             con los datos reales en el checkout (npm run datos): regenera la fixture
//   node tools/fixture.mjs --instalar  copia la fixture a public/ (lo que corre el CI antes de los E2E)
//
// La ciudad (.pak) y los árboles se recortan a la caja; el relieve va a la mitad; crece.png queda en cero
// (nunca edificado) fuera de la caja; las imágenes del plano se achican (la hoja entera, a baja resolución);
// de las fotos, solo las de la Plaza Bolívar. Cada dato conserva su licencia (ver LEEME.md de la fixture).
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { codificarPak } from './pak.mjs'
import { partesDeCiudad } from './empacar-lib.mjs'
import { cajaAlrededor, nivelesReducidos, recortarArboles, recortarCiudad, reducirRelieve } from './fixture-lib.mjs'

const RAIZ = path.resolve(import.meta.dirname, '..')
const PUBLICO = path.join(RAIZ, 'public')
const FIXTURE = path.join(RAIZ, 'tests/fixtures/publico')
const LADO_M = 1000
const LADO_PLANO_PX = 512 // las imágenes de la hoja entera
const LADO_TESELA_PX = 128
const LADO_FOTO_PX = 480
const CALIDAD = 55
const MARCA_DE_LAS_FOTOS = 'plaza-bolivar'

const desde = (r) => path.join(PUBLICO, r)
const hacia = (r) => path.join(FIXTURE, r)
const leerJson = async (r) => JSON.parse(await readFile(desde(r), 'utf8'))

async function escribir(r, datos) {
  await mkdir(path.dirname(hacia(r)), { recursive: true })
  await writeFile(hacia(r), datos)
}

async function achicar(r, lado) {
  await mkdir(path.dirname(hacia(r)), { recursive: true })
  await sharp(desde(r)).resize({ width: lado, height: lado, fit: 'inside' }).webp({ quality: CALIDAD }).toFile(hacia(r))
}

async function crecePng(caja, celdaM, metro) {
  const { data, info } = await sharp(desde('plano/crece.png')).raw().toBuffer({ resolveWithObject: true })
  const px = metro / celdaM // celdas por píxel del plano
  const [i0, j0, i1, j1] = [caja.x0 * px, caja.y0 * px, caja.x1 * px, caja.y1 * px].map(Math.round)
  const salida = Buffer.alloc(data.length)
  for (let j = Math.max(0, j0); j < Math.min(info.height, j1); j++) {
    const o = (j * info.width + Math.max(0, i0)) * info.channels
    data.copy(salida, o, o, (j * info.width + Math.min(info.width, i1)) * info.channels)
  }
  await mkdir(path.dirname(hacia('plano/crece.png')), { recursive: true })
  await sharp(salida, { raw: info }).png({ compressionLevel: 9 }).toFile(hacia('plano/crece.png'))
}

async function generar() {
  const { plano } = await leerJson('datos/ciudad.json')
  const caja = cajaAlrededor(plano.plaza, plano.metro, LADO_M)
  await rm(FIXTURE, { recursive: true, force: true })
  // la ciudad: del JSON que empaca el pipeline (tools/empacar-ciudad.mjs)
  const ciudad = JSON.parse(await readFile(path.join(RAIZ, 'fuentes/derivados/epocas/ciudad-estilos.json'), 'utf8'))
  const recortada = recortarCiudad(ciudad, caja)
  await escribir('datos/ciudad.pak', codificarPak(partesDeCiudad(recortada)))
  await escribir('datos/arboles.bin', recortarArboles(await readFile(desde('datos/arboles.bin')), caja))
  await escribir('datos/relieve.bin', reducirRelieve(await readFile(desde('datos/relieve.bin')), 2))
  for (const r of ['datos/crece.json', 'datos/calles.json', 'datos/calles.bin', 'datos/creditos.json', 'plano/hoy-lejos.webp']) {
    await escribir(r, await readFile(desde(r)))
  }
  const crece = await leerJson('datos/crece.json')
  await crecePng(caja, crece.celda_m, plano.metro)
  // la hoja entera, chica
  for (const nombre of ['primero', 'chico', 'medio', 'medio-4k', 'suelo', 'suelo-2k', 'rotulos', 'rotulos-2k', 'hoy-cerca']) {
    await achicar(`plano/${nombre}.webp`, LADO_PLANO_PX)
  }
  for (const tesela of await readdir(desde('plano/f'))) await achicar(`plano/f/${tesela}`, LADO_TESELA_PX)
  const epocas = await leerJson('plano/epocas.json')
  for (const p of epocas.planos) await achicar(p.niveles[0].url, LADO_PLANO_PX)
  await escribir('plano/epocas.json', JSON.stringify(nivelesReducidos(epocas, LADO_PLANO_PX)))
  // las fotos de la Plaza Bolívar
  const { fotos, ...resto } = await leerJson('datos/fotos.json')
  const deLaPlaza = fotos.filter((f) => f.marcas?.includes(MARCA_DE_LAS_FOTOS))
  for (const f of deLaPlaza) {
    await achicar(`fotos/${f.id}.webp`, LADO_FOTO_PX)
    await escribir(`fotos/m/${f.id}.webp`, await readFile(desde(`fotos/m/${f.id}.webp`)))
  }
  await escribir('datos/fotos.json', JSON.stringify({ ...resto, fotos: deLaPlaza }))
  await escribir('LEEME.md', LEEME)
  console.log(`fixture: ${recortada.techos.length} casas de ${ciudad.techos.length}, ${deLaPlaza.length} fotos → ${path.relative(RAIZ, FIXTURE)}`)
}

async function instalar() {
  const archivos = (await readdir(FIXTURE, { recursive: true, withFileTypes: true })).filter((e) => e.isFile() && e.name !== 'LEEME.md')
  for (const e of archivos) {
    const r = path.relative(FIXTURE, path.join(e.parentPath ?? e.path, e.name))
    await mkdir(path.dirname(desde(r)), { recursive: true })
    await cp(hacia(r), desde(r))
  }
  console.log(`fixture: ${archivos.length} archivos → public/`)
}

const LEEME = `# Fixture chica de los E2E

Generada con \`node tools/fixture.mjs\` a partir de los datos reales del pipeline (\`npm run datos\`): un
recorte de 1 km² alrededor de la Plaza Bolívar. El CI la copia a \`public/\` con \`node tools/fixture.mjs
--instalar\` antes de los E2E. No editar a mano: se regenera.

Cada dato conserva la licencia de su fuente (\`fuentes/mapas/*/ficha.json\`, \`fuentes/datos/*/ficha.json\`,
\`fuentes/imagenes/*/ficha.json\`):

- \`plano/\`: el plano de 1936 y los de cada época, achicados (sus fichas en \`fuentes/mapas/\`).
- \`datos/ciudad.pak\`, \`datos/arboles.bin\`, \`datos/crece.json\`, \`plano/crece.png\`: derivados de esos planos.
- \`datos/relieve.bin\`: Copernicus GLO-30 (\`fuentes/datos/\`).
- \`datos/calles.*\`, \`plano/hoy-*.webp\`: © colaboradores de OpenStreetMap, ODbL 1.0.
- \`fotos/\`: solo las de la Plaza Bolívar, de dominio público o licencia libre (\`datos/fotos.json\`).
`

await (process.argv.includes('--instalar') ? instalar() : generar())
