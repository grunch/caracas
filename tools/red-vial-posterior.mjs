/**
 * El catálogo de vías posteriores a 1946 (tools/geo/referencias/vialidad-posterior-1946.json) como documento:
 * una sección por sistema y, en cada vía, una fila por afirmación con su cita y su fuente (#277, #278).
 * docs/vialidad-posterior-1946.md se genera con esto (`node tools/red-vial.mjs catalogo`) y un test lo compara.
 * Lógica pura.
 */
const TIPO = Object.freeze({ levantamiento: 'Levantamiento', proyecto: 'Proyecto', obra: 'Obra', apertura: 'Apertura', reforma: 'Reforma', nombre: 'Nombre', demolicion: 'Demolición' })
const celda = (s) => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ')
const fecha = (f) => (f === null ? 'Sin fecha' : f.desde === f.hasta ? String(f.desde) : `${f.desde}–${f.hasta}`)

/** Las fuentes del catálogo, numeradas en el orden en que se citan por primera vez. */
function numerar(doc) {
  const numero = new Map()
  const ver = (id) => { if (!numero.has(id)) numero.set(id, numero.size + 1) }
  for (const t of doc.tramos) {
    for (const c of t.cronologia ?? []) c.fuentes.forEach(ver)
    for (const n of t.nombres ?? []) n.fuentes.forEach(ver)
    for (const c of t.contradicciones ?? []) c.afirmaciones.forEach((a) => ver(a.fuente))
    for (const id of t.fuentesCronologia ?? []) ver(id)
  }
  for (const n of doc.no_posteriores ?? []) n.fuentes.forEach(ver)
  return numero
}

function seccionDeVia(t, cita) {
  const lineas = [`### ${t.nombre}`, '']
  const apertura = t.desde === undefined ? 'sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio' : `ausente en los cortes anteriores a **${t.desde}**`
  lineas.push(`\`${t.id}\` · ${t.tipo} · ${apertura}.`, '')
  if (t.predecesora) lineas.push(`**Antes:** ${t.predecesora}.`, '')
  if (t.nota) lineas.push(`${t.nota}`, '')
  if (t.nombres?.length) {
    const nombres = t.nombres.map((n) => `«${n.nombre}» (${n.desde ?? '¿?'}–${n.hasta ?? (n.desde === null ? '¿?' : 'hoy')}) ${cita(n.fuentes)}`)
    lineas.push(`**Nombres:** ${nombres.join('; ')}.`, '')
  }
  lineas.push('| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |', '|---|---|---|---|---|---|')
  for (const c of t.cronologia ?? []) lineas.push(`| ${fecha(c.fecha)} | ${TIPO[c.tipo]} | ${celda(c.dice)} | ${celda(c.cita ?? '')} | ${c.certeza} | ${cita(c.fuentes)} |`)
  lineas.push('')
  for (const c of t.contradicciones ?? []) {
    lineas.push(`**Contradicción ${c.estado} — ${c.asunto}:**`, '')
    for (const a of c.afirmaciones) lineas.push(`- ${a.dice} ${cita([a.fuente])}`)
    if (c.resolucion) lineas.push(`- Resolución: ${c.resolucion}`)
    lineas.push('')
  }
  if (t.desconocido?.length) lineas.push('**No se pudo documentar:**', '', ...t.desconocido.map((d) => `- ${d}.`), '')
  return lineas
}

/** El catálogo entero en Markdown. `encabezado` es el texto fijo que va arriba (título y advertencias). */
export function catalogoEnMarkdown(doc, encabezado) {
  const numero = numerar(doc)
  const cita = (ids) => ids.map((id) => `[${numero.get(id)}]`).join(' ')
  const lineas = [encabezado.trimEnd(), '']
  const sistemas = [...new Set(doc.tramos.map((t) => t.sistema))]
  for (const s of sistemas) {
    lineas.push(`## ${s}`, '')
    for (const t of doc.tramos.filter((x) => x.sistema === s)) lineas.push(...seccionDeVia(t, cita))
  }
  if (doc.no_posteriores?.length) {
    lineas.push('## No son posteriores a 1946', '', 'Aparecen en la capa Hoy con nombre de avenida, pero las fuentes las dan por abiertas en 1946 o antes: no entran en el control de ausencia.', '')
    for (const n of doc.no_posteriores) lineas.push(`- **${n.nombre}.** ${n.dice} ${n.cita} ${cita(n.fuentes)}`)
    lineas.push('')
  }
  lineas.push('## Fuentes', '', '| N.º | Clase | Documento | Enlace |', '|---:|---|---|---|')
  for (const [id, n] of numero) {
    const f = doc.fuentes[id]
    const cuando = f.fecha_documento ? fecha(f.fecha_documento) : `sin fecha; consultada el ${f.consultada ?? '¿?'}`
    lineas.push(`| ${n} | ${f.clase} | ${cuando} | <${f.url}> |`)
  }
  return lineas.join('\n') + '\n'
}
