#!/usr/bin/env node
// Herramienta offline: no toca public/, reservas, casas ni la red moderna del sitio.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ANIOS_RED, fuenteDeFicha, importarReferencias, proyeccionesIndebidas, redDeEpoca, unirRegistros, validarRedVial, VERSION_RED, SISTEMA_RED } from './red-vial-lib.mjs'
import { importarPuentes } from './red-vial-puentes.mjs'

const raiz = fileURLToPath(new URL('../', import.meta.url))
const leer = async (ruta) => JSON.parse(await readFile(resolve(raiz, ruta), 'utf8'))

/** El plano del catálogo que acredita cada corte. El de 1946 son fotos de ese año en una hoja catalogada [1950?]. */
export const PLANOS_DE_LA_RED = Object.freeze({
  1772: 'fuentes/mapas/1772-pares-agi-exato-mapa/ficha.json',
  1843: 'fuentes/mapas/1843-nypl-jesurun-facsimil-muller-stapler/ficha.json',
  1889: 'fuentes/mapas/1889-bnf-mestre/ficha.json',
  1911: 'fuentes/mapas/1911-princeton-plano-de-caracas-razetti/ficha.json',
  1936: 'fuentes/mapas/1936-archiveorg-caracas-dcn-hoja1/ficha.json',
  1946: 'fuentes/mapas/1950-archiveorg-plano-de-caracas-dcn/ficha.json',
})
const VIALIDAD_POSTERIOR = 'tools/geo/referencias/vialidad-posterior-1946.json'

/** Las fuentes `plano<año>`, con la fecha del documento y la que representa tomadas de la ficha de cada mapa. */
export async function fuentesDePlanos() {
  const fuentes = {}
  for (const [anio, ruta] of Object.entries(PLANOS_DE_LA_RED)) fuentes[`plano${anio}`] = fuenteDeFicha(await leer(ruta), { anios: [Number(anio)], ruta })
  return fuentes
}

export async function registroDelProyecto() {
  const fuentes = await fuentesDePlanos()
  const calles = importarReferencias(await leer('tools/geo/referencias/1772-calles-1936.json'), await leer('tools/geo/calles-historicas.json'), fuentes)
  const puentes = importarPuentes(await leer('docs/puentes-guaire-calce.json'), fuentes)
  const modernos = await leer(VIALIDAD_POSTERIOR)
  const posteriores = validarRedVial({ version: VERSION_RED, sistema: SISTEMA_RED, fuentes: modernos.fuentes, tramos: modernos.tramos })
  return unirRegistros(calles, puentes, posteriores)
}

const fila = (r) => ({
  año: r.año, tramos: r.tramos.length, inferidos: r.inferidos.length, 'sin medir': r.sinMedir.length, pendientes: r.pendientes.length,
  ausentes: r.ausentes.length, proyectos: r.proyectos.length, obras: r.obras.length, contradicciones: r.contradicciones.length,
})

export async function ejecutar(args) {
  const [accion, salida] = args
  if (!['auditar', 'exportar'].includes(accion) || args.length > 2 || (accion === 'exportar' && !salida)) throw new Error('uso: node tools/red-vial.mjs auditar | exportar <directorio>')
  const red = await registroDelProyecto()
  const faltas = proyeccionesIndebidas(red)
  if (faltas.length) throw new Error(`Tramos proyectados antes de su apertura: ${faltas.map((f) => `${f.tramo} en ${f.año}`).join(', ')}`)
  const resultados = ANIOS_RED.map((a) => redDeEpoca(red, a))
  if (accion === 'exportar') {
    const destino = resolve(salida), publico = resolve(raiz, 'public')
    if (destino === publico || destino.startsWith(publico + '/')) throw new Error('Exportar primero fuera de public/: revisar cobertura antes de publicar')
    await mkdir(destino, { recursive: true })
    for (const r of resultados) await writeFile(join(destino, `red-${r.año}.json`), JSON.stringify(r, null, 2) + '\n')
  }
  const resumen = resultados.map(fila)
  console.table(resumen)
  for (const r of resultados) for (const c of r.contradicciones) console.log(`contradicción pendiente · ${r.año} · ${c.tramo}: ${c.asunto}`)
  return resumen
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ejecutar(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exitCode = 1 })
}
