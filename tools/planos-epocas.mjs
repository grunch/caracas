#!/usr/bin/env node
// Uso: node tools/planos-epocas.mjs
// De cada plano calzado (fuentes/derivados/<año>/calzado.tif + calzado.json, de tools/geo/calce.py) genera
// public/plano/<año>/{chico,medio[,grande]}.webp con alfa (0 fuera del plano) y el índice public/plano/epocas.json.
// Las texturas cubren solo el recorte del calzado (en píxeles de la hoja de 1936); el visor las ubica con él.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import { indicePlanos, rellenarTransparente } from './planos-epocas-lib.mjs'

const RAIZ = path.resolve(import.meta.dirname, '..')
const DERIVADOS = path.join(RAIZ, 'fuentes', 'derivados')
const CALIDAD = 82

/** Los calzado.json que hay en fuentes/derivados/<año>/ (los años sin calce no tienen). */
export async function leerCalzados(derivados = DERIVADOS) {
  const carpetas = await readdir(derivados).catch(() => [])
  const calzados = []
  for (const c of carpetas.filter((n) => /^\d{4}$/.test(n)).sort()) {
    const json = await readFile(path.join(derivados, c, 'calzado.json'), 'utf8').catch(() => null)
    if (json) calzados.push(JSON.parse(json))
  }
  return calzados
}

async function generar(plano) {
  const tif = path.join(DERIVADOS, String(plano.año), 'calzado.tif')
  const abrir = () => sharp(tif, { limitInputPixels: false })
  const { width, height } = await abrir().metadata()
  const [x0, y0, x1, y1] = plano.recorte
  if (width !== x1 - x0 || height !== y1 - y0) {
    throw new Error(`${plano.año}: calzado.tif mide ${width}×${height}, el recorte ${x1 - x0}×${y1 - y0}`)
  }
  await mkdir(path.join(RAIZ, 'public', 'plano', String(plano.año)), { recursive: true })
  for (const { url, lado } of plano.niveles) {
    const { data, info } = await abrir().ensureAlpha().resize(lado, lado, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true })
    await sharp(rellenarTransparente(data), { raw: { width: info.width, height: info.height, channels: 4 } })
      .webp({ quality: CALIDAD, alphaQuality: 90, exact: true }).toFile(path.join(RAIZ, 'public', url))
    console.log(`  ${url} (${info.width}×${info.height})`)
  }
}

if (import.meta.main) {
  sharp.concurrency(os.availableParallelism())
  const indice = indicePlanos(await leerCalzados())
  for (const plano of indice.planos) await generar(plano)
  await writeFile(path.join(RAIZ, 'public', 'plano', 'epocas.json'), JSON.stringify(indice) + '\n')
  console.log(`planos de época: ${indice.planos.map((p) => p.año).join(', ') || 'ninguno'} → public/plano/epocas.json`)
}
