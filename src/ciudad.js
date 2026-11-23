/**
 * La ciudad levantada: las huellas de las casas (polígonos en píxeles del plano) en una sola
 * geometría, cada una con sus paredes y su techo de verdad (src/techos.js y src/alzado.js): tejados a
 * dos aguas con la cumbrera paralela a la calle, alas alrededor de patios en las casas de patio
 * (src/alas.js), azoteas, zinc.
 *
 * Cada vértice lleva aInfo = (distancia de su casa a la plaza, semilla, estilo, pisos) para la ola y
 * el estilo; aAncla = (x, z) del centroide de su casa: la altura del terreno a la que sube entera;
 * aPared = (metros desde la esquina de arranque de su pared, largo de esa pared, alto de piso): las
 * coordenadas con las que el shader dibuja la fachada (src/shader/fachada.js; largo 0 = sin vanos); y
 * aTecho = (s a lo largo del alero, t bajando desde la cumbrera, largo del faldón, cubierta): las del
 * tejado (src/shader/techo.js; cubierta 0 = pared).
 *
 * aHistoria = el estilo y los pisos de su casa en cada época (empacarHistoria): el shader elige los de
 * la época que rige. Si con las épocas cambia la forma del techo (otra cubierta, otros pisos), la casa
 * va una vez por etapa (etapasDe, src/techos.js), cada una con su vida; si solo cambia la fachada, es
 * la misma geometría y el shader le sube el pretil o le quita el alero.
 *
 * Datos (ciudad.pak): vertices Float32 [px, py, …]; techos Uint32 de a 4:
 * [primer vértice, cuántos, empacarTecho({pisos, estilo}), semilla]; vida Uint32: nace + 8 · muere;
 * historia (opcional) Uint8 de a 6: por techo, un byte por época = estilo + 16·pisos (specs/02);
 * marcos y alas (opcionales, Float32): el marco del lote de cada casa que da a la calle y las alas de
 * las casas de patio (src/alas.js); vuelos (opcional, Uint8): por techo, los centímetros que puede volar su
 * alero sin entrar en la calzada de 1772 (tools/geo/epocas.py, vuelos_1772), 255 = sin tope.
 */
import { BufferGeometry, BufferAttribute } from 'three'
import { simplificarAdentro, rectanguloMinimo, areaConSigno, crearIndice } from './poligono.js'
import { planDeTecho, elegirFrente, etapasDe, LADO_LIBRE } from './techos.js'
import { alzarCasa } from './alzado.js'
import { leerMarcos, planDeAlas, esDePatio } from './alas.js'

export const SIN_TOPE = 255 // en la parte "vuelos" del pak: el alero de esa casa no tiene tope
const CERCA_M = 2 // una vecina a más de esto de la huella no queda donde iría el alero (el más largo, 0,8 m)
export const TOLERANCIA_HUELLA_M = 0.6 // los dientes del trazado a píxeles que se le quitan a cada huella
const A_LA_LINEA_M = 1.5 // los vértices de la huella a menos de esto de la línea de fachada se llevan a ella
const SONDAS_M = [2, 4] // a qué distancia de cada lado se mira si hay calle o hay vecino (las calles miden 5 m o más)
const SONDAS_A_LO_LARGO = [0.2, 0.5, 0.8]

export const empacarTecho = ({ pisos, estilo }) => ((estilo & 0xff) << 8) | (pisos & 0xff)
export const desempacarTecho = (v) => ({ pisos: v & 0xff, estilo: (v >> 8) & 0xff })

export const EPOCAS_HISTORIA = 6 // un byte por época de la línea de tiempo: estilo + 16·pisos
/** Los 6 bytes de la historia de una casa → 2 números de 3 bytes (exactos en Float32): el atributo aHistoria. */
export const empacarHistoria = (b) => [b[0] + 256 * b[1] + 65536 * b[2], b[3] + 256 * b[4] + 65536 * b[5]]
/** Espejo de enEpoca() del shader (src/shader/vertice.js): estilo y pisos en la época e (se redondea y se acota). */
export function historiaEnEpoca([h0, h1], e) {
  const k = Math.min(EPOCAS_HISTORIA - 1, Math.max(0, Math.round(e)))
  const byte = Math.floor((k < 3 ? h0 : h1) / 256 ** (k % 3)) % 256
  return { estilo: byte % 16, pisos: Math.floor(byte / 16) }
}

