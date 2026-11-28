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
const SIN_APERTURA = 'sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio'
const ESTADO = Object.freeze({ existente: 'Existe', obra: 'En obra', proyecto: 'Proyecto', ausente: 'No está', desconocido: 'No se sabe' })
const celda = (s) => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ')
/**
 * Clases de fuente que no bastan para «documentada»: una cronología sin fuentes citadas, una crónica sin aparato o
 * Wikipedia. «Documentada» pide un documento de época (un plano, una pintura) o una fuente secundaria CON referencias.
 */
export const CLASES_DEBILES = Object.freeze(['secundaria sin referencias', 'crónica sin referencias', 'terciaria'])
const exigir = (ok, mensaje) => { if (!ok) throw new Error(mensaje) }

/**
 * Lo que «documentada» no puede ser. Una afirmación de la cronología no lo es si solo cita fuentes débiles, ni si
 * está en disputa: `disputa` nombra el asunto de una contradicción pendiente de su mismo elemento. Una etapa tampoco
 * lo es si guarda una contradicción pendiente.
 */
function validarCertezas(doc, t) {
  const debil = (id) => CLASES_DEBILES.includes(doc.fuentes[id]?.clase)
  const pendientes = new Set(t.contradicciones.filter((c) => c.estado === 'pendiente').map((c) => c.asunto))
  for (const c of t.cronologia) {
    for (const id of c.fuentes ?? []) exigir(Object.hasOwn(doc.clases_de_fuente, doc.fuentes[id]?.clase), `${t.id}: la fuente ${id} no tiene una clase definida en clases_de_fuente`)
    if (c.disputa !== undefined) exigir(pendientes.has(c.disputa), `${t.id}: «${c.dice}» nombra una disputa que no es una contradicción pendiente del elemento`)
    if (c.certeza !== 'documentada') continue
    exigir(!(c.fuentes ?? []).every(debil), `${t.id}: «${c.dice}» va como documentada y solo cita fuentes sin referencias o terciarias`)
    exigir(c.disputa === undefined, `${t.id}: «${c.dice}» va como documentada y está en una contradicción pendiente`)
  }
  for (const e of t.etapas) {
    const abierta = (e.contradicciones ?? []).some((c) => c.estado === 'pendiente')
    exigir(!(abierta && e.certeza === 'documentada'), `${t.id}: la etapa de ${e.anio} va como documentada y guarda una contradicción pendiente`)
  }
}

/**
 * Valida el catálogo con las reglas del registro vial. El `tipo` de cada elemento es propio del catálogo (un camino
 * de recuas, una vía férrea o una plaza no son tramos de calle): solo se le pide que sea texto.
 */
export function validarCatalogo(doc) {
  if (!Array.isArray(doc?.tramos) || !doc.tramos.length) throw new Error('catálogo sin elementos')
  exigir(doc.clases_de_fuente && typeof doc.clases_de_fuente === 'object' && doc.fuentes && typeof doc.fuentes === 'object', 'catálogo sin fuentes o sin clases_de_fuente')
  for (const t of doc.tramos) {
    for (const k of ['tipo', 'nombre', 'sistema']) if (typeof t[k] !== 'string' || !t[k].trim()) throw new Error(`${t.id}: falta ${k}`)
    if (!Array.isArray(t.cronologia) || !Array.isArray(t.desconocido) || !Array.isArray(t.contradicciones) || !Array.isArray(t.etapas)) throw new Error(`${t.id}: faltan cronologia, desconocido, contradicciones o etapas`)
    for (const e of t.etapas) if (typeof e.lectura !== 'string' || !e.lectura.trim()) throw new Error(`${t.id}: etapa de ${e.anio} sin lectura`)
  }
  validarRedVial({ version: VERSION_RED, sistema: SISTEMA_RED, fuentes: doc.fuentes, tramos: doc.tramos.map(({ tipo, ...resto }) => resto) })
  for (const t of doc.tramos) validarCertezas(doc, t)
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
  // Sin `desde`, el generador del registro dice «sin fecha de apertura»; acá un elemento puede tener sus fechas en la
  // cronología y aun así no afirmar nada de los cortes que ningún plano acredita.
  return catalogoEnMarkdown(doc, `${actual.slice(0, corte + MARCA.length)}\n\n${tablaDeCortes(doc)}`)
    .replaceAll(SIN_APERTURA, 'sin lectura donde ningún plano lo acredita: **pendiente**, no ausente')
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
