/**
 * El buscador, en su parte pura: entender lo que se escribe y ubicarlo en el diccionario de esquinas
 * (tools/geo/esquinas/1936-esquinas.json, leído del plano de 1936; specs/05).
 *
 * En la Caracas vieja las direcciones se dan de esquina a esquina: "De La Torre a Veroes" es la cuadra
 * entre esas dos esquinas; "Esquina de Gradillas", un cruce; "Sociedad a Traposos n.º 12", una casa de esa
 * cuadra. Lo que no se reconoce queda como dirección moderna (la resuelve Nominatim, src/buscador/nominatim.js).
 *
 *   resolver(indice, consulta) → { tipo: 'cuadra' | 'esquina' | 'lugar' | 'moderna' | 'vacia', … }
 *   sugerir(indice, consulta)  → lo que se ofrece mientras se escribe, cada cosa con su resultado
 *
 * Todo en píxeles del plano base; nada de DOM ni de red.
 */

const ARTICULOS = new Set(['la', 'el', 'los', 'las'])
const ABREVIATURAS = Object.freeze({
  sta: 'santa', sto: 'santo', dr: 'doctor', pte: 'puente', esq: 'esquina', av: 'avenida', avda: 'avenida', gral: 'general',
})
/** Lo que separa las dos esquinas de una cuadra: "de X a Y", "entre X y Y", "X con Y". */
const SEPARADORES = Object.freeze(['a', 'y', 'con'])
/** Lo que se dice antes del nombre y no es parte de él: "de", "entre", "en la esquina de"… */
const PREFIJO = /^(?:(?:en|entre|de|desde)|(?:(?:la|las) )?esquinas?)(?: |$)/
const MAX_CONSULTA = 200 // caracteres: más que eso no es una dirección
const MAX_PALABRAS = 16

/**
 * Cuándo dos esquinas son los extremos de una cuadra: están a una distancia de cuadra y no hay una
 * tercera esquina más cerca de las dos que ellas entre sí (con `holgura`: el plano no es un damero
 * perfecto). Eso descarta la diagonal de la manzana y la esquina a dos cuadras sin suponer hacia dónde
 * corren las calles, que fuera del centro giran.
 */
export const ADYACENCIA = Object.freeze({ minM: 15, maxM: 250, holgura: 0.9 })

/** Minúsculas, sin tildes ni signos, espacios simples y abreviaturas abiertas ("Sta." → "santa"). */
export function normalizar(texto) {
  return String(texto ?? '').slice(0, MAX_CONSULTA).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, MAX_PALABRAS)
    .map((p) => ABREVIATURAS[p] ?? p)
    .join(' ')
}

/** La forma en que se compara un nombre: normalizado y sin el artículo inicial ("La Torre" → "torre"). */
export function clave(nombre) {
  const palabras = normalizar(nombre).split(' ')
  return (palabras.length > 1 && ARTICULOS.has(palabras[0]) ? palabras.slice(1) : palabras).join(' ')
}

/** Distancia de edición (cambiar, quitar, agregar o cruzar dos letras vecinas vale 1). */
export function distanciaEdicion(a, b) {
  let anteanterior = null
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const fila = [i]
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      let d = Math.min(anterior[j] + 1, fila[j - 1] + 1, anterior[j - 1] + costo)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, anteanterior[j - 2] + 1)
      fila.push(d)
    }
    anteanterior = anterior
    anterior = fila
  }
  return anterior[b.length]
}

/** Cuántas erratas se perdonan en una palabra de ese largo: ninguna en las muy cortas. */
export const tolerancia = (largo) => (largo < 4 ? 0 : largo < 8 ? 1 : 2)

/** "Sociedad a Traposos n.º 12" → { texto: 'Sociedad a Traposos', numero: '12' }. */
export function separarNumero(consulta) {
  const texto = String(consulta ?? '').slice(0, MAX_CONSULTA).trim()
  const m = /^(.*?\S)[\s,]+(?:(?:n[.º°o]*|nro\.?|n[uú]m(?:ero)?\.?|casa)\s*|#\s*)?(\d{1,5}[a-z]?)$/i.exec(texto)
  return m ? { texto: m[1].replace(/[\s,]+$/, ''), numero: m[2] } : { texto, numero: null }
}

const distancia = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1])
const esPunto = (px) => Array.isArray(px) && px.length === 2 && px.every(Number.isFinite)

