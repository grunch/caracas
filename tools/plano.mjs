#!/usr/bin/env node
// Uso: node tools/plano.mjs <imagen-base> [mosaico.json]
// Genera public/plano/{primero,chico,medio-4k,medio}.webp, public/plano/f/<i>-<j>.webp (teselas de 3072 px)
// y public/plano/laminas.json; si se pasa mosaico.json, actualiza el bloque "plano" de public/datos/ciudad.json.
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import { grillaTeselas, nivelesLOD, planoDesdeMosaico, TESELA } from './plano-lib.mjs'

const RAIZ = path.resolve(import.meta.dirname, '..')
const SALIDA = path.join(RAIZ, 'public', 'plano')
const CALIDAD = 82

const [entrada, mosaicoJson] = process.argv.slice(2)
if (!entrada) {
  console.error('uso: node tools/plano.mjs <imagen-base> [mosaico.json]')
  process.exit(1)
}

sharp.concurrency(os.availableParallelism())
const abrir = () => sharp(entrada, { limitInputPixels: false, sequentialRead: true })
const { width: ancho, height: alto } = await abrir().metadata()
console.log(`plano: ${ancho}×${alto}`)
await mkdir(path.join(SALIDA, 'f'), { recursive: true })

for (const { archivo, lado } of nivelesLOD(ancho, alto)) {
  await abrir().resize(lado, lado, { fit: 'inside' }).webp({ quality: CALIDAD }).toFile(path.join(SALIDA, archivo))
  console.log(`  ${archivo}`)
}

const grilla = grillaTeselas(ancho, alto, TESELA)
for (const t of grilla.teselas) {
  await abrir().extract({ left: t.x, top: t.y, width: t.ancho, height: t.alto })
    .webp({ quality: CALIDAD }).toFile(path.join(SALIDA, 'f', `${t.nombre}.webp`))
}
console.log(`  ${grilla.teselas.length} teselas (${grilla.cols}×${grilla.rows})`)
await writeFile(path.join(SALIDA, 'laminas.json'), JSON.stringify({ ancho, alto, tesela: TESELA, cols: grilla.cols, rows: grilla.rows }) + '\n')

if (mosaicoJson) {
  const archivoCiudad = path.join(RAIZ, 'public', 'datos', 'ciudad.json')
  const ciudad = JSON.parse(await readFile(archivoCiudad, 'utf8'))
  const plano = planoDesdeMosaico(JSON.parse(await readFile(mosaicoJson, 'utf8')))
  const { _nota, ...resto } = ciudad
  await writeFile(archivoCiudad, JSON.stringify({ ...resto, plano }, null, 2) + '\n')
  console.log('  public/datos/ciudad.json actualizado')
}