/** Las casas del pak, con su huella en metros (la original y la simplificada) y su vida. */
function leerCasas({ vertices, techos, vida = null, historia = null, marcos = null, alas = null, vuelos = null }, coords, tolerancia) {
  const conMarco = leerMarcos({ marcos, alas }, coords)
  if (historia && historia.length !== (techos.length / 4) * EPOCAS_HISTORIA) {
    throw new Error(`ciudad: la historia trae ${historia.length} bytes y hacen falta ${EPOCAS_HISTORIA} por techo`)
  }
  const casas = []
  for (let t = 0; t < techos.length; t += 4) {
    const [inicio, cuantos] = [techos[t], techos[t + 1]]
    const anillo = []
    for (let k = 0; k < cuantos; k++) {
      const { x, z } = coords.aMundo(vertices[(inicio + k) * 2], vertices[(inicio + k) * 2 + 1])
      anillo.push([x, z])
    }
    const v = vida ? vida[t / 4] : 0
    const centro = anillo.reduce((s, p) => [s[0] + p[0] / cuantos, s[1] + p[1] / cuantos], [0, 0])
    const casa = { ...desempacarTecho(techos[t + 2]), semilla: techos[t + 3], nace: v % 8, muere: Math.floor(v / 8) }
    // "vuelos" (opcional): centímetros que puede volar el alero; SIN_TOPE (o sin la parte), lo que diga el estilo
    const vuelo = vuelos && vuelos[t / 4] !== SIN_TOPE ? vuelos[t / 4] / 100 : Infinity
    const marco = conMarco.get(t / 4) ?? null
    const bytes = historia?.subarray((t / 4) * EPOCAS_HISTORIA, (t / 4 + 1) * EPOCAS_HISTORIA)
    casas.push({
      ...casa, vuelo, centro, huella: cuantos >= 3 ? simplificarAdentro(anillo, tolerancia) : null, marco,
      etapas: etapasDe(casa, bytes, { conAlas: Boolean(marco?.alas.length) }),
      // sin historia (datos viejos, la ciudad de demostración), todas las épocas valen lo de `techos`
      historia: empacarHistoria(bytes ?? Array(EPOCAS_HISTORIA).fill((casa.estilo & 15) + 16 * Math.min(casa.pisos, 15))),
    })
  }
  return casas
}

/**
 * Qué parte de lo que hay justo afuera de cada lado del rectángulo está sin casas (0..1): los lados
 * van en orden v0, u1, v1, u0, con la normal hacia afuera.
 */
function ladosLibres(rect, indice, propia, cuenta = null) {
  const { u, v, esquinas } = rect
  const normales = [[-v[0], -v[1]], u, v, [-u[0], -u[1]]]
  return normales.map((n, k) => {
    const [a, b] = [esquinas[k], esquinas[(k + 1) % 4]]
    let libres = 0
    for (const t of SONDAS_A_LO_LARGO) {
      for (const d of SONDAS_M) {
        if (!indice.ocupado(a[0] + (b[0] - a[0]) * t + n[0] * d, a[1] + (b[1] - a[1]) * t + n[1] * d, propia, cuenta)) libres++
      }
    }
    return libres / (SONDAS_A_LO_LARGO.length * SONDAS_M.length)
  })
}

/**
 * El marco del lote: origen en la esquina izquierda del frente, `eu` a lo largo del frente y `ev`
 * hacia el fondo (unitarios, en el mundo). `frente` es el índice del lado (v0, u1, v1, u0).
 */
export function marcoDelLote(rect, frente) {
  const { u, v, esquinas, ancho, fondo } = rect
  const menos = (p) => [-p[0], -p[1]]
  const [eu, ev] = [[u, v], [v, menos(u)], [menos(u), menos(v)], [menos(v), u]][frente]
  const deFrente = frente % 2 === 0
  return { origen: esquinas[frente], eu, ev, ancho: deFrente ? ancho : fondo, fondo: deFrente ? fondo : ancho }
}

const VERTICES_POR_CASA = 128 // para reservar de entrada; si hacen falta más, los búferes crecen
const CAMPOS = { posiciones: 3, normales: 3, info: 4, vidas: 2, anclas: 2, paredes: 3, cubiertas: 4, historias: 2 }