/**
 * El índice del diccionario. `lista`: las entradas del JSON ({ nombre, px: [x, y], verificado, notas });
 * `metro` y `plaza`, del plano (ciudad.json); `lugares`: sitios con nombre que no son esquinas
 * ({ id, nombre, corto, alias: [], px, nace, muere }, los hitos; `corto` es el nombre
 * con artículo, para la prosa). Las entradas sin nombre o sin punto no entran.
 */
export function indexarEsquinas(lista, { metro, plaza, lugares = [] }) {
  const aLaPlaza = (px) => distancia(px, plaza) * metro
  const esquinas = Object.freeze((Array.isArray(lista) ? lista : [])
    .filter((e) => typeof e?.nombre === 'string' && e.nombre.trim() && esPunto(e.px))
    .map((e, id) => Object.freeze({
      tipo: 'esquina', id, nombre: e.nombre.trim(), claves: Object.freeze([clave(e.nombre)]), px: Object.freeze([...e.px]),
      verificado: e.verificado === true, aLaPlaza: aLaPlaza(e.px),
    })))
  const sitios = Object.freeze(lugares.filter((l) => l?.nombre && esPunto(l.px)).map((l) => Object.freeze({
    tipo: 'lugar', id: l.id, nombre: l.nombre, claves: Object.freeze([...new Set([l.nombre, ...(l.alias ?? [])].map(clave))]),
    px: Object.freeze([...l.px]), nace: l.nace ?? 0, muere: l.muere ?? 0, corto: l.corto ?? l.nombre, aLaPlaza: aLaPlaza(l.px),
  })))
  // por clave, las esquinas antes que los lugares y, entre iguales, la más cercana a la plaza
  const entradas = [...esquinas, ...sitios].sort((a, b) => (a.tipo === b.tipo ? a.aLaPlaza - b.aLaPlaza : a.tipo === 'esquina' ? -1 : 1))
  const porClave = new Map()
  for (const e of entradas) for (const k of e.claves) porClave.set(k, [...(porClave.get(k) ?? []), e])

  const metros = (a, b) => distancia(a.px, b.px) * metro
  const sonVecinas = (a, b) => {
    const d = metros(a, b)
    if (d < ADYACENCIA.minM || d > ADYACENCIA.maxM) return false
    const tope = d * ADYACENCIA.holgura
    return !esquinas.some((c) => c !== a && c !== b && metros(a, c) < tope && metros(b, c) < tope)
  }
  const vecinasDe = esquinas.map((a) => Object.freeze(esquinas.filter((b) => b !== a && sonVecinas(a, b))))

  return Object.freeze({
    metro, plaza: Object.freeze([...plaza]), esquinas, lugares: sitios, entradas: Object.freeze(entradas), porClave,
    /** Las esquinas a una cuadra de `a`. */
    vecinas: (a) => vecinasDe[a.id] ?? [],
    metros,
  })
}

/**
 * Las entradas que se llaman así: `{ entradas, exacta, ambigua }` o null. Primero la clave exacta; si no, la
 * más parecida dentro de la tolerancia. Si dos nombres distintos quedan igual de cerca ("tore": ¿Torre o
 * Toro?) no se adivina: null, salvo con `conEmpates`, que los devuelve todos para que decida el contexto.
 */
export function buscarNombre(indice, texto, { soloEsquinas = false, conEmpates = false } = {}) {
  const escrito = normalizar(texto)
  const k = clave(texto)
  if (!k) return null
  const sirve = (e) => !soloEsquinas || e.tipo === 'esquina'
  const elegir = (lista, exacta) => {
    const validas = lista.filter(sirve)
    if (!validas.length) return null
    // "El Rosario" y "Rosario" comparten clave: si lo escrito coincide con artículo y todo, gana ese
    const literales = validas.filter((e) => normalizar(e.nombre) === escrito)
    return { entradas: literales.length ? literales : validas, exacta, ambigua: false }
  }
  const exactas = elegir(indice.porClave.get(k) ?? [], true)
  if (exactas) return exactas
  let mejor = { d: Infinity, claves: [] }
  for (const [otra, lista] of indice.porClave) {
    const permitido = tolerancia(Math.min(k.length, otra.length))
    if (!permitido || Math.abs(otra.length - k.length) > permitido || !lista.some(sirve)) continue
    const d = distanciaEdicion(k, otra)
    if (d > permitido || d > mejor.d) continue
    mejor = d < mejor.d ? { d, claves: [otra] } : { d, claves: [...mejor.claves, otra] }
  }
  if (mejor.claves.length === 1) return elegir(indice.porClave.get(mejor.claves[0]), false)
  if (!mejor.claves.length || !conEmpates) return null
  return { entradas: mejor.claves.flatMap((c) => indice.porClave.get(c).filter(sirve)), exacta: false, ambigua: true }
}

