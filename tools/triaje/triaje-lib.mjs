/**
 * Las revisiones del estándar de calidad de las contribuciones (specs/09-estandar-de-calidad.md § 5).
 * Funciones puras sobre lo que devuelve la API de GitHub; triaje.mjs lo busca y aplica el resultado.
 * Nada de aquí lee la red ni corre código del PR. Solo la biblioteca estándar.
 *
 * Un PR: { numero, titulo, cuerpo, autor, tipoAutor, asociacion, etiquetas[], sha, borrador }.
 * Sus hechos: { archivos: [{ nombre, mas, menos, parche (null si GitHub lo omite), antes }],
 *   issues: [{ numero, etiquetas[] }] (los que cierra), otrosPrsAbiertos }.
 * Cada revisión: { nombre, paso, motivos[], omitida }.
 */

export const MARCA = '<!-- triaje-calidad -->'
export const TIPOS = new Set(['fix', 'feat', 'refactor', 'docs', 'test', 'chore', 'perf', 'ci'])
/** Las revisiones del contenido de la descripción: las que salta un PR exento. */
export const DE_CONTENIDO = new Set(['issue', 'plantilla', 'prueba-a-mano', 'capturas', 'fuentes', 'rendimiento', 'fix-con-test', 'plan'])

const VALLA = /^ {0,3}(`{3,}|~{3,})(.*)$/
const COMENTARIO = /<!--[\s\S]*?-->/g
const PASO = /^\s{0,3}\d+[.)](\s+|$)/
const TIPO_EN_TITULO = /^\s*([a-z]+)(\([^)]*\))?!?:/
const TEST_JS = /^\+\s*(it|test)(\.\w+)?\(/
const TEST_PY = /^\+\s*def test_/
const IMAGEN = /!\[[^\]]*\]\([^)\s]+[^)]*\)|<img\s[^>]*src=/gi
const ENLACE = /https?:\/\/\S+/
const MAIN = /(^|[^\w-])main([^\w-]|$)/i
const TAREA = /\bT\d+[a-z]?(\.\d+[a-z]?)?\b/

const revision = (nombre, motivos = []) => ({ nombre, paso: motivos.length === 0, motivos, omitida: false })
const omitir = (r) => ({ ...r, paso: true, motivos: [], omitida: true })

// --- Markdown ------------------------------------------------------------------------------------------

/** ¿Abre la línea un bloque de código? Su valla, o null (CommonMark: la de comillas no lleva comillas). */
function abreValla(linea) {
  const m = VALLA.exec(linea)
  if (!m || (m[1][0] === '`' && m[2].includes('`'))) return null
  return m[1]
}
const cierraValla = (linea, valla) => linea.trim().startsWith(valla) && new Set(linea.trim()).size === 1

/** Cada título de exactamente `nivel` y el texto debajo (si se repite, gana el primero). */
export function secciones(texto, nivel = 2) {
  const prefijo = '#'.repeat(nivel) + ' '
  const salida = {}
  let nombre = null, buf = [], valla = null
  const cerrar = () => { if (nombre !== null && !(nombre in salida)) salida[nombre] = buf.join('\n') }
  for (const linea of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (valla) { if (cierraValla(linea, valla)) valla = null; buf.push(linea); continue }
    valla = abreValla(linea)
    if (!valla && linea.startsWith(prefijo)) {
      cerrar()
      nombre = linea.slice(prefijo.length).trim()
      buf = []
    } else buf.push(linea)
  }
  cerrar()
  return salida
}

/** El texto sin comentarios HTML, sin líneas vacías ni espacios alrededor. */
export const normalizar = (texto) =>
  texto.replace(COMENTARIO, '').split('\n').map((l) => l.trim()).filter(Boolean).join('\n')

/** Texto en minúsculas sin marcas de énfasis ni de código. */
const llano = (texto) => texto.replace(/[*_`]/g, '').toLowerCase()

