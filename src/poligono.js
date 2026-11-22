/**
 * Geometría plana para las huellas de las casas: puntos [x, z] en metros, anillos sin repetir el
 * primero. Todo puro: ninguna función cambia lo que recibe.
 */

const EPS = 1e-9

/** Área del anillo con el signo de su sentido de giro. */
export function areaConSigno(anillo) {
  let s = 0
  for (let k = 0; k < anillo.length; k++) {
    const [a, b] = [anillo[k], anillo[(k + 1) % anillo.length]]
    s += a[0] * b[1] - b[0] * a[1]
  }
  return s / 2
}

const distanciaARecta = (p, a, b) => {
  const [dx, dz] = [b[0] - a[0], b[1] - a[1]]
  const largo = Math.hypot(dx, dz)
  if (largo < EPS) return Math.hypot(p[0] - a[0], p[1] - a[1])
  return Math.abs((p[0] - a[0]) * dz - (p[1] - a[1]) * dx) / largo
}

/** Douglas–Peucker sobre el tramo abierto puntos[desde..hasta]: los índices que quedan (sin el último). */
function tramoSimple(puntos, desde, hasta, tolerancia) {
  let [lejos, cual] = [0, -1]
  for (let k = desde + 1; k < hasta; k++) {
    const d = distanciaARecta(puntos[k], puntos[desde], puntos[hasta])
    if (d > lejos) [lejos, cual] = [d, k]
  }
  if (lejos <= tolerancia) return [desde]
  return [...tramoSimple(puntos, desde, cual, tolerancia), ...tramoSimple(puntos, cual, hasta, tolerancia)]
}

/**
 * El anillo sin los dientes del trazado a píxeles: Douglas–Peucker cerrado, anclado en dos puntos
 * extremos. Si lo que queda no es un polígono (menos de tres vértices, o casi sin área), el original.
 */
export function simplificar(anillo, tolerancia) {
  const n = anillo.length
  if (n <= 3) return anillo
  const masLejosDe = (p) => anillo.reduce((m, q, k) => {
    const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2
    return d > m[0] ? [d, k] : m
  }, [-1, 0])[1]
  const a = masLejosDe(anillo[0])
  const b = masLejosDe(anillo[a])
  if (a === b) return anillo
  const [i, j] = a < b ? [a, b] : [b, a]
  const abierto = [...anillo.slice(i), ...anillo.slice(0, i + 1)] // de i a i, dando la vuelta
  const medio = j - i
  const indices = [...tramoSimple(abierto, 0, medio, tolerancia), ...tramoSimple(abierto, medio, n, tolerancia)]
  const simple = indices.map((k) => abierto[k])
  if (simple.length < 3 || Math.abs(areaConSigno(simple)) < 0.5 * Math.abs(areaConSigno(anillo))) return anillo
  return simple
}

/**
 * El rectángulo de menor área que encierra el anillo, apoyado en uno de sus lados: ejes unitarios u y
 * v (v = u girado 90°), los rangos en cada eje, sus cuatro esquinas (u0v0, u1v0, u1v1, u0v1), ancho
 * (a lo largo de u), fondo (a lo largo de v) y área.
 */
export function rectanguloMinimo(anillo) {
  let mejor = null
  for (let k = 0; k < anillo.length; k++) {
    const [a, b] = [anillo[k], anillo[(k + 1) % anillo.length]]
    const largo = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (largo < 1e-6) continue
    const u = [(b[0] - a[0]) / largo, (b[1] - a[1]) / largo]
    const v = [-u[1], u[0]]
    let [u0, u1, v0, v1] = [Infinity, -Infinity, Infinity, -Infinity]
    for (const p of anillo) {
      const [pu, pv] = [p[0] * u[0] + p[1] * u[1], p[0] * v[0] + p[1] * v[1]]
      u0 = Math.min(u0, pu); u1 = Math.max(u1, pu); v0 = Math.min(v0, pv); v1 = Math.max(v1, pv)
    }
    const area = (u1 - u0) * (v1 - v0)
    if (!mejor || area < mejor.area) mejor = { u, v, u0, u1, v0, v1, area }
  }
  if (!mejor) return null
  const { u, v, u0, u1, v0, v1 } = mejor
  const en = (pu, pv) => [pu * u[0] + pv * v[0], pu * u[1] + pv * v[1]]
  return { ...mejor, ancho: u1 - u0, fondo: v1 - v0, esquinas: [en(u0, v0), en(u1, v0), en(u1, v1), en(u0, v1)] }
}

/** Sutherland–Hodgman: la parte del polígono donde a·x + b·z + c >= 0. */
export function recortar(poligono, a, b, c) {
  const salida = []
  const n = poligono.length
  for (let k = 0; k < n; k++) {
    const [p, q] = [poligono[k], poligono[(k + 1) % n]]
    const [dp, dq] = [a * p[0] + b * p[1] + c, a * q[0] + b * q[1] + c]
    if (dp >= 0) salida.push(p)
    if ((dp >= 0) !== (dq >= 0)) {
      const t = dp / (dp - dq)
      salida.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
    }
  }
  return salida.length >= 3 ? salida : []
}

/** La parte del polígono que cae dentro de una región convexa (en cualquier sentido de giro). */
export function recortarConvexo(poligono, region) {
  const signo = areaConSigno(region) >= 0 ? 1 : -1
  let resto = poligono
  for (let k = 0; k < region.length && resto.length; k++) {
    const [p, q] = [region[k], region[(k + 1) % region.length]]
    // adentro queda a la izquierda del lado (con giro positivo): n = (−dz, dx)
    const [a, b] = [-(q[1] - p[1]) * signo, (q[0] - p[0]) * signo]
    resto = recortar(resto, a, b, -(a * p[0] + b * p[1]))
  }
  return resto
}

