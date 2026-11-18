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
export function crearLineaDeTiempo({ contenedor, epocas, alElegir, segundosPorEpoca = 4 }) {
  const botones = epocas.map((e, i) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: String(e.año) })
    b.dataset.indice = String(i)
    b.title = `La ciudad hacia ${e.año}: ${e.corto}`
    b.addEventListener('click', () => { parar(); elegir(i) })
    return b
  })
  const andar = Object.assign(document.createElement('button'), { type: 'button', className: 'andar', textContent: '▶' })
  andar.title = `Ver crecer la ciudad, de ${epocas[0].año} a ${epocas.at(-1).año}`
  andar.setAttribute('aria-label', andar.title)
  const fila = Object.assign(document.createElement('div'), { className: 'años' })
  fila.setAttribute('role', 'group')
  fila.setAttribute('aria-label', 'Línea de tiempo: la ciudad en cada año')
  fila.append(...botones, andar)
  const pie = Object.assign(document.createElement('div'), { className: 'pie' })
  pie.setAttribute('aria-live', 'polite')
  contenedor.replaceChildren(fila, pie)
  contenedor.hidden = false

  let actual = 0
  let reloj = null
  function elegir(i) {
    actual = Math.max(0, Math.min(epocas.length - 1, i))
    botones.forEach((b, k) => { b.classList.toggle('on', k === actual); b.setAttribute('aria-pressed', String(k === actual)) })
    const e = epocas[actual]
    pie.textContent = `La ciudad hacia ${e.año}, según el ${e.corto}.${e.obras ? ` ${e.obras}` : ''}`
    alElegir(actual)
  }
  function parar() {
    clearInterval(reloj)
    reloj = null
    andar.textContent = '▶'
  }
  andar.addEventListener('click', () => {
    if (reloj) return parar()
    if (actual === epocas.length - 1) elegir(0)
    andar.textContent = '❚❚'
    reloj = setInterval(() => (actual < epocas.length - 1 ? elegir(actual + 1) : parar()), segundosPorEpoca * 1000)
  })
  elegir(0)
  return { elegir, parar, get actual() { return actual } }
}
