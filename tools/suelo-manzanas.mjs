#!/usr/bin/env node
// Uso: node tools/suelo-manzanas.mjs <mosaico.json> <informe 1772> <informe 1843> <informe 1889>
//   → public/plano/suelo-manzanas.png (RGB: distancia firmada a las manzanas de 1772, 1843 y 1889) y
//     public/datos/suelo-manzanas.json (dónde va). Ver tools/suelo-manzanas-lib.mjs. Los informes se leen como JSON.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { MARCAS } from '../src/marcas-datos.js'
import { HITOS } from '../src/hitos.js'
import {
  EPOCAS_SUELO, poligonosDeInforme, cajaDeManzanas, distanciaFirmada, plazasDeEpoca, despejarPlazas, codificar, metaSueloManzanas,
} from './suelo-manzanas-lib.mjs'

const [rutaMosaico, ...rutasInformes] = process.argv.slice(2)
if (!rutaMosaico || rutasInformes.length !== EPOCAS_SUELO.length) {
  console.error(`uso: node tools/suelo-manzanas.mjs <mosaico.json> ${EPOCAS_SUELO.map((e) => `<informe ${e.año}>`).join(' ')}`)
  process.exit(1)
}
const PUBLICO = path.resolve(import.meta.dirname, '..', 'public')
try {
  const { metro } = JSON.parse(await readFile(rutaMosaico, 'utf8'))
  if (!(metro > 0)) throw new Error(`${rutaMosaico}: falta metro`)
  const poligonos = await Promise.all(rutasInformes.map(async (r) => poligonosDeInforme(JSON.parse(await readFile(r, 'utf8')))))
  const caja = cajaDeManzanas(poligonos, metro)
  const campos = EPOCAS_SUELO.map(({ año, epoca }, k) => {
    const campo = distanciaFirmada(poligonos[k], caja, { metro })
    const plazas = plazasDeEpoca(MARCAS, HITOS, epoca)
    console.log(`  ${año}: ${poligonos[k].length} manzanas, ${plazas.length} plazas`)
    return despejarPlazas(campo, caja, plazas, { metro })
  })
  const { ancho, alto, canales, datos } = codificar(campos)
  const manzanas = Object.fromEntries(EPOCAS_SUELO.map((e, k) => [e.año, poligonos[k].length]))
  const meta = metaSueloManzanas({ caja, ancho, alto, manzanas })
  const png = await sharp(Buffer.from(datos), { raw: { width: ancho, height: alto, channels: canales } })
    .png({ compressionLevel: 9 }).toBuffer()
  await mkdir(path.join(PUBLICO, 'plano'), { recursive: true })
  await mkdir(path.join(PUBLICO, 'datos'), { recursive: true })
  await writeFile(path.join(PUBLICO, meta.imagen), png)
  await writeFile(path.join(PUBLICO, 'datos', 'suelo-manzanas.json'), `${JSON.stringify(meta, null, 2)}\n`)
  console.log(`  ${meta.imagen}: ${ancho}×${alto}, ${(png.length / 1024).toFixed(0)} KiB`)
} catch (e) {
  console.error(`error: ${e.message}`)
  process.exit(1)
}
