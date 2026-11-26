/**
 * La línea de tiempo: 1578 · 1772 · 1843 · 1889 · 1911 · 1936 (datos/crece.json). Cada casa trae su
 * vida (nace, muere; ver specs/02) y la época elegida llega a cada lugar como una ola desde la plaza.
 * Las funciones puras de acá son el espejo de lo que hace el shader (src/material.js).
 */

/**
 * Época de reserva mientras la línea de tiempo no arrancó (o si crece.json no carga): mayor que todas,
 * así se ve la ciudad final — todo lo que nació y nada de lo que murió.
 */
export const SIN_LINEA_DE_TIEMPO = 99

/**
 * Las olas de época, una por vez: lo que se elige mientras una ola avanza espera a que termine
 * (si no, lo que la ola todavía no alcanzó saltaría de golpe). `lanzar(de, a)` arranca una ola.
 */
export function crearSecuencia(lanzar, inicial = 0) {
  let rige = inicial
  let enCurso = false
  let espera = null
  const arrancar = (a) => {
    if (a === rige) return
    lanzar(rige, a)
    rige = a
    enCurso = true
  }
  return {
    elegir(a) { if (enCurso) espera = a; else arrancar(a) },
    termino() {
      enCurso = false
      if (espera !== null) {
        const a = espera
        espera = null
        arrancar(a)
      }
    },
    /** Revierte una preparación fallida; la siguiente elección puede reintentarse. */
    cancelar(actual) { rige = actual; enCurso = false; espera = null },
    get rige() { return rige },
  }
}

/** ¿La casa se ve en la época e? muere = 0 es "nunca muere". */
export const visibleEn = (nace, muere, e) => nace <= e && (muere === 0 || e < muere)

const suave = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * La época que rige a `dist` metros de la plaza mientras se pasa de la época `de` a la `a`: el frente
 * de la ola (`ola` metros) sale de la plaza; detrás rige `a`, delante `de`, con `ancho` metros de fundido.
 */
export const epocaAqui = ({ de, a, ola, ancho }, dist) => de + (a - de) * suave(0, ancho, ola - dist)

/** Decodifica "desde cuándo" (specs/02): con E etapas la primera vale 1, la última 1/E y "nunca" 0. */
export const desdeCuando = (valor, E) => (valor <= 0 ? Infinity : Math.round(E * (1 - valor)))

/**
 * El valor "desde cuándo" que hay que alcanzar para existir en la época `e` (puede ser fraccionaria, en
 * plena ola): `valor ≥ umbralDesde(e, E)` ⇔ la etapa codificada es ≤ e. Así decide el shader del suelo
 * qué es ciudad y qué sigue siendo campo (crece.png G, src/shader/valle.js).
 */
export const umbralDesde = (e, E) => 1 - (e + 0.5) / E

/**
 * Escala de la hoja (0–1) a crece.png (0–1): la imagen tiene `cols × rows` celdas de `celdaM` metros
 * desde la esquina noroeste; con `metro` m/px, la hoja de `ancho × alto` px ocupa solo parte de ella.
 */
export const escalaCrece = ({ ancho, alto, metro }, { cols, rows }, celdaM) => {
  const celdaPx = celdaM / metro
  return [ancho / (cols * celdaPx), alto / (rows * celdaPx)]
}

/** Cuánto está en pie una casa en la época (fraccionaria) `e`: sube al nacer, baja al morir. */
export function vivo(nace, muere, e) {
  const nacio = suave(nace - 0.5, nace, e)
  return muere === 0 ? nacio : nacio * (1 - suave(muere - 0.5, muere, e))
}

/**
 * La botonera de años y el ▶ que los recorre. `alElegir(indice)` mueve la ciudad; `pie` muestra de
 * dónde sale cada época. Devuelve { elegir(indice), get actual }.
 */
/**
 * La primera época que se muestra. La 0 (1578, el esquema de Pimentel) queda fuera de la línea de tiempo:
 * solo dice qué solares tenían casa, no hay ninguna imagen de la ciudad hasta 1812, y lo que se mostraba
 * era más invento que reconstrucción. Sus datos siguen en ciudad.pak (los índices de época no cambian).
 */
export const PRIMERA_EPOCA = 1

/** El índice de época dentro de lo que se muestra: de `desde` a la última. */
export const acotarEpoca = (i, desde, cuantas) => Math.max(desde, Math.min(cuantas - 1, i))

/** El pie de la línea de tiempo (y el párrafo de cada época en el «Acerca»): de qué plano sale ese año. */
export const pieDeEpoca = (e) => `La ciudad hacia ${e.año}, según el ${e.corto}.${e.obras ? ` ${e.obras}` : ''}`

/** `desde`: índice de la primera época con botón; los índices son siempre los de crece.json. */
export function crearLineaDeTiempo({ contenedor, epocas, alElegir, segundosPorEpoca = 4, desde = 0 }) {
  const botones = epocas.map((e, i) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: String(e.año) })
    b.dataset.indice = String(i)
    b.title = `La ciudad hacia ${e.año}: ${e.corto}`
    b.addEventListener('click', () => { parar(); elegir(i) })
    return b
  })
  const andar = Object.assign(document.createElement('button'), { type: 'button', className: 'andar', textContent: '▶' })
  andar.title = `Ver crecer la ciudad, de ${epocas[desde].año} a ${epocas.at(-1).año}`
  andar.setAttribute('aria-label', andar.title)
  const fila = Object.assign(document.createElement('div'), { className: 'años' })
  fila.setAttribute('role', 'group')
  fila.setAttribute('aria-label', 'Línea de tiempo: la ciudad en cada año')
  fila.append(...botones.slice(desde), andar)
  const pie = Object.assign(document.createElement('div'), { className: 'pie' })
  pie.setAttribute('aria-live', 'polite')
  contenedor.replaceChildren(fila, pie)
  contenedor.hidden = false

  let actual = desde
  let reloj = null
  function elegir(i) {
    actual = acotarEpoca(i, desde, epocas.length)
    botones.forEach((b, k) => { b.classList.toggle('on', k === actual); b.setAttribute('aria-pressed', String(k === actual)) })
    const e = epocas[actual]
    pie.textContent = pieDeEpoca(e)
    alElegir(actual)
  }
  function parar() {
    clearInterval(reloj)
    reloj = null
    andar.textContent = '▶'
  }
  /** Arranca el recorrido (si ya anda, sigue): desde el año elegido, o desde el primero si está en el último. */
  function echarAAndar() {
    if (reloj) return
    if (actual === epocas.length - 1) elegir(desde)
    andar.textContent = '❚❚'
    reloj = setInterval(() => (actual < epocas.length - 1 ? elegir(actual + 1) : parar()), segundosPorEpoca * 1000)
  }
  andar.addEventListener('click', () => (reloj ? parar() : echarAAndar()))
  elegir(desde)
  return { elegir, parar, andar: echarAAndar, get actual() { return actual }, get andando() { return reloj !== null } }
}
