export const meta = {
  name: 'diagnostico-epocas',
  description: 'T82: diagnóstico (o cierre) de las reglas de construcción en cada época: medición, revisión visual, verificación y tareas',
  phases: [{ title: 'Revisar' }, { title: 'Verificar' }, { title: 'Planificar' }, { title: 'Consolidar' }],
}
// Argumentos (los prepara Claude antes de correrlo; specs/reglas/workflows/README.md):
// { modo: 'diagnostico' | 'cierre',
//   epocas: [{ indice, año, capturas: [rutas png], original: ruta de vista.jpg del plano de la época (o null en 1936),
//              medicion: ruta de specs/reglas/medicion-<año>.json (o null si F1 aún no existe) }] }
// Devuelve { epocas: [{ año, hallazgos, confirmados, tareas | cierre }], tareas_comunes }.
const modo = args?.modo ?? 'diagnostico'
const epocas = args?.epocas ?? []
const REGLAS = 'R1 una fila por frente; R2 calles libres; R3 casas alineadas y paralelas a su calle; R4 calles con su ancho; R5 fachada solo a la calle (al patio, corredor y una puerta; medianeras ciegas); R6 casas por cuadra de su época; R7 lo edificado sigue al plano; R8 suelo coherente (patios solo dentro de casas, sin suelo urbano sin ciudad, borde sin escalones); R9 cada nombre en su lugar; R10 agua continua; R11 sin anacronismos; R12 las otras épocas intactas'
const HALLAZGOS = {
  type: 'object', required: ['hallazgos'],
  properties: { hallazgos: { type: 'array', items: { type: 'object', required: ['id', 'regla', 'captura', 'donde', 'que_se_ve', 'gravedad'],
    properties: { id: { type: 'string' }, regla: { type: 'string' }, captura: { type: 'string' }, donde: { type: 'string' },
      que_se_ve: { type: 'string' }, contra_el_original: { type: 'string' }, gravedad: { type: 'string', enum: ['alta', 'media', 'baja'] },
      medido: { type: 'string' } } } } },
}
const VEREDICTOS = {
  type: 'object', required: ['veredictos'],
  properties: { veredictos: { type: 'array', items: { type: 'object', required: ['id', 'real', 'motivo'],
    properties: { id: { type: 'string' }, real: { type: 'boolean' }, motivo: { type: 'string' } } } } },
}
const TAREAS = {
  type: 'object', required: ['tareas'],
  properties: { tareas: { type: 'array', items: { type: 'object', required: ['titulo', 'reglas', 'hallazgos', 'causa_probable', 'donde_se_arregla', 'como_se_mide', 'epocas_afectadas'],
    properties: { titulo: { type: 'string' }, reglas: { type: 'array', items: { type: 'string' } }, hallazgos: { type: 'array', items: { type: 'string' } },
      causa_probable: { type: 'string' }, donde_se_arregla: { type: 'string' }, como_se_mide: { type: 'string' },
      epocas_afectadas: { type: 'array', items: { type: 'string' } }, necesita_investigacion: { type: 'string' },
      depende_de: { type: 'array', items: { type: 'string' } } } } } },
}
const CIERRE = {
  type: 'object', required: ['reglas'],
  properties: { reglas: { type: 'array', items: { type: 'object', required: ['regla', 'cierra', 'evidencia'],
    properties: { regla: { type: 'string' }, cierra: { type: 'boolean' }, evidencia: { type: 'string' }, limites: { type: 'string' } } } } },
}
const contexto = (e) => `Proyecto /disco/dev/caracas, mapa 3D de Caracas por épocas. Las reglas de construcción están en specs/13-reglas-de-construccion.md (léelo primero: ${REGLAS}). Época ${e.año} (índice ${e.indice}). ${e.año === 1936 ? 'En 1936 no se aplican R1 ni R6 (sus casas son las del plano).' : ''}
Capturas del sitio (míralas todas con Read): ${e.capturas.join(', ')}.
Plano original de la época: ${e.original ?? 'no aplica'}. Medición de las puertas: ${e.medicion ?? 'todavía no existe (F1)'}.`
const revisar = (e) => agent(`${contexto(e)}

Revisión visual adversarial: busca TODO lo que viola una regla en estas capturas. Compara con el plano original (qué manzanas están edificadas, dónde hay campo, ríos, plazas) y entre capturas. Para cada hallazgo: regla, captura, dónde (zona y descripción para encontrarlo), qué se ve, qué dice el original y la gravedad. Si la medición existe, cita la cifra de la puerta que lo confirma. No reportes gustos: solo lo que rompe una regla.`,
  { label: `revisar:${e.año}`, phase: 'Revisar', schema: HALLAZGOS })
const verificar = (r, e) => agent(`${contexto(e)}

Otro revisor encontró esto: ${JSON.stringify(r?.hallazgos ?? [], null, 1)}

Para cada hallazgo, mira de nuevo la captura y el original e intenta REFUTARLO: ¿se ve de verdad?, ¿rompe la regla que dice o es una lectura equivocada (sombra, rótulo, perspectiva, algo que el original sí dibuja)? Ante la duda, real=false.`,
  { label: `verificar:${e.año}`, phase: 'Verificar', schema: VEREDICTOS })
  .then((v) => { const reales = new Set((v?.veredictos ?? []).filter((x) => x.real).map((x) => x.id))
    return { año: e.año, hallazgos: r?.hallazgos ?? [], confirmados: (r?.hallazgos ?? []).filter((h) => reales.has(h.id)) } })
const planificar = (d, e) => modo === 'cierre'
  ? agent(`${contexto(e)}

Cierre de la época: hallazgos visuales confirmados que siguen abiertos: ${JSON.stringify(d.confirmados, null, 1)}. Con la medición y los límites registrados (specs/reglas/limites-${e.año}.json si existe), di para cada regla R1–R12 si cierra, con la evidencia.`,
    { label: `cierre:${e.año}`, phase: 'Planificar', schema: CIERRE }).then((c) => ({ ...d, cierre: c?.reglas ?? [] }))
  : agent(`${contexto(e)}

Hallazgos confirmados: ${JSON.stringify(d.confirmados, null, 1)}

Convierte cada uno (o cada grupo con la misma causa) en una tarea: título, reglas, hallazgos que resuelve, causa probable (busca en el código del generador: tools/geo/epocas*.py, tools/geo/estilos.py, src/alas.js, src/material.js, src/marcas-datos.js…; cita archivo y función), dónde se arregla, cómo se mide que quedó arreglado, épocas afectadas, si necesita investigación externa antes (specs/13 § 2.1) y de qué otra tarea depende.`,
    { label: `planificar:${e.año}`, phase: 'Planificar', schema: TAREAS }).then((t) => ({ ...d, tareas: t?.tareas ?? [] }))
const resultados = (await pipeline(epocas, revisar, verificar, planificar)).filter(Boolean)
if (modo === 'cierre') return { epocas: resultados }
phase('Consolidar')
const comunes = await agent(`Tareas de T82 por época (specs/13): ${JSON.stringify(resultados.map((r) => ({ año: r.año, tareas: r.tareas })), null, 1)}

Junta las que tienen la misma causa en el generador (un arreglo que sirve a varias épocas es una sola tarea), ordénalas por dependencia (primero investigación, luego puertas, luego el generador, luego lo puntual) y numéralas T82.N. Cada una, con las épocas que toca y el tamaño estimado del PR (líneas de código).`,
  { label: 'consolidar', phase: 'Consolidar', schema: TAREAS })
return { epocas: resultados, tareas_comunes: comunes?.tareas ?? [] }