const sinPrefijos = (n) => {
  let resto = n
  for (let i = 0; i < 4 && PREFIJO.test(resto); i++) resto = resto.replace(PREFIJO, '')
  return resto
}

/** Hacia dónde se camina de `a` a `b` (píxeles: x al este, y al sur). */
const hacia = (a, b) => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'este' : 'oeste') : (dy > 0 ? 'sur' : 'norte')
}

const resultadoEsquina = (indice, esquina, numero = null, exacta = true) => Object.freeze({
  tipo: 'esquina', esquina, px: esquina.px, numero, exacta,
  otras: Object.freeze((indice.porClave.get(esquina.claves[0]) ?? []).filter((e) => e !== esquina && e.tipo === 'esquina' && e.nombre === esquina.nombre)),
})

const resultadoLugar = (lugar) => Object.freeze({ tipo: 'lugar', lugar, px: lugar.px })

const resultadoCuadra = (indice, a, b, numero = null, exacta = true) => Object.freeze({
  tipo: 'cuadra', a, b, numero, exacta,
  adyacentes: indice.vecinas(a).includes(b),
  largo: indice.metros(a, b),
  hacia: hacia(a.px, b.px),
  px: Object.freeze([(a.px[0] + b.px[0]) / 2, (a.px[1] + b.px[1]) / 2]),
})

const resultadoDe = (indice, entrada, numero, exacta) => (
  entrada.tipo === 'lugar' ? resultadoLugar(entrada) : resultadoEsquina(indice, entrada, numero, exacta))

/** Entre las esquinas que se llaman como cada lado, el par que es una cuadra; si no hay, el más cercano. */
function mejorPar(indice, izquierdas, derechas) {
  let mejor = null
  for (const a of izquierdas) {
    for (const b of derechas) {
      const par = { a, b, vecinas: indice.vecinas(a).includes(b), d: indice.metros(a, b) }
      if (!mejor || (par.vecinas && !mejor.vecinas) || (par.vecinas === mejor.vecinas && par.d < mejor.d)) mejor = par
    }
  }
  return mejor
}

/** Todas las maneras de partir las palabras en dos lados por un separador, con lo que se sabe de cada lado. */
function particiones(indice, palabras) {
  const lados = []
  palabras.forEach((p, i) => {
    if (i === 0 || i === palabras.length - 1 || !SEPARADORES.includes(p)) return
    const [izq, der] = [palabras.slice(0, i), palabras.slice(i + 1)].map((l) => sinPrefijos(l.join(' ')))
    const [a, b] = [izq, der].map((l) => buscarNombre(indice, l, { soloEsquinas: true, conEmpates: true }))
    const par = a && b ? mejorPar(indice, a.entradas, b.entradas) : null
    // una errata que puede ser dos esquinas solo se acepta si con una de ellas sale una cuadra de verdad
    const dudosa = (a?.ambigua || b?.ambigua) && !par?.vecinas
    lados.push({ separador: p, izq, der, a: a?.ambigua ? null : a, b: b?.ambigua ? null : b, par: dudosa ? null : par, exactas: (a?.exacta ? 1 : 0) + (b?.exacta ? 1 : 0) })
  })
  return lados
}

