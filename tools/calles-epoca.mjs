#!/usr/bin/env node
// Uso: node tools/calles-epoca.mjs <año> <referencia de calles.json> <mosaico.json>
//   → public/plano/calles-<año>.png (campo de distancia, gris) y public/datos/calles-<año>.json (dónde va y de dónde sale)
// Ver tools/calles-epoca-lib.mjs. Las referencias se leen como JSON, sin evaluar nada.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { tramosDibujables, cajaDeCalles, campoDeDistancia, metaCalles } from './calles-epoca-lib.mjs'

const [año, rutaRef, rutaMosaico] = process.argv.slice(2)
if (!/^\d{4}$/.test(año ?? '') || !rutaRef || !rutaMosaico) {
  console.error('uso: node tools/calles-epoca.mjs <año> <referencia de calles.json> <mosaico.json>')
  process.exit(1)
}
const PUBLICO = path.resolve(import.meta.dirname, '..', 'public')
try {
  const ref = JSON.parse(await readFile(rutaRef, 'utf8'))
  const { metro } = JSON.parse(await readFile(rutaMosaico, 'utf8'))
  if (!(metro > 0)) throw new Error(`${rutaMosaico}: falta metro`)
  const tramos = tramosDibujables(ref)
  const caja = cajaDeCalles(tramos, metro)
  const campo = campoDeDistancia(tramos, caja, { metro })
  const meta = metaCalles({ año: Number(año), ref, tramos, caja, campo })
  const png = await sharp(Buffer.from(campo.datos), { raw: { width: campo.ancho, height: campo.alto, channels: 1 } })
    .png({ compressionLevel: 9 }).toBuffer()
  await mkdir(path.join(PUBLICO, 'plano'), { recursive: true })
  await mkdir(path.join(PUBLICO, 'datos'), { recursive: true })
  await writeFile(path.join(PUBLICO, meta.imagen), png)
  await writeFile(path.join(PUBLICO, 'datos', `calles-${año}.json`), `${JSON.stringify(meta, null, 2)}\n`)
  console.log(`  ${meta.imagen}: ${campo.ancho}×${campo.alto}, ${tramos.length} tramos`)
} catch (e) {
  console.error(`error: ${e.message}`)
  process.exit(1)
}