/** Los búferes de la geometría, escritos en su lugar (un push por número sobre un array común cuesta el doble). */
function crearBuferes(capacidad) {
  const b = { vertices: 0, capacidad, triangulos: 0, indices: new Uint32Array(capacidad * 2) }
  for (const [nombre, tamaño] of Object.entries(CAMPOS)) b[nombre] = new Float32Array(capacidad * tamaño)
  return b
}

const agrandado = (viejo, largo) => { const nuevo = new viejo.constructor(largo); nuevo.set(viejo); return nuevo }

function crecer(b) {
  b.capacidad *= 2
  for (const [nombre, tamaño] of Object.entries(CAMPOS)) b[nombre] = agrandado(b[nombre], b.capacidad * tamaño)
}

/** Lo que escribe src/alzado.js, llevado del marco del lote al mundo y a los búferes de la geometría. */
function escritor(b, casa, etapa, { origen: o, eu, ev }) {
  const dist = Math.hypot(casa.centro[0], casa.centro[1])
  const semilla = casa.semilla & 0xffff
  return {
    vertice(pu, pv, y, n, pared, techo) {
      if (b.vertices === b.capacidad) crecer(b)
      const k = b.vertices++
      b.posiciones[k * 3] = o[0] + pu * eu[0] + pv * ev[0]
      b.posiciones[k * 3 + 1] = y
      b.posiciones[k * 3 + 2] = o[1] + pu * eu[1] + pv * ev[1]
      b.normales[k * 3] = n[0] * eu[0] + n[2] * ev[0]
      b.normales[k * 3 + 1] = n[1]
      b.normales[k * 3 + 2] = n[0] * eu[1] + n[2] * ev[1]
      b.info.set([dist, semilla, etapa.estilo, etapa.pisos], k * 4)
      b.vidas[k * 2] = etapa.nace
      b.vidas[k * 2 + 1] = etapa.muere
      b.historias[k * 2] = casa.historia[0]
      b.historias[k * 2 + 1] = casa.historia[1]
      b.anclas[k * 2] = casa.centro[0]
      b.anclas[k * 2 + 1] = casa.centro[1]
      b.paredes.set(pared, k * 3)
      b.cubiertas.set(techo, k * 4)
      return k
    },
    // agrega el triángulo con el giro que haga que su cara mire hacia n
    triangulo(i, j, k, n) {
      const m = [n[0] * eu[0] + n[2] * ev[0], n[1], n[0] * eu[1] + n[2] * ev[1]]
      const p = b.posiciones
      const e1 = [p[j * 3] - p[i * 3], p[j * 3 + 1] - p[i * 3 + 1], p[j * 3 + 2] - p[i * 3 + 2]]
      const e2 = [p[k * 3] - p[i * 3], p[k * 3 + 1] - p[i * 3 + 1], p[k * 3 + 2] - p[i * 3 + 2]]
      const cruz = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
      const derecho = cruz[0] * m[0] + cruz[1] * m[1] + cruz[2] * m[2] >= 0
      if ((b.triangulos + 1) * 3 > b.indices.length) b.indices = agrandado(b.indices, b.indices.length * 2)
      b.indices.set(derecho ? [i, j, k] : [i, k, j], b.triangulos++ * 3)
    },
  }
}

/**
 * La huella con su frente derecho: los vértices a menos de A_LA_LINEA_M de la línea de fachada (v = 0) se
 * llevan a ella, y lo mismo con los otros lados que dan a una calle. Así el alero y la cumbrera corren
 * seguidos por la cuadra, sin los dientes del trazado. Si lo que queda no es un polígono, la huella como vino.
 */
