/**
 * Red vial curada por cortes cartográficos (#269): cada tramo lleva etapas, y cada etapa su ficha de evidencias.
 * No extrapola una geometría entre fechas ni usa OSM como prueba. Lógica pura: no lee archivos ni muta entradas.
 *
 * Una etapa separa tres fechas que no son la misma cosa:
 *  - `anio`: el corte del sitio en el que rige (una de ANIOS_RED);
 *  - la fecha del DOCUMENTO que la acredita (`fuentes[documento].fecha_documento`: cuándo se hizo o publicó);
 *  - la fecha del HECHO (`fecha_hecho`: levantamiento, apertura, reforma…), o null si no se conoce.
 * Y dice cuánto se le cree (`certeza`) y qué fuentes se contradicen sin resolver (`contradicciones`).
 */
export const ANIOS_RED = Object.freeze([1772, 1843, 1889, 1911, 1936, 1946])
export const VERSION_RED = 2
export const SISTEMA_RED = 'mosaico-1936-px'
export const ESTADOS = Object.freeze(['existente', 'obra', 'proyecto', 'ausente', 'desconocido'])
/** documentada: leída sobre el documento de la época · inferida: deducida de otro dato · dudosa: las fuentes no cierran. */
export const CERTEZAS = Object.freeze(['documentada', 'inferida', 'dudosa'])
export const TIPOS_DE_HECHO = Object.freeze(['levantamiento', 'proyecto', 'obra', 'apertura', 'reforma', 'nombre', 'demolicion'])
export const TIPOS_DE_TRAMO = Object.freeze(['calle', 'avenida', 'autopista', 'carretera', 'puente', 'tunel', 'viaducto', 'distribuidor'])
/** Qué parte del tramo cae dentro de la hoja del sitio; «sin medir» mientras nadie lo georreferencie. */
export const ENCUADRES = Object.freeze(['dentro', 'parcial', 'fuera', 'sin medir'])

const ANIO_MIN = 1500
const ANIO_MAX = 2200
const finito = (n) => typeof n === 'number' && Number.isFinite(n)
const punto = (p) => Array.isArray(p) && p.length === 2 && p.every(finito)
const texto = (s) => typeof s === 'string' && s.trim().length > 0
const anio = (n) => Number.isInteger(n) && n >= ANIO_MIN && n <= ANIO_MAX
const exigir = (ok, mensaje) => { if (!ok) throw new Error(mensaje) }

/** Un intervalo de años {desde, hasta}; null es «no se conoce» y hay que escribirlo. */
function validarIntervalo(f, donde) {
  if (f === null) return
  exigir(f && anio(f.desde) && anio(f.hasta) && f.desde <= f.hasta, `${donde}: fecha inválida (se espera {desde, hasta} o null)`)
}