/** Entiende una consulta. Ver la gramática en specs/05. */
export function resolver(indice, consulta) {
  const { texto, numero } = separarNumero(consulta)
  const n = sinPrefijos(normalizar(texto.replace(/\s[-–—]\s/g, ' a ')))
  if (!n) return { tipo: 'vacia' }
  const entero = buscarNombre(indice, n)
  if (entero?.exacta) return resultadoDe(indice, entero.entradas[0], numero, true)

  const lados = particiones(indice, n.split(' '))
  const [mejor] = lados.filter((l) => l.par).sort((p, q) => q.exactas - p.exactas)
  if (mejor) {
    const { par, exactas } = mejor
    return par.a === par.b ? resultadoEsquina(indice, par.a, numero, exactas === 2) : resultadoCuadra(indice, par.a, par.b, numero, exactas === 2)
  }
  if (entero) return resultadoDe(indice, entero.entradas[0], numero, false)

  // "de X a Y" con un solo lado conocido: se busca como dirección moderna, pero se puede decir qué falta
  const medio = lados.find((l) => l.separador === 'a' && (l.a?.exacta || l.b?.exacta))
  const parcial = medio
    ? Object.freeze({ conocida: (medio.a?.exacta ? medio.a : medio.b).entradas[0], desconocida: medio.a?.exacta ? medio.der : medio.izq })
    : null
  return { tipo: 'moderna', texto: String(consulta).slice(0, MAX_CONSULTA).trim(), parcial }
}

/** Qué tan bien empieza `nombre` como lo escrito: 0 igual, 1 empieza así, 2 una palabra empieza así, 3 se parece; null no. */
function rango(nombre, escrito) {
  if (nombre === escrito) return 0
  if (nombre.startsWith(escrito)) return 1
  if (nombre.includes(` ${escrito}`)) return 2
  const permitido = tolerancia(escrito.length)
  return permitido && distanciaEdicion(escrito, nombre.slice(0, escrito.length)) <= permitido ? 3 : null
}

const rangoDe = (entrada, escrito) => entrada.claves.map((k) => rango(k, escrito)).filter((r) => r !== null).sort()[0] ?? null
const porRango = (p, q) => p.rango - q.rango || p.orden - q.orden || p.texto.localeCompare(q.texto, 'es')

const cuadrasDe = (indice, a, filtro = '') => indice.vecinas(a)
  .map((b) => ({ b, rango: filtro ? rangoDe(b, filtro) : 0 }))
  .filter((c) => c.rango !== null)
  .map(({ b, rango: r }) => ({ tipo: 'cuadra', texto: `De ${a.nombre} a ${b.nombre}`, rango: r, orden: a.aLaPlaza, resultado: resultadoCuadra(indice, a, b) }))

/**
 * Lo que se ofrece mientras se escribe: `[{ tipo, texto, resultado }]`, primero lo que empieza como lo
 * escrito, después lo que tiene una palabra que empieza así y al final lo parecido. Con "X a …" (y X una
 * esquina), las cuadras que salen de X.
 */
export function sugerir(indice, consulta, max = 8) {
  const crudo = normalizar(separarNumero(consulta).texto)
  const n = sinPrefijos(crudo)
  if (!n) return []
  const limpiar = (lista) => lista.sort(porRango).slice(0, max).map(({ tipo, texto, resultado }) => ({ tipo, texto, resultado }))

  // "la torre a ve": la izquierda ya es una esquina; se completan sus cuadras
  const palabras = `${n}${/\s$/.test(String(consulta)) ? ' ' : ''}`.split(' ')
  for (let i = palabras.length - 1; i > 0; i--) {
    if (palabras[i] !== 'a') continue
    const izq = buscarNombre(indice, palabras.slice(0, i).join(' '), { soloEsquinas: true })
    if (!izq?.exacta) continue
    const filtro = clave(sinPrefijos(palabras.slice(i + 1).join(' ')))
    const cuadras = izq.entradas.flatMap((a) => cuadrasDe(indice, a, filtro))
    if (cuadras.length) return limpiar(cuadras)
  }

  const nombres = indice.entradas
    .map((e) => ({ e, rango: rangoDe(e, clave(n)) }))
    .filter((s) => s.rango !== null)
    .map(({ e, rango: r }) => ({ tipo: e.tipo, texto: e.nombre, rango: r, orden: e.aLaPlaza, resultado: resultadoDe(indice, e, null, true) }))
    .sort(porRango)
  // la esquina ya está completa: también sus cuadras
  const completa = nombres[0]?.rango === 0 && nombres[0].tipo === 'esquina' ? nombres.filter((s) => s.rango === 0 && s.tipo === 'esquina') : []
  const cuadras = completa.flatMap((s) => cuadrasDe(indice, s.resultado.esquina).map((c) => ({ ...c, rango: 0.5 })))
  return limpiar([...nombres, ...cuadras])
}