export function alinearHuella(anillo, ancho, fondo, calles = {}, { soloAdentro = false } = {}) {
  // soloAdentro (T33j.6f): solo se llevan a la línea los vértices que la pasan hacia la calle; los que quedan detrás
  // se quedan (en una calle angosta de 1772, correrlos adelantaba el techo sobre la calzada)
  const cerca = (x, linea, afuera) => Math.abs(x - linea) < A_LA_LINEA_M && (!soloAdentro || afuera)
  const llevado = anillo.map(([u, v]) => [
    calles.izq && cerca(u, 0, u < 0) ? 0 : calles.der && cerca(u, ancho, u > ancho) ? ancho : u,
    cerca(v, 0, v < 0) ? 0 : calles.fondo && cerca(v, fondo, v > fondo) ? fondo : v,
  ])
  // fuera los repetidos (dos vértices llevados a la misma esquina) y, después, los que quedan en medio de un tramo recto
  const unicos = llevado.filter((p, k) => {
    const a = llevado[(k + llevado.length - 1) % llevado.length]
    return Math.hypot(p[0] - a[0], p[1] - a[1]) >= 1e-4
  })
  const n = unicos.length
  const limpio = unicos.filter((p, k) => {
    const [a, b] = [unicos[(k + n - 1) % n], unicos[(k + 1) % n]]
    return Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) > 1e-6 || (p[0] - a[0]) * (b[0] - p[0]) + (p[1] - a[1]) * (b[1] - p[1]) < 0
  })
  return limpio.length >= 3 && Math.abs(areaConSigno(limpio)) > 0.5 * Math.abs(areaConSigno(anillo)) ? limpio : anillo
}

/**
 * La casa en el marco que trae el dato (tools/geo/alas.py): el frente sobre la línea de fachada de su
 * cuadra. Con alas, el rectángulo del lote es el del dato (sin los salientes de la huella, que cubren las
 * alas del borde); sin alas (casa simple, o la etapa en que la casa ya no es de patio), el de la huella entera.
 */
function proyectarEnMarco(casa, conAlas = casa.marco.alas.length > 0, ahora = null) {
  const { eu, ev, calles, crujia } = casa.marco
  const alas = conAlas ? casa.marco.alas : []
  let { origen: o, ancho, fondo } = casa.marco
  let anillo = casa.huella.map(([x, z]) => [(x - o[0]) * eu[0] + (z - o[1]) * eu[1], (x - o[0]) * ev[0] + (z - o[1]) * ev[1]])
  if (!alas.length) {
    let [u0, u1, v0, v1] = [Infinity, -Infinity, Infinity, -Infinity]
    for (const [u, v] of anillo) { u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v) }
    if (Math.abs(v0) < A_LA_LINEA_M) v0 = 0 // el frente, en la línea de fachada
    if (!(u1 - u0 > 1e-3) || !(v1 - v0 > 1e-3)) return null
    o = [o[0] + u0 * eu[0] + v0 * ev[0], o[1] + u0 * eu[1] + v0 * ev[1]]
    anillo = anillo.map(([u, v]) => [u - u0, v - v0])
    ancho = u1 - u0
    fondo = v1 - v0
  }
  // solo hacia adentro (T33j.6f/6h): la línea de la cuadra es la del marco de vectorizar, de antes de la alineación
  // de la fase 5; correr hacia ella los vértices de detrás adelantaba el techo sobre la calle o sobre la vecina
  anillo = alinearHuella(anillo, ancho, fondo, calles, { soloAdentro: true })
  // qué lados dan de verdad a la calle (T33j.6h): el dato dice cuáles, pero el marco es de vectorizar y la fase 5
  // movió casas; un lado con una casa de su época delante no lleva alero
  const libres = ahora ? libresDelMarco(o, eu, ev, ancho, fondo, calles, ahora) : calles
  return {
    marco: { origen: o, eu, ev, ancho, fondo }, anillo, libres, alas, crujia,
    lleno: Math.min(1, Math.abs(areaConSigno(anillo)) / (ancho * fondo)),
  }
}

/** Los lados del marco (frente, der, fondo, izq) que dan a la calle: libres de casas de su época (`ahora`). */
function libresDelMarco(o, eu, ev, ancho, fondo, calles, { indice, numero, cuenta }) {
  const p = (u, v) => [o[0] + u * eu[0] + v * ev[0], o[1] + u * eu[1] + v * ev[1]]
  const rect = { u: eu, v: ev, esquinas: [p(0, 0), p(ancho, 0), p(ancho, fondo), p(0, fondo)] }
  const [frente, der, alFondo, izq] = ladosLibres(rect, indice, numero, cuenta).map((x) => x >= LADO_LIBRE)
  return { frente, der: Boolean(calles.der) && der, fondo: Boolean(calles.fondo) && alFondo, izq: Boolean(calles.izq) && izq }
}

