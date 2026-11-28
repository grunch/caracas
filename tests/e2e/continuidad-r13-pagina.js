// La continuidad con la R13 (tests/e2e/continuidad-r13.js) medida contra el sitio que corre: baja los campos de
// distancia a las manzanas que sirve (datos/suelo-manzanas*.json y su imagen) y los cruza con el pak.
import sharp from 'sharp'
import { AÑOS_DE_EPOCA } from '../../src/fichas.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { muertesSinR13, recintosDe } from './continuidad-r13.js'

const INDICES = ['suelo-manzanas-modernas', 'suelo-manzanas']

/** El campo de distancia a las manzanas de un año: { campo, canal }, un canal de una de las dos imágenes del sitio. */
async function campoDe(page, año) {
  for (const nombre of INDICES) {
    const r = await page.request.get(`/datos/${nombre}.json`)
    // Vite responde 200 con index.html a lo que no existe: hay que mirar el tipo de contenido
    if (!r.ok() || !(r.headers()['content-type'] ?? '').includes('json')) continue
    const meta = await r.json()
    if (!meta.canales.includes(año)) continue
    const imagen = await page.request.get(`/${meta.imagen}`)
    const { data, info } = await sharp(await imagen.body()).raw().toBuffer({ resolveWithObject: true })
    if (info.width !== meta.ancho || info.height !== meta.alto) throw new Error(`${meta.imagen}: mide ${info.width} × ${info.height} y su índice dice ${meta.ancho} × ${meta.alto}`)
    return { campo: { caja: meta.caja, ancho: meta.ancho, alto: meta.alto, canales: info.channels, datos: data }, canal: meta.canales.indexOf(año) }
  }
  throw new Error(`El sitio no sirve el campo de manzanas de ${año}`)
}

const vivaEn = (v, e) => v % 8 <= e && (!(v >> 3) || e < v >> 3)

/**
 * Las casas del pak ({ vertices, techos, vida }) en pie en la época e − 1 que faltan en la e sin que la R13 lo
 * explique: [{ casa, motivo }]. Los campos solo se bajan si alguna casa murió.
 */
export async function muertesSinR13En(page, { vertices, techos, vida }, e) {
  const huella = (i) => Array.from({ length: techos[i * 4 + 1] }, (_, k) => [0, 1].map((c) => vertices[2 * (techos[i * 4] + k) + c]))
  const muertas = Array.from(vida).flatMap((v, i) => (vivaEn(v, e - 1) && !vivaEn(v, e) ? [{ casa: i, huella: huella(i) }] : []))
  if (!muertas.length) return []
  return muertesSinR13({ muertas, antes: await campoDe(page, AÑOS_DE_EPOCA[e - 1]), ahora: await campoDe(page, AÑOS_DE_EPOCA[e]), recintos: recintosDe(hitosConPlanta(), e) })
}