/** ¿El punto cae dentro del anillo? (par–impar) */
export function estaDentro(anillo, x, z) {
  let dentro = false
  for (let k = 0, j = anillo.length - 1; k < anillo.length; j = k++) {
    const [a, b] = [anillo[k], anillo[j]]
    if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) dentro = !dentro
  }
  return dentro
}

/** Los parámetros t (0 < t < 1) donde el segmento a→b cruza los lados del anillo, de menor a mayor. */
export function cruces(a, b, anillo) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const ts = []
  const n = anillo.length
  for (let k = 0; k < n; k++) {
    const p = anillo[k]
    const q = anillo[k + 1 === n ? 0 : k + 1]
    const ex = q[0] - p[0]
    const ez = q[1] - p[1]
    const det = dx * ez - dz * ex
    if (Math.abs(det) < EPS) continue
    const t = ((p[0] - a[0]) * ez - (p[1] - a[1]) * ex) / det
    if (t <= 1e-6 || t >= 1 - 1e-6) continue
    const s = ((p[0] - a[0]) * dz - (p[1] - a[1]) * dx) / det
    if (s >= -1e-9 && s <= 1 + 1e-9) ts.push(t)
  }
  if (ts.length < 2) return ts
  ts.sort((x, y) => x - y)
  return ts.filter((t, k) => k === 0 || t - ts[k - 1] > 1e-6)
}

/**
 * Índice espacial de las casas (anillos; los null no cuentan) en una grilla de `celda` metros:
 * ocupado(x, z, salvo) dice si el punto cae dentro de alguna casa que no sea la número `salvo`.
 */
export function crearIndice(anillos, celda = 16) {
  const grilla = new Map()
  const clave = (i, j) => i * 73856093 + j * 19349663
  anillos.forEach((anillo, n) => {
    if (!anillo) return
    let [x0, x1, z0, z1] = [Infinity, -Infinity, Infinity, -Infinity]
    for (const [x, z] of anillo) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z) }
    for (let i = Math.floor(x0 / celda); i <= Math.floor(x1 / celda); i++) {
      for (let j = Math.floor(z0 / celda); j <= Math.floor(z1 / celda); j++) {
        const k = clave(i, j)
        const lista = grilla.get(k)
        if (lista) lista.push(n); else grilla.set(k, [n])
      }
    }
  })
  return {
    ocupado(x, z, salvo = -1) {
      const lista = grilla.get(clave(Math.floor(x / celda), Math.floor(z / celda)))
      if (!lista) return false
      for (const n of lista) if (n !== salvo && estaDentro(anillos[n], x, z)) return true
      return false
    },
  }
}

/**
 * Como simplificar, pero sin salir nunca del anillo (fase 6 de 1772, T33j.6b): solo se quitan los vértices convexos
 * (los que sobresalen) a menos de la tolerancia de la recta entre sus vecinos y sin otro vértice dentro del triángulo
 * que se corta. Quitar uno así achica el polígono, nunca lo agranda: el techo de una casa no sale de su huella ni
 * pisa a la vecina en la medianera (simplificar, con la recta de cada lado por separado, la corría hasta la
 * tolerancia hacia uno u otro lado). Conserva el sentido de giro; si queda menos de la mitad del área, el original.
 */
export function simplificarAdentro(anillo, tolerancia) {
  const horario = areaConSigno(anillo) < 0
  const o = horario ? [...anillo].reverse() : anillo
  const n = o.length
  const giro = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  // la cuerda p→r corta de verdad algún lado del original que no sea de la cadena que reemplaza
  const corta = (ip, ir) => {
    for (let e = ir; e !== ip; e = (e + 1) % n) {
      const [a, b] = [o[e], o[(e + 1) % n]]
      const [d1, d2] = [giro(o[ip], o[ir], a), giro(o[ip], o[ir], b)]
      const [d3, d4] = [giro(a, b, o[ip]), giro(a, b, o[ir])]
      if (((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))) return true
    }
    return false
  }
  // se puede ir de p a r si toda la cadena original de en medio queda afuera de la cuerda y a no más de la tolerancia
  const sePuede = (ip, ir) => {
    const largo = Math.hypot(o[ir][0] - o[ip][0], o[ir][1] - o[ip][1])
    if (largo === 0) return false
    for (let s = (ip + 1) % n; s !== ir; s = (s + 1) % n) {
      const g = giro(o[ip], o[s], o[ir])
      if (g < 0 || g / largo >= tolerancia) return false
    }
    return !corta(ip, ir)
  }
  const quedan = Array.from({ length: n }, (_, k) => k)
  let cambio = true
  while (cambio && quedan.length > 3) {
    cambio = false
    for (let k = 0; k < quedan.length && quedan.length > 3; k++) {
      const [ip, ir] = [quedan[(k + quedan.length - 1) % quedan.length], quedan[(k + 1) % quedan.length]]
      if (sePuede(ip, ir)) { quedan.splice(k, 1); k--; cambio = true }
    }
  }
  const simple = quedan.map((k) => o[k])
  if (Math.abs(areaConSigno(simple)) < 0.5 * Math.abs(areaConSigno(anillo))) return anillo
  return horario ? simple.reverse() : simple
}