function validarFuente(id, f) {
  exigir(['historica', 'actual'].includes(f?.tipo) && Array.isArray(f.anios) && f.anios.every((a) => ANIOS_RED.includes(a)), `fuente ${id}: tipo/años inválidos`)
  exigir(typeof f.url === 'string' && /^https:\/\//.test(f.url) && URL.canParse(f.url), `fuente ${id}: URL inválida`)
  exigir(f.fecha_documento !== undefined, `fuente ${id}: falta fecha_documento (null si no se conoce)`)
  validarIntervalo(f.fecha_documento, `fuente ${id}, fecha_documento`)
  if (f.fecha_representada !== undefined) validarIntervalo(f.fecha_representada, `fuente ${id}, fecha_representada`)
}

/** Dos o más afirmaciones enfrentadas, cada una con su fuente. Una resuelta dice cómo se resolvió. */
function validarContradicciones(lista, fuentes, donde) {
  exigir(Array.isArray(lista), `${donde}: faltan contradicciones (lista vacía si no hay)`)
  for (const c of lista) {
    exigir(texto(c?.asunto), `${donde}: contradicción sin asunto`)
    exigir(Array.isArray(c.afirmaciones) && c.afirmaciones.length >= 2, `${donde}: una contradicción enfrenta al menos dos afirmaciones`)
    for (const a of c.afirmaciones) exigir(texto(a?.dice) && fuentes[a.fuente], `${donde}: afirmación sin texto o con fuente ausente`)
    exigir(['pendiente', 'resuelta'].includes(c.estado), `${donde}: contradicción sin estado (pendiente o resuelta)`)
    if (c.estado === 'resuelta') exigir(texto(c.resolucion), `${donde}: contradicción resuelta sin resolución`)
  }
}

function validarGeometria(e, donde) {
  const medible = e.medible !== false
  if ((e.estado === 'existente' && medible) || e.puntos !== undefined) {
    exigir(Array.isArray(e.puntos) && e.puntos.length >= 2 && e.puntos.every(punto), `${donde}: coordenadas inválidas`)
    exigir(e.puntos.some((p) => p[0] !== e.puntos[0][0] || p[1] !== e.puntos[0][1]), `${donde}: tramo de longitud cero`)
  }
  exigir(e.ancho_m === null || (finito(e.ancho_m) && e.ancho_m > 0), `${donde}: ancho debe ser positivo o null`)
  exigir(e.error_m === null || (finito(e.error_m) && e.error_m >= 0), `${donde}: error debe ser positivo, cero o null`)
  if (e.medible !== undefined) exigir(typeof e.medible === 'boolean', `${donde}: medible inválido`)
  if (e.recorte !== undefined && e.recorte !== null) {
    const c = e.recorte.caja
    exigir(Array.isArray(c) && c.length === 4 && c.every(finito) && c[0] < c[2] && c[1] < c[3], `${donde}: recorte inválido (caja [x0, y0, x1, y1])`)
  }
}

/** La ficha de evidencias de la etapa: documento, hecho, certeza, nombre y contradicciones. */
function validarEvidencia(e, fuentes, donde) {
  exigir(Array.isArray(e.fuentes) && e.fuentes.length && e.fuentes.every((id) => fuentes[id]), `${donde}: fuente ausente`)
  exigir(e.fuentes.some((id) => fuentes[id].tipo === 'historica' && fuentes[id].anios.includes(e.anio)), `${donde}: sin evidencia histórica para ${e.anio}`)
  const doc = fuentes[e.documento]
  exigir(e.fuentes.includes(e.documento) && doc?.tipo === 'historica' && doc.anios.includes(e.anio), `${donde}: el documento de la etapa debe ser una de sus fuentes históricas de ${e.anio}`)
  exigir(CERTEZAS.includes(e.certeza), `${donde}: certeza inválida`)
  exigir(e.nombre === null || texto(e.nombre), `${donde}: nombre debe ser texto o null (el documento no lo rotula)`)
  exigir(e.fecha_hecho !== undefined, `${donde}: falta fecha_hecho (null si no se conoce)`)
  if (e.fecha_hecho !== null) {
    exigir(TIPOS_DE_HECHO.includes(e.fecha_hecho?.tipo), `${donde}: tipo de hecho inválido`)
    validarIntervalo({ desde: e.fecha_hecho.desde, hasta: e.fecha_hecho.hasta }, `${donde}, fecha_hecho`)
    const tope = doc.fecha_documento?.hasta
    exigir(tope === undefined || e.fecha_hecho.desde <= tope, `${donde}: el hecho (${e.fecha_hecho.desde}) es posterior al documento que lo acredita (${tope})`)
  }
  validarContradicciones(e.contradicciones, fuentes, donde)
}

function validarNombres(t, fuentes, citadas) {
  if (t.nombres !== undefined) exigir(Array.isArray(t.nombres), `${t.id}: «nombres» es una lista`)
  for (const n of t.nombres ?? []) {
    exigir(texto(n?.nombre) && citadas(n.fuentes), `${t.id}: nombre sin texto o sin fuente`)
    for (const k of ['desde', 'hasta']) exigir(n[k] === null || anio(n[k]), `${t.id}: nombre «${n.nombre}» con ${k} inválido (año o null)`)
  }
}

function validarCronologia(t, citadas) {
  if (t.cronologia !== undefined) exigir(Array.isArray(t.cronologia), `${t.id}: «cronologia» es una lista`)
  for (const c of t.cronologia ?? []) {
    exigir(TIPOS_DE_HECHO.includes(c?.tipo) && texto(c.dice), `${t.id}: afirmación de cronología sin tipo o sin texto`)
    exigir(citadas(c.fuentes), `${t.id}: «${c.dice}» no cita ninguna fuente`)
    exigir(CERTEZAS.includes(c.certeza), `${t.id}: «${c.dice}» sin certeza`)
    exigir(c.fecha !== undefined, `${t.id}: «${c.dice}» sin fecha (null si no se conoce)`)
    validarIntervalo(c.fecha, `${t.id}, «${c.dice}»`)
  }
}

/** Lo que un tramo dice de sí mismo fuera de sus etapas: tipo, nombres, cronología con fuente por afirmación. */
function validarFichaDeTramo(t, fuentes) {
  if (t.tipo !== undefined) exigir(TIPOS_DE_TRAMO.includes(t.tipo), `${t.id}: tipo de tramo inválido`)
  if (t.encuadre !== undefined) exigir(ENCUADRES.includes(t.encuadre), `${t.id}: encuadre inválido`)
  if (t.desconocido !== undefined) exigir(Array.isArray(t.desconocido) && t.desconocido.every(texto), `${t.id}: «desconocido» es una lista de textos`)
  if (t.contradicciones !== undefined) validarContradicciones(t.contradicciones, fuentes, t.id)
  const citadas = (ids) => Array.isArray(ids) && ids.length > 0 && ids.every((id) => fuentes[id])
  validarNombres(t, fuentes, citadas)
  validarCronologia(t, citadas)
}

/** ¿Alguna afirmación de la cronología dice que en `a` ya había `tipo` (obra o proyecto)? */
const yaHabia = (t, tipo, a) => (t.cronologia ?? []).some((c) => c.tipo === tipo && c.fecha && c.fecha.desde <= a)

function validarApertura(t, fuentes) {
  if (t.desde === undefined) return
  exigir(anio(t.desde), `${t.id}: apertura inválida`)
  exigir(Array.isArray(t.fuentesCronologia) && t.fuentesCronologia.length && t.fuentesCronologia.every((id) => fuentes[id]?.tipo === 'historica'), `${t.id}: apertura sin fuente histórica`)
  if (t.cronologia !== undefined) {
    exigir(t.cronologia.some((c) => c.tipo === 'apertura' && c.fecha?.desde === t.desde), `${t.id}: «desde» ${t.desde} no coincide con ninguna apertura de su cronología`)
  }
}

function validarEtapa(t, e, fuentes) {
  const donde = t.id
  exigir(ESTADOS.includes(e.estado), `${donde}: estado inválido`)
  validarEvidencia(e, fuentes, donde)
  validarGeometria(e, donde)
  if (t.desde === undefined || e.anio >= t.desde) return
  // Nada se proyecta hacia atrás: antes de su apertura un tramo no existe, y solo está en obra o en proyecto
  // si su propia cronología lo dice para ese año.
  exigir(e.estado !== 'existente', `${donde}: existente antes de su apertura`)
  if (e.estado === 'obra' || e.estado === 'proyecto') exigir(yaHabia(t, e.estado, e.anio), `${donde}: ${e.estado} en ${e.anio} sin cronología que lo acredite`)
}

export function validarRedVial(red) {
  exigir(red?.version === VERSION_RED && red.sistema === SISTEMA_RED, 'versión o sistema de coordenadas no admitido')
  exigir(red.fuentes && typeof red.fuentes === 'object' && !Array.isArray(red.fuentes), 'faltan fuentes')
  exigir(Array.isArray(red.tramos), 'faltan tramos')
  for (const [id, f] of Object.entries(red.fuentes)) validarFuente(id, f)
  const ids = new Set()
  for (const t of red.tramos) {
    exigir(texto(t?.id) && !ids.has(t.id), 'id de tramo repetido o ausente')
    ids.add(t.id)
    exigir(Array.isArray(t.etapas), `${t.id}: faltan etapas`)
    validarFichaDeTramo(t, red.fuentes)
    validarApertura(t, red.fuentes)
    const anios = new Set()
    for (const e of t.etapas) {
      exigir(ANIOS_RED.includes(e.anio) && !anios.has(e.anio), `${t.id}: año no admitido o etapa repetida`)
      anios.add(e.anio)
      validarEtapa(t, e, red.fuentes)
    }
  }
  return red
}

/** En qué lista de la salida cae la etapa. Solo «tramos» es red utilizable. */
function destinoDe(e) {
  if (e.estado === 'ausente') return 'ausentes'
  if (e.estado === 'proyecto') return 'proyectos'
  if (e.estado === 'obra') return 'obras'
  if (e.estado === 'desconocido') return 'pendientes'
  if (e.medible === false) return 'sinMedir'
  return e.certeza === 'documentada' ? 'tramos' : 'inferidos'
}

function tramoDeSalida(t, e, fuentes) {
  return {
    tramo: t.id, tipo: t.tipo ?? null, nombre: e.nombre, puntos: e.puntos.map((p) => [...p]), medible: true,
    ancho_m: e.ancho_m, banda_m: e.error_m, certeza: e.certeza, documento: e.documento,
    fecha_documento: structuredClone(fuentes[e.documento].fecha_documento), fecha_hecho: structuredClone(e.fecha_hecho),
    recorte: structuredClone(e.recorte ?? null), fuentes: [...e.fuentes], procedencia: structuredClone(t.procedencia ?? null),
  }
}

/**
 * El corte de un año. `tramos`: existentes, documentados y medibles (lo único utilizable). `inferidos`: existentes de
 * certeza menor, con su geometría, aparte. `sinMedir`: el documento los acredita pero no deja medir un eje.
 * `pendientes`: sin evidencia para ese año (NO son calles ausentes). `ausentes`: el documento o la cronología los niega.
 */
export function redDeEpoca(registro, anioDelCorte) {
  exigir(ANIOS_RED.includes(anioDelCorte), 'época de red no admitida')
  const red = validarRedVial(registro)
  const s = { tramos: [], inferidos: [], sinMedir: [], pendientes: [], ausentes: [], proyectos: [], obras: [], contradicciones: [] }
  for (const t of red.tramos) {
    const e = t.etapas.find((x) => x.anio === anioDelCorte)
    if (!e) {
      const lista = t.desde !== undefined && anioDelCorte < t.desde ? s.ausentes : s.pendientes
      lista.push(t.id)
      continue
    }
    for (const c of e.contradicciones) if (c.estado === 'pendiente') s.contradicciones.push({ tramo: t.id, asunto: c.asunto })
    const destino = destinoDe(e)
    if (destino === 'tramos' || destino === 'inferidos') s[destino].push(tramoDeSalida(t, e, red.fuentes))
    else s[destino].push(t.id)
  }
  return {
    version: VERSION_RED, sistema: red.sistema, año: anioDelCorte,
    alcance: 'Red parcial de evidencia explícita; los pendientes NO son calles ausentes y los inferidos NO son red verificada.',
    fuentes: structuredClone(red.fuentes), ...s,
  }
}

/** Los tramos con apertura posterior al último corte: ninguno puede salir como red en ninguna época del sitio. */
export const posterioresAlUltimoCorte = (red) => red.tramos.filter((t) => t.desde !== undefined && t.desde > ANIOS_RED.at(-1)).map((t) => t.id)

/**
 * La garantía de #277 y #278, sobre las salidas reales: ningún tramo abierto después de un corte aparece en él como
 * red, inferido o sin medir, ni como obra o proyecto que su cronología no acredite. Devuelve las faltas (vacío = se
 * cumple). No se fía del validador: vuelve a mirar cada corte, que es lo que se exporta.
 */
export function proyeccionesIndebidas(registro) {
  const red = validarRedVial(registro), faltas = []
  const conApertura = new Map(red.tramos.filter((t) => t.desde !== undefined).map((t) => [t.id, t]))
  const antesDeAbrir = (id, a) => conApertura.has(id) && a < conApertura.get(id).desde
  for (const a of ANIOS_RED) {
    const corte = redDeEpoca(red, a)
    const vistos = [...corte.tramos.map((t) => t.tramo), ...corte.inferidos.map((t) => t.tramo), ...corte.sinMedir]
    for (const id of vistos) if (antesDeAbrir(id, a)) faltas.push({ tramo: id, año: a, como: 'existente' })
    for (const [lista, tipo] of [[corte.obras, 'obra'], [corte.proyectos, 'proyecto']]) {
      for (const id of lista) if (antesDeAbrir(id, a) && !yaHabia(conApertura.get(id), tipo, a)) faltas.push({ tramo: id, año: a, como: tipo })
    }
  }
  return faltas
}

/** La fuente de un plano del catálogo a partir de su ficha: `año` es el documento; `año_representado`, el hecho. */
export function fuenteDeFicha(ficha, { anios, ruta }) {
  const n = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
  const doc = n(ficha.año), rep = n(ficha.año_representado) ?? doc
  exigir(texto(ficha.url_fuente), `${ruta}: ficha sin url_fuente`)
  exigir(doc === null || anio(doc), `${ruta}: año de la ficha inválido`)
  exigir(rep === null || anio(rep), `${ruta}: año_representado inválido`)
  return {
    tipo: 'historica', anios: [...anios], url: ficha.url_fuente, titulo: ficha.titulo ?? null, ficha: ruta,
    // El documento no puede ser anterior a lo que representa: se hizo entre el levantamiento y su fecha de catálogo.
    fecha_documento: doc === null ? null : { desde: Math.min(doc, rep), hasta: doc },
    fecha_representada: rep === null ? null : { desde: rep, hasta: rep },
    licencia: ficha.licencia ?? null,
  }
}

/** El hecho que acredita un plano en su corte: el levantamiento, en la fecha que representa. */
export function levantamientoDe(fuente) {
  const f = fuente.fecha_representada ?? null
  return f === null ? null : { tipo: 'levantamiento', desde: f.desde, hasta: f.hasta }
}

/** Una etapa leída sobre el plano de su año (`fuentes.plano<año>`); `resto` trae la geometría y lo que cambie. */
export const etapaDePlano = (fuentes, a, resto) => ({
  anio: a, estado: 'existente', certeza: 'documentada', documento: `plano${a}`, fuentes: [`plano${a}`],
  fecha_hecho: levantamientoDe(fuentes[`plano${a}`]), nombre: null, contradicciones: [], ancho_m: null, ...resto,
})

/**
 * Importación sin pérdida de puntos ni tolerancias. El calce en píxeles 1936 NO fecha la calle en 1936.
 * `fuentes` trae al menos plano1772 y plano1936 (fuenteDeFicha). Ningún tramo importado lleva nombre de época:
 * las referencias no transcriben rótulos, y eso queda como `nombre: null`.
 */
export function importarReferencias(ref1772, recuperadas, fuentes) {
  exigir(Array.isArray(ref1772?.tramos) && Array.isArray(recuperadas?.tramos), 'referencias sin tramos')
  exigir(fuentes?.plano1772 && fuentes?.plano1936, 'faltan las fuentes plano1772 y plano1936')
  const tramos = []
  for (const t of ref1772.tramos) {
    exigir(typeof t.medible === 'boolean', `${t.tramo}: medible ausente`)
    tramos.push({
      id: t.tramo, tipo: 'calle',
      procedencia: { archivo: 'tools/geo/referencias/1772-calles-1936.json', sector: t.sector ?? null, identificado: structuredClone(t.identificado ?? []) },
      etapas: [etapaDePlano(fuentes, 1772, { puntos: structuredClone(t.puntos), error_m: t.banda_m ?? null, medible: t.medible })],
    })
  }
  for (const t of recuperadas.tramos) {
    tramos.push({
      id: `recuperado:${t.id}`, tipo: 'calle', nota: t.nota,
      procedencia: { archivo: 'tools/geo/calles-historicas.json', original: structuredClone(t.original ?? null), nota: t.nota ?? null },
      etapas: [1772, 1936].map((a) => etapaDePlano(fuentes, a, { puntos: structuredClone(t.anclajes), error_m: null })),
    })
  }
  const usadas = { plano1772: structuredClone(fuentes.plano1772), plano1936: structuredClone(fuentes.plano1936) }
  return validarRedVial({ version: VERSION_RED, sistema: SISTEMA_RED, fuentes: usadas, tramos })
}

/** Une registros ya válidos. Las fuentes con el mismo id tienen que ser la misma; los tramos no se repiten. */
export function unirRegistros(...registros) {
  const fuentes = {}, tramos = []
  for (const r of registros) {
    for (const [id, f] of Object.entries(r.fuentes)) {
      if (Object.hasOwn(fuentes, id)) exigir(JSON.stringify(fuentes[id]) === JSON.stringify(f), `fuente duplicada ${id}`)
      else fuentes[id] = structuredClone(f)
    }
    tramos.push(...structuredClone(r.tramos))
  }
  return validarRedVial({ version: VERSION_RED, sistema: SISTEMA_RED, fuentes, tramos })
}
