#!/usr/bin/env node
/**
 * Catálogos de evidencias fuera del registro vial: caminos, rieles, puentes de quebradas, sectores fuera de la hoja.
 * Usan la ficha del registro (tools/red-vial-lib.mjs: cronología con una fuente por afirmación, contradicciones,
 * lo desconocido y una etapa por corte del sitio) sin entrar en la red exportada, y su documento se genera desde
 * el JSON: `node tools/catalogo-evidencias.mjs <datos.json> <documento.md>`. Un test compara los dos.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ANIOS_RED, VERSION_RED, SISTEMA_RED, validarRedVial } from './red-vial-lib.mjs'
import { catalogoEnMarkdown } from './red-vial-posterior.mjs'

export const MARCA = '<!-- catálogo: lo que sigue se genera con `node tools/catalogo-evidencias.mjs`; no editar a mano -->'
const ESTADO = Object.freeze({ existente: 'Existe', obra: 'En obra', proyecto: 'Proyecto', ausente: 'No está', desconocido: 'No se sabe' })
const celda = (s) => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ')

/**
 * Valida el catálogo con las reglas del registro vial. El `tipo` de cada elemento es propio del catálogo (un camino
 * de recuas, una vía férrea o una plaza no son tramos de calle): solo se le pide que sea texto.
 */
export function validarCatalogo(doc) {
  if (!Array.isArray(doc?.tramos) || !doc.tramos.length) throw new Error('catálogo sin elementos')
  for (const t of doc.tramos) {
    for (const k of ['tipo', 'nombre', 'sistema']) if (typeof t[k] !== 'string' || !t[k].trim()) throw new Error(`${t.id}: falta ${k}`)
    if (!Array.isArray(t.cronologia) || !Array.isArray(t.desconocido) || !Array.isArray(t.contradicciones)) throw new Error(`${t.id}: faltan cronologia, desconocido o contradicciones`)
    for (const e of t.etapas) if (typeof e.lectura !== 'string' || !e.lectura.trim()) throw new Error(`${t.id}: etapa de ${e.anio} sin lectura`)
  }
  validarRedVial({ version: VERSION_RED, sistema: SISTEMA_RED, fuentes: doc.fuentes, tramos: doc.tramos.map(({ tipo, ...resto }) => resto) })
  return doc
}

/** Una fila por elemento y un corte por columna: lo que el plano de cada época deja leer. Sin etapa: «Sin lectura». */
export function tablaDeCortes(doc) {
  const lineas = ['## Lo que deja leer el plano de cada corte', '',
    '«Sin lectura» es que nadie leyó ese plano para ese elemento: no es una ausencia. La certeza va entre paréntesis.', '',
    `| Elemento | ${ANIOS_RED.join(' | ')} |`, `|---|${ANIOS_RED.map(() => '---').join('|')}|`]
  for (const t of doc.tramos) {
    const celdas = ANIOS_RED.map((a) => {
      const e = t.etapas.find((x) => x.anio === a)
      if (!e) return 'Sin lectura'
      const nombre = e.nombre ? ` «${e.nombre}».` : ''
      return celda(`**${ESTADO[e.estado]}** (${e.certeza}).${nombre} ${e.lectura}`)
    })
    lineas.push(`| ${celda(t.nombre)} | ${celdas.join(' | ')} |`)
  }
  return lineas.join('\n') + '\n'
}

/** El documento entero: el encabezado escrito a mano (hasta la marca), la tabla de cortes y la ficha de cada elemento. */
export function documentoDe(doc, actual) {
  const corte = actual.indexOf(MARCA)
  if (corte < 0) throw new Error('el documento no trae la marca del catálogo')
  validarCatalogo(doc)
  return catalogoEnMarkdown(doc, `${actual.slice(0, corte + MARCA.length)}\n\n${tablaDeCortes(doc)}`)
}

export async function ejecutar([datos, documento]) {
  if (!datos || !documento) throw new Error('uso: node tools/catalogo-evidencias.mjs <datos.json> <documento.md>')
  const generado = documentoDe(JSON.parse(await readFile(resolve(datos), 'utf8')), await readFile(resolve(documento), 'utf8'))
  await writeFile(resolve(documento), generado)
  return generado
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ejecutar(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exitCode = 1 })
}