/** El frente y el marco del lote de una casa, con su huella en ese marco; null si no da un polígono. */
function proyectar(casa, numero, indice, ahora = null) {
  if (casa.huella && casa.marco) {
    const lote = proyectarEnMarco(casa, undefined, ahora)
    // para las etapas en que no es de patio, el rectángulo de la huella entera: el techo cubre también sus salientes
    return lote && lote.alas.length ? { ...lote, entero: proyectarEnMarco(casa, false, ahora) } : lote
  }
  const rect = casa.huella && rectanguloMinimo(casa.huella)
  if (!rect || rect.area < 1e-6) return null
  const libres = casa.muere === 0 ? ladosLibres(rect, indice, numero) : [1, 1, 1, 1]
  const frente = elegirFrente([rect.ancho, rect.fondo, rect.ancho, rect.fondo], libres)
  const marco = marcoDelLote(rect, frente)
  const { origen: o, eu, ev } = marco
  const anillo = casa.huella.map(([x, z]) => [(x - o[0]) * eu[0] + (z - o[1]) * eu[1], (x - o[0]) * ev[0] + (z - o[1]) * ev[1]])
  const esLibre = (k) => libres[(frente + k) % 4] >= LADO_LIBRE
  return { marco, anillo, libres: { der: esLibre(1), fondo: esLibre(2), izq: esLibre(3) }, lleno: Math.abs(areaConSigno(casa.huella)) / rect.area }
}

/** El plan del techo de una etapa de la casa: con sus alas si es de patio en esa etapa; si no, el de siempre. */
function planDeEtapa(casa, etapa, { marco, libres, lleno, alas, crujia }) {
  const comun = {
    ancho: marco.ancho, fondo: marco.fondo, estilo: etapa.estilo, pisos: etapa.pisos, semilla: casa.semilla, nace: etapa.nace,
    conAlero: etapa.conAlero, conPretil: etapa.conPretil,
  }
  const plan = alas?.length ? planDeAlas({ ...comun, alas }) : planDeTecho({ ...comun, libres, lleno, crujia })
  // el alero no pasa el tope de la casa: en una calle angosta de 1772 entraría en la calzada (T33j.6f)
  return plan.alero > casa.vuelo ? { ...plan, alero: casa.vuelo } : plan
}

/** El lote con que se levanta una etapa: el de las alas si en ella la casa es de patio; si no, el de la huella entera. */
const loteDeEtapa = (casa, etapa, lote) => (lote.entero && !esDePatio(etapa.estilo, casa.semilla, etapa.nace) ? lote.entero : lote)