/** Texto ajeno como código Markdown del que no puede salir (sin comillas invertidas ni saltos: un @nombre suelto avisaría a alguien). */
export function codigo(valor, limite = 40) {
  let t = String(valor).replace(/[`\r\n]/g, "'")
  if (t.length > limite) t = t.slice(0, limite - 1) + '…'
  return `\`${t || ' '}\``
}

/** Cada sección ## de la plantilla con su texto de relleno, normalizado. */
export const seccionesDePlantilla = (plantilla) =>
  Object.fromEntries(Object.entries(secciones(plantilla)).map(([k, v]) => [k, normalizar(v)]))

/** Los pasos numerados, cada uno con sus líneas de continuación. */
export function pasos(texto) {
  const salida = []
  for (const linea of normalizar(texto).split('\n')) {
    if (PASO.test(linea)) salida.push(linea)
    else if (salida.length && linea) salida[salida.length - 1] += '\n' + linea
  }
  return salida
}

/** El tipo declarado en la sección Tipo o, si no, el prefijo convencional del título. */
export function tipoDelPR(s, titulo) {
  const palabra = normalizar(s.Tipo ?? '').split(/\s+/)[0]?.replace(/[`*_]/g, '').toLowerCase()
  if (TIPOS.has(palabra)) return palabra
  const m = TIPO_EN_TITULO.exec(titulo.toLowerCase())
  return m && TIPOS.has(m[1]) ? m[1] : null
}

/** ¿Está el archivo en alguna de las rutas? «dir/» y «algo*» son prefijos, «.ext» una terminación, lo demás exacto. */
const enRutas = (nombre, rutas) => rutas.some((r) =>
  r.endsWith('/') ? nombre.startsWith(r)
    : r.endsWith('*') ? nombre.startsWith(r.slice(0, -1))
      : r.startsWith('.') ? nombre.endsWith(r) : nombre === r)
const esTest = (nombre) => nombre.startsWith('tests/') || nombre.startsWith('tools/geo/tests/')

const subseccion = (s, padre, nombre) => secciones(s[padre] ?? '', 3)[nombre] ?? ''

// --- Revisiones ----------------------------------------------------------------------------------------

export function revisarIssue(hechos, cfg) {
  const aceptado = cfg.etiquetas.aceptado
  return revision('issue', hechos.issues.some((i) => i.etiquetas.includes(aceptado)) ? [] : ['No hay un issue aceptado enlazado'])
}

export function revisarPlantilla(s, plantilla) {
  return revision('plantilla', Object.entries(plantilla)
    .filter(([nombre, relleno]) => !(nombre in s) || ['', relleno].includes(normalizar(s[nombre])))
    .map(([nombre]) => `Falta la sección \`${nombre}\` o está vacía`))
}

export function revisarPruebaAMano(s, esFix) {
  const lista = pasos(subseccion(s, 'Prueba a mano', 'Pasos'))
  const motivos = []
  if (lista.length < 2) motivos.push('Prueba a mano: **Pasos** necesita al menos 2 pasos numerados')
  lista.forEach((p, i) => { if (!/\bse ve\s*:/.test(llano(p))) motivos.push(`Prueba a mano: el paso ${i + 1} no tiene una línea \`Se ve:\``) })
  if (esFix && !lista.some((p) => llano(p).includes('(falla en main)'))) motivos.push('Prueba a mano: ningún paso está marcado `(falla en main)`')
  if (!lista.some((p) => /regresi[oó]n/.test(llano(p)))) motivos.push('Prueba a mano: ningún paso es de regresión (algo vecino que sigue igual que en main)')
  return revision('prueba-a-mano', motivos)
}

/** Si el diff cambia lo que se ve, la comparación: captura de antes (main) y de después, sea fix o mejora. */
export function revisarCapturas(s, archivos, cfg) {
  const seVe = (n) => !esTest(n) && enRutas(n, cfg.rutas.visuales) && !enRutas(n, cfg.rutas.no_visuales ?? [])
  if (!archivos.some((a) => seVe(a.nombre))) return revision('capturas')
  const hay = (subseccion(s, 'Prueba a mano', 'Capturas').replace(COMENTARIO, '').match(IMAGEN) ?? []).length
  if (hay >= 2) return revision('capturas')
  return revision('capturas', [`Capturas: el PR cambia lo que se ve; lleva captura de antes (main) y de después (esta rama), misma vista y época (trae ${hay})`])
}

export function revisarFuentes(s, archivos, cfg) {
  if (!archivos.some((a) => enRutas(a.nombre, cfg.rutas.historicas))) return revision('fuentes')
  return revision('fuentes', ENLACE.test(normalizar(s.Fuentes ?? '')) ? [] : ['Fuentes: el PR toca datos históricos y no enlaza ninguna fuente'])
}

/** Las claves de los topes de `tools/rendimiento/presupuesto.json` en la configuración: una sola lista, la del presupuesto. */
export const conClavesDeRendimiento = (cfg, presupuesto) => ({ ...cfg, claves_rendimiento: Object.keys(presupuesto.topes ?? {}) })

/** Si el diff toca lo que cuesta (carga, geometría, shaders, texturas), la medición de main y la de la rama (specs/10 § 3). */
export function revisarRendimiento(s, archivos, cfg) {
  if (!archivos.some((a) => !esTest(a.nombre) && enRutas(a.nombre, cfg.rutas.rendimiento))) return revision('rendimiento')
  const texto = (s.Rendimiento ?? '').replace(COMENTARIO, '')
  const mide = cfg.claves_rendimiento.some((clave) => texto.includes(clave)) && MAIN.test(texto)
  return revision('rendimiento', mide ? [] : ['Rendimiento: el PR toca la carga, la geometría, los shaders o las texturas; pega la medición de `main` y la de esta rama (`tests/e2e/medir-rendimiento.mjs`)'])
}

export function revisarFixConTest(archivos, esFix) {
  if (!esFix) return revision('fix-con-test')
  const deTest = archivos.filter((a) => esTest(a.nombre))
  // GitHub omite el parche de un archivo grande: ahí no se puede descartar un test
  const agrega = deTest.some((a) => a.parche === null
    || a.parche.split('\n').some((l) => TEST_JS.test(l) || TEST_PY.test(l)))
  return revision('fix-con-test', agrega ? [] : ['Un fix necesita un test de regresión en tests/ (o en tools/geo/tests/)'])
}

export function revisarPlan(s, archivos, cfg) {
  const tarea = TAREA.exec(normalizar(s['Issue o tarea'] ?? ''))
  if (!tarea || archivos.some((a) => a.nombre === cfg.rutas.plan)) return revision('plan')
  return revision('plan', [`Plan: el PR es de la tarea ${codigo(tarea[0])} y no actualiza su fila en \`${cfg.rutas.plan}\``])
}

/** Líneas de código cambiadas: sin tests, specs, markdown ni lo que la configuración deja afuera. */
const lineasDeCodigo = (archivos, cfg) => archivos
  .filter((a) => !a.nombre.endsWith('.md') && !enRutas(a.nombre, cfg.limites.fuera_del_tamano))
  .reduce((n, a) => n + a.mas + a.menos, 0)

export function revisarTamano(archivos, primeraVez, cfg) {
  const lineas = lineasDeCodigo(archivos, cfg)
  const { max_lineas_codigo: max, max_lineas_primer_pr: maxPrimero } = cfg.limites
  if (lineas > max) return revision('tamano', [`Un PR tiene hasta ${max} líneas de código cambiadas, sin tests ni documentación (este, ${lineas}); divídelo en tareas (AGENTS.md § Tamaño de los PRs)`])
  if (primeraVez && lineas > maxPrimero) return revision('tamano', [`Un primer PR tiene hasta ${maxPrimero} líneas de código cambiadas (este, ${lineas}); divídelo o acuerda el alcance en el issue`])
  return revision('tamano')
}

export function revisarPrsAbiertos(otros, primeraVez, cfg) {
  if (!primeraVez || otros <= cfg.limites.max_prs_abiertos_nuevo) return revision('prs-abiertos')
  return revision('prs-abiertos', ['Espera a que se revise tu otro PR abierto'])
}

// --- Evaluación ----------------------------------------------------------------------------------------

const esBot = (pr, cfg) => pr.tipoAutor === 'Bot' || cfg.autores.bots.includes(pr.autor)

/** Por qué se salta el contenido, o null. Un renombre cuenta con sus dos nombres: pasar código a .md lo borra.
 * La etiqueta va primero: es la decisión explícita de quien mantiene y también salta `fuentes` (§ 5.3). */
function exencion(pr, hechos, cfg) {
  if (pr.etiquetas.includes(cfg.etiquetas.exento)) return `etiqueta ${cfg.etiquetas.exento}`
  const nombres = hechos.archivos.flatMap((a) => [a.nombre, a.antes]).filter(Boolean)
  if (nombres.length && nombres.every((n) => n.endsWith('.md'))) return 'solo markdown'
  return null
}

export function evaluar(pr, hechos, cfg, plantilla) {
  const cuerpo = new TextDecoder().decode(new TextEncoder().encode(pr.cuerpo).slice(0, cfg.limites.max_bytes_descripcion))
  const s = secciones(cuerpo)
  const esFix = tipoDelPR(s, pr.titulo) === 'fix'
  const primeraVez = cfg.autores.primera_vez.includes(pr.asociacion)
  const todas = [
    revisarIssue(hechos, cfg),
    revisarPlantilla(s, plantilla),
    revisarPruebaAMano(s, esFix),
    revisarCapturas(s, hechos.archivos, cfg),
    revisarFuentes(s, hechos.archivos, cfg),
    revisarRendimiento(s, hechos.archivos, cfg),
    revisarFixConTest(hechos.archivos, esFix),
    revisarPlan(s, hechos.archivos, cfg),
    revisarTamano(hechos.archivos, primeraVez, cfg),
    revisarPrsAbiertos(hechos.otrosPrsAbiertos, primeraVez, cfg),
  ]
  const bot = esBot(pr, cfg)
  const exento = bot ? 'bot' : exencion(pr, hechos, cfg)
  const mantiene = cfg.autores.mantenedores.includes(pr.asociacion)
  const revisiones = todas.map((r) => {
    if (bot) return omitir(r)
    // las fuentes se piden siempre: un PR de markdown en fuentes/ también es un dato histórico
    if (exento && DE_CONTENIDO.has(r.nombre) && !(exento === 'solo markdown' && r.nombre === 'fuentes')) return omitir(r)
    if (mantiene && r.nombre === 'issue') return omitir(r) // quien mantiene el repo decide qué entra
    return r
  })
  const motivos = revisiones.flatMap((r) => r.motivos)
  return { revisiones, exento, motivos, ok: motivos.length === 0 }
}

export function comentario(resultado, repo) {
  const estandar = `https://github.com/${repo}/blob/main/CONTRIBUTING.md#el-estándar-de-calidad`
  return [
    MARCA,
    '### Estándar de calidad',
    '',
    `Este PR todavía no cumple el [estándar de calidad](${estandar}):`,
    '',
    ...resultado.motivos.map((m) => `- ${m}`),
    '',
    'Edita la descripción o sube commits y este comentario se actualiza solo; se borra cuando todo pasa.',
    '',
    '<sub>Por ahora solo pone etiquetas: no se cierra nada automáticamente. Quien mantiene el repo revisa cada caso.</sub>',
    '',
  ].join('\n')
}

/** La tabla de cada revisión, para el resumen del job y el check. */
export function resumen(resultado) {
  const filas = ['| revisión | resultado |', '|---|---|',
    ...resultado.revisiones.map((r) => `| \`${r.nombre}\` | ${r.omitida ? 'omitida' : r.paso ? 'pasa' : r.motivos.join('; ')} |`)]
  if (resultado.exento) filas.push('', `Contenido omitido: ${resultado.exento}.`)
  return filas.join('\n')
}
