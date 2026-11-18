/**
 * Donde hay un hito modelado a mano, la casa genérica que el vectorizador levantó en ese lugar sobra. Acá
 * se decide cuáles: las que pisan la zona de supresión de un hito (polígonos en píxeles del plano). No se
 * borran: se les cambia la vida (src/epocas.js) para que no nazcan mientras el hito esté en pie.
 */
const NUNCA = 7 // nace en una época que no existe (hay 6: 0–5)
const ETAPAS_POR_VIDA = 8 // vida = nace + 8 · muere (ver src/ciudad.js)

/** ¿Está el punto dentro del polígono [[x, y]…]? (regla par‑impar) */
export function puntoEnPoligono([x, y], poligono) {
  let dentro = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i]
    const [xj, yj] = poligono[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro
  }
  return dentro
}

const giro = ([ax, ay], [bx, by], [cx, cy]) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
const seCruzan = (a, b, c, d) => giro(a, b, c) * giro(a, b, d) < 0 && giro(c, d, a) * giro(c, d, b) < 0

/** ¿Se pisan dos polígonos simples? (un vértice de uno dentro del otro, o dos lados que se cruzan) */
export function seSolapan(p, q) {
  if (p.some((v) => puntoEnPoligono(v, q)) || q.some((v) => puntoEnPoligono(v, p))) return true
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      if (seCruzan(p[i], p[(i + 1) % p.length], q[j], q[(j + 1) % q.length])) return true
    }
  }
  return false
}

/** Las zonas de supresión de una lista de hitos: [{ poligono, desde, hasta }] (hasta = 0: para siempre). */
export function zonasDeSupresion(hitos) {
  return hitos.flatMap((h) => (h.suprime ?? []).map((poligono) => ({ poligono, desde: h.nace ?? 0, hasta: h.muere ?? 0 })))
}

/**
 * La vida de cada techo con los hitos puestos: un array nuevo (no toca el original). Al techo que pisa una
 * zona se le quitan las épocas en que el hito está en pie (ver vidaSinHito).
 * Sin `vida` (la ciudad de demostración), todos los techos vivían siempre.
 */
export function suprimirTechos({ vertices, techos, vida = null }, zonas) {
  const n = techos.length / 4
  const salida = vida ? Uint32Array.from(vida) : new Uint32Array(n)
  if (!zonas.length) return salida
  const cajas = zonas.map(({ poligono }) => cajaDe(poligono))
  for (let t = 0; t < n; t++) {
    const [inicio, cuantos] = [techos[t * 4], techos[t * 4 + 1]]
    const anillo = Array.from({ length: cuantos }, (_, k) => [vertices[(inicio + k) * 2], vertices[(inicio + k) * 2 + 1]])
    const caja = cajaDe(anillo)
    zonas.forEach(({ poligono, desde, hasta }, z) => {
      if (!cajasSePisan(caja, cajas[z]) || !seSolapan(anillo, poligono)) return
      salida[t] = vidaSinHito(salida[t], desde, hasta)
    })
  }
  return salida
}

/**
 * La vida de una casa [nace, muere) menos las épocas [desde, hasta) de un hito (0 = sin fin). Si le queda
 * un rato antes del hito, vive ese (la casa que el hito reemplazó); si no, el de después; si no, nunca.
 */
export function vidaSinHito(vida, desde, hasta) {
  const [nace, muere] = [vida % ETAPAS_POR_VIDA, Math.floor(vida / ETAPAS_POR_VIDA)]
  const fin = muere > 0 ? muere : Infinity
  if (nace < desde) return nace + ETAPAS_POR_VIDA * Math.min(fin, desde)
  const despues = hasta > 0 ? Math.max(nace, hasta) : Infinity
  return despues < fin ? despues + ETAPAS_POR_VIDA * muere : NUNCA
}

function cajaDe(poligono) {
  const xs = poligono.map((v) => v[0])
  const ys = poligono.map((v) => v[1])
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

const cajasSePisan = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]