/** Devuelve arrays planos (posiciones, normales, info, vidas, anclas, paredes, cubiertas, historias, indices); sin three.js de por medio. */
export function extruirTechos(datos, coords, { tolerancia = TOLERANCIA_HUELLA_M } = {}) {
  const casas = leerCasas(datos, coords, tolerancia)
  // las casas que mueren (las de la fundación) se enciman con las que vienen después: no cuentan como vecinas
  const indice = crearIndice(casas.map((c) => (c.muere === 0 ? c.huella : null)))
  // todas las casas, para ver qué lados de un marco están libres de casas de su época (T33j.6h)
  const todas = crearIndice(casas.map((c) => c.huella))
  // ¿la casa n vive en algún momento del tramo de épocas [desde, hasta)?
  const viveEn = (n, desde, hasta) => casas[n].nace < hasta && (casas[n].muere || Infinity) > desde
  // una vecina que muere antes que la casa no cuenta: la de la fundación se encima con lo que viene después
  const noMuereAntes = (n, casa) => (casas[n].muere || Infinity) >= (casa.muere || Infinity)
  const b = crearBuferes(Math.max(64, casas.length * VERTICES_POR_CASA))
  // qué puntos alrededor de la huella (a 0,1 y 0,8 m de cada lado, a lo largo) están ocupados por las casas que
  // cuenta(n) deja: el entorno donde puede ir un alero, como una cadena para comparar tramos de épocas
  const entorno = (casa, numero, cuenta) => {
    const h = casa.huella
    const giro = areaConSigno(h) > 0 ? 1 : -1
    let firma = ''
    for (let k = 0; k < h.length; k++) {
      const [p, q] = [h[k], h[(k + 1) % h.length]]
      const largo = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1
      const n = [((q[1] - p[1]) / largo) * giro, (-(q[0] - p[0]) / largo) * giro]   // hacia afuera
      for (const t of [0.1, 0.5, 0.9]) {
        for (const d of [0.1, 0.8]) {
          firma += todas.ocupado(p[0] + (q[0] - p[0]) * t + n[0] * d, p[1] + (q[1] - p[1]) * t + n[1] * d, numero, cuenta) ? '1' : '0'
        }
      }
    }
    return firma
  }
  casas.forEach((casa, numero) => {
    if (!casa.huella) return
    // las vecinas que pueden quedar donde iría un alero, y las épocas en que nacen o mueren: cada etapa se parte ahí,
    // para que la casa vuele donde, en ese tramo de épocas, no hay otra (revisión de #147)
    const xs = casa.huella.map((p) => p[0]), zs = casa.huella.map((p) => p[1])
    const vecinas = [...todas.cerca(Math.min(...xs) - CERCA_M, Math.min(...zs) - CERCA_M, Math.max(...xs) + CERCA_M, Math.max(...zs) + CERCA_M)]
      .filter((n) => n !== numero && noMuereAntes(n, casa))
    for (const etapa of casa.etapas) {
      const fin = etapa.muere || Infinity
      const cortes = new Set([etapa.nace])
      for (const n of vecinas) for (const e of [casas[n].nace, casas[n].muere]) if (e > etapa.nace && e < fin) cortes.add(e)
      // un corte solo cuenta si cambia lo que hay alrededor de la casa (los puntos donde iría un alero): los tramos
      // seguidos con el mismo entorno se juntan y no duplican geometría
      const ordenados = [...cortes].sort((a, b) => a - b)
      const firmas = ordenados.map((desde, k) => entorno(casa, numero, (n) => viveEn(n, desde, ordenados[k + 1] ?? fin) && noMuereAntes(n, casa)))
      const bordes = ordenados.filter((_, k) => k === 0 || firmas[k] !== firmas[k - 1])
      bordes.forEach((desde, k) => {
        const hasta = bordes[k + 1] ?? fin
        const cuenta = (n) => viveEn(n, desde, hasta) && noMuereAntes(n, casa)
        const lote = proyectar(casa, numero, indice, { indice: todas, numero, cuenta })
        const suyo = lote && loteDeEtapa(casa, etapa, lote)
        if (!suyo) return
        const tramo = { ...etapa, nace: desde, muere: hasta === Infinity ? 0 : hasta }
        const { origen: o, eu, ev } = suyo.marco
        // otra casa del tramo en un punto del marco del lote: ahí no vuela el alero (T33j.6h)
        const ocupado = (u, v) => todas.ocupado(o[0] + u * eu[0] + v * ev[0], o[1] + u * eu[1] + v * ev[1], numero, cuenta)
        alzarCasa({ anillo: suyo.anillo, plan: planDeEtapa(casa, tramo, suyo), libres: suyo.libres, ocupado }, escritor(b, casa, tramo, suyo.marco))
      })
    }
  })

  const salida = {}
  for (const [nombre, tamaño] of Object.entries(CAMPOS)) salida[nombre] = b[nombre].slice(0, b.vertices * tamaño)
  const indices = b.indices.subarray(0, b.triangulos * 3)
  return { ...salida, indices: b.vertices > 65535 ? indices.slice() : new Uint16Array(indices) }
}

export function geometriaCiudad(datos, coords) {
  const { posiciones, normales, info, vidas, anclas, paredes, cubiertas, historias, indices } = extruirTechos(datos, coords)
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(posiciones, 3))
  // las normales en un byte por componente y la vida en bytes: son millones de vértices
  g.setAttribute('normal', new BufferAttribute(Int8Array.from(normales, (v) => Math.round(v * 127)), 3, true))
  g.setAttribute('aInfo', new BufferAttribute(info, 4))
  g.setAttribute('aVida', new BufferAttribute(Uint8Array.from(vidas), 2))
  g.setAttribute('aAncla', new BufferAttribute(anclas, 2))
  g.setAttribute('aPared', new BufferAttribute(paredes, 3))
  g.setAttribute('aTecho', new BufferAttribute(cubiertas, 4))
  g.setAttribute('aHistoria', new BufferAttribute(historias, 2))
  g.setIndex(new BufferAttribute(indices, 1))
  g.computeBoundingSphere()
  return g
}
