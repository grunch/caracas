/**
 * El techo de cada casa, como en las pinturas y fotos de época (fuentes/imagenes/README.md): tejados
 * de teja a dos aguas con la cumbrera paralela a la calle, una crujía al frente y cuerpos más bajos
 * detrás (las casas de patio, con sus alas alrededor de los patios, van en src/alas.js); pretil al frente en las republicanas; azoteas en las modernas; zinc en los
 * ranchos y los galpones. La casa cambia con las épocas (etapasDe): si cambia la forma del techo es
 * otra etapa, con su propia geometría; si solo cambia la fachada, la misma.
 *
 * Todo se arma en el marco del lote: u corre a lo largo del frente (0..ancho) y v hacia el fondo
 * (0 en la calle). Un plan es una lista de faldones: regiones convexas que cubren el lote, cada una
 * con su plano (cumbre − tan · avance en el sentido de la caída). Un patio es un faldón hueco, a
 * altura 0. src/ciudad.js recorta los faldones con la huella de la casa y levanta paredes hasta ellos.
 * Todo puro y determinista por la semilla de la casa.
 */

/**
 * Qué cubre cada superficie (aTecho.w, lo lee src/shader/techo.js). PATIO es el piso del patio y SOLAR,
 * la tierra del solar del fondo (src/alas.js). ALERO
 * es la cara de abajo de un alero; la de arriba lleva su cubierta + VOLADA: el shader quita las dos
 * cuando la fachada de la época tiene pretil.
 */
export const CUBIERTA = Object.freeze({ PARED: 0, TEJA: 1, AZOTEA: 2, ZINC: 3, ALERO: 4, PATIO: 5, SOLAR: 6, VOLADA: 8 })

const COLONIAL = 0, REPUBLICANO = 1, GUZMANCISTA = 2, ECLECTICO = 3, MODERNO = 4, QUINTA = 5, RANCHO = 6, ORILLAS = 7, GALPON = 8, PUBLICO = 9
/** Las fachadas de pretil tapan el tejado desde la calle (espejo de conPretil, src/shader/comun.js). */
const DE_PRETIL = [REPUBLICANO, GUZMANCISTA, ECLECTICO]
/** Las fachadas de las casas de patio (src/alas.js): con otra, la casa se techa entera. */
export const ESTILOS_DE_PATIO = Object.freeze([COLONIAL, REPUBLICANO, GUZMANCISTA, ORILLAS])
export const EPOCAS = 6

/**
 * Alto de piso de cada estilo, en metros. Las casas del centro, de un piso muy alto (5 m de fachada en
 * la litografía de la calle de 1843); las de las orillas, bajas (alero a 3 m en la foto de La Pastora).
 */
export const ALTO_PISO_ESTILO = Object.freeze({
  [COLONIAL]: 4.6, [REPUBLICANO]: 4.8, [GUZMANCISTA]: 5.0, [ECLECTICO]: 4.2, [MODERNO]: 3.5,
  [QUINTA]: 3.6, [RANCHO]: 2.5, [ORILLAS]: 3.2, [GALPON]: 5.5, [PUBLICO]: 5.0,
})
const ALTO_PISO_POR_DEFECTO = 4.2
const VARIACION_ALTO = 0.15 // cada casa, ±15 %: la línea de aleros sube y baja (La Pastora, 1892)

export const PRETIL_M = 0.75 // lo que sube el pretil sobre el arranque del tejado en las republicanas
const BORDE_AZOTEA_M = 0.7
const ALTO_MINIMO_ALA_M = 2.3 // bajo el alero de un ala hay un corredor
const FONDO_UNA_CRUJIA_M = 10.5 // hasta acá, la casa es una sola crujía
const RESTO_MINIMO_M = 3.5 // menos que esto detrás de la crujía no hace un ala
const ANCHO_SIN_PATIO_M = 7.5
const SUBIDA_MAXIMA_M = 2.8
const LLENO_MINIMO = 0.6 // menos que esto del rectángulo: polígono irregular, va con crujías paralelas
const FONDO_CRUJIA_PARALELA_M = 7
const NAVE_PUBLICA_M = 13
const SUBIDA_IRREGULAR_M = 1.6
const TAN_ZINC = Math.tan((14 * Math.PI) / 180)
/** Desde qué parte despejada un lado de la casa da a la calle (o a un callejón) y no a un vecino. */
export const LADO_LIBRE = 0.5

/** Número en [0, 1) determinista por semilla y sal (el finalizador de murmur3, como tools/geo/estilos.py). */
export function azar(semilla, sal) {
  let x = (Math.imul(semilla | 0, 0x9e3779b1) + Math.imul(sal | 0, 0x85ebca77)) | 0
  x ^= x >>> 16
  x = Math.imul(x, 0x7feb352d)
  x ^= x >>> 15
  x = Math.imul(x, 0x846ca68b)
  x ^= x >>> 16
  return (x >>> 0) / 0x100000000
}

/** Alto de piso de la casa: el de su estilo, ±15 % según su semilla. */
export function altoDePiso(estilo, semilla) {
  const base = ALTO_PISO_ESTILO[estilo] ?? ALTO_PISO_POR_DEFECTO
  return base * (1 - VARIACION_ALTO + 2 * VARIACION_ALTO * azar(semilla, 7))
}

/** Con qué se cubre una casa de ese estilo en la época dada (0 = 1578 … 5 = 1936). */
export function cubiertaDe(estilo, semilla, epoca) {
  if (estilo === MODERNO) return CUBIERTA.AZOTEA
  if (estilo === PUBLICO) return epoca <= 2 ? CUBIERTA.TEJA : CUBIERTA.AZOTEA // hasta 1843 no hay azoteas
  if (estilo === RANCHO || estilo === GALPON) return CUBIERTA.ZINC
  if (estilo === ECLECTICO && azar(semilla, 6) < 0.5) return CUBIERTA.AZOTEA
  return CUBIERTA.TEJA
}

/**
 * Las etapas de una casa: su historia (un byte por época: estilo + 16·pisos; tools/geo/estilos.py)
 * partida donde cambia la forma de su techo (la cubierta o los pisos). Cambiar de fachada (de colonial
 * a republicana) no hace otra etapa: es la misma casa, a la que el shader le sube el pretil. Cada
 * etapa trae el estilo con que arranca, sus pisos, su vida [nace, muere) y si en algún momento lleva
 * alero o pretil. Sin historia, una sola etapa con lo que dice el techo. `conAlas`: la casa trae alas
 * del dato (es de patio mientras su fachada lo sea).
 */
export function etapasDe({ estilo, pisos, semilla, nace = 0, muere = 0 }, historia = null, { conAlas = false } = {}) {
  const pretil = DE_PRETIL.includes(estilo)
  if (!historia) return [{ estilo, pisos, nace, muere, conAlero: !pretil, conPretil: pretil }]
  const etapas = []
  let clave = null
  for (let e = nace; e < (muere || EPOCAS); e++) {
    const [est, alt] = [historia[e] % 16, Math.floor(historia[e] / 16) || pisos]
    // una casa con alas (conAlas) cambia de forma también cuando deja de ser de patio: pasa a techarse entera
    const nueva = `${cubiertaDe(est, semilla, e)}·${alt}·${est === QUINTA}·${est === GALPON}·${conAlas && ESTILOS_DE_PATIO.includes(est)}`
    if (nueva !== clave) {
      if (etapas.length) etapas[etapas.length - 1].muere = e
      etapas.push({ estilo: est, pisos: alt, nace: e, muere, conAlero: false, conPretil: false })
      clave = nueva
    }
    const actual = etapas[etapas.length - 1]
    if (DE_PRETIL.includes(est)) actual.conPretil = true
    else actual.conAlero = true
  }
  return etapas.length ? etapas : [{ estilo, pisos, nace, muere, conAlero: !pretil, conPretil: pretil }]
}

/**
 * Cuál de los cuatro lados del rectángulo de la casa es el frente. `largos` = largo de cada lado;
 * `libres` = qué parte de lo que hay justo afuera de cada lado está sin casas (0..1). El frente es
 * el lado libre (la calle); si hay varios, el más largo. Si no hay ninguno, el más despejado y, a
 * igualdad, uno corto (los lotes son tiras perpendiculares a su calle).
 */
export function elegirFrente(largos, libres) {
  const indices = [0, 1, 2, 3]
  const sueltos = indices.filter((k) => libres[k] >= LADO_LIBRE)
  if (sueltos.length) return sueltos.reduce((m, k) => (largos[k] > largos[m] + 1e-6 ? k : m))
  return indices.reduce((m, k) => {
    if (libres[k] > libres[m] + 0.05) return k
    return Math.abs(libres[k] - libres[m]) <= 0.05 && largos[k] < largos[m] - 1e-6 ? k : m
  })
}

// --- faldones ---

const rect = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]
const faldon = (region, cubierta, cumbre, origen, caida, tan, extra = {}) => ({ region, cubierta, cumbre, origen, caida, tan, borde: 0, ...extra })
const plano = (region, h, cubierta, borde = 0) => faldon(region, cubierta, h, region[0], [0, 0], 0, { borde })
const transponer = (f) => ({ ...f, region: f.region.map(([a, b]) => [b, a]), origen: [f.origen[1], f.origen[0]], caida: [f.caida[1], f.caida[0]] })

/**
 * Dos aguas sobre el rectángulo, con la cumbrera a lo largo de u en el medio de v; `alero` = altura
 * del borde bajo. Con cadera en un extremo, ese extremo va a cuatro aguas (si el largo alcanza).
 */
function dosAguas({ u0, u1, v0, v1, alero, tan, cubierta, caderaIzq = false, caderaDer = false }) {
  const medio = (v1 - v0) / 2
  const vm = v0 + medio
  const caben = u1 - u0 >= medio * (Number(caderaIzq) + Number(caderaDer)) + 0.5
  const [ki, kd] = [caben && caderaIzq ? medio : 0, caben && caderaDer ? medio : 0]
  const cumbre = alero + medio * tan
  const lista = [
    faldon([[u0, v0], [u1, v0], [u1 - kd, vm], [u0 + ki, vm]], cubierta, cumbre, [u0, vm], [0, -1], tan),
    faldon([[u0 + ki, vm], [u1 - kd, vm], [u1, v1], [u0, v1]], cubierta, cumbre, [u0, vm], [0, 1], tan),
  ]
  if (ki > 0) lista.push(faldon([[u0, v0], [u0 + ki, vm], [u0, v1]], cubierta, cumbre, [u0 + ki, vm], [-1, 0], tan))
  if (kd > 0) lista.push(faldon([[u1, v0], [u1, v1], [u1 - kd, vm]], cubierta, cumbre, [u1 - kd, vm], [1, 0], tan))
  return lista
}

/** Lo mismo con la cumbrera a lo largo de v. */
function dosAguasAlFondo({ u0, u1, v0, v1, ...resto }) {
  return dosAguas({ u0: v0, u1: v1, v0: u0, v1: u1, ...resto }).map(transponer)
}

/** La pendiente que no sube más de `subida` en `medio` metros. */
const tanAcotada = (tan, medio, subida = SUBIDA_MAXIMA_M) => (medio > 1e-6 ? Math.min(tan, subida / medio) : tan)

/**
 * Crujías paralelas, bajas, cada una a dos aguas y con la cumbrera a lo largo del lado largo: para los
 * polígonos irregulares, donde no hay frente ni patio que seguir (el mar de tejados de la foto de 1903).
 */
function crujiasParalelas({ L, D, alero, tan, cubierta, nave = FONDO_CRUJIA_PARALELA_M }) {
  const aLoLargoDeU = D <= L
  const ancho = aLoLargoDeU ? D : L
  const n = Math.max(1, Math.round(ancho / nave))
  const paso = ancho / n
  const medidas = { alero, cubierta, tan: tanAcotada(tan, paso / 2, SUBIDA_IRREGULAR_M) }
  return Array.from({ length: n }, (_, i) => (aLoLargoDeU
    ? dosAguas({ u0: 0, u1: L, v0: i * paso, v1: (i + 1) * paso, ...medidas })
    : dosAguasAlFondo({ u0: i * paso, u1: (i + 1) * paso, v0: 0, v1: D, ...medidas }))).flat()
}

/** Azotea con su pretil alrededor; en algunas, la caseta de la escalera. */
function azotea({ L, D, alto, semilla }) {
  const losa = (region) => plano(region, alto - BORDE_AZOTEA_M, CUBIERTA.AZOTEA, BORDE_AZOTEA_M)
  if (Math.min(L, D) < 8 || azar(semilla, 21) > 0.45) return [losa(rect(0, L, 0, D))]
  const [cl, cd] = [3, 2.6]
  const u0 = 1.5 + azar(semilla, 22) * (L - cl - 3)
  const v0 = 1.5 + azar(semilla, 23) * (D - cd - 3)
  return [
    losa(rect(0, u0, 0, D)), losa(rect(u0 + cl, L, 0, D)), losa(rect(u0, u0 + cl, 0, v0)), losa(rect(u0, u0 + cl, v0 + cd, D)),
    plano(rect(u0, u0 + cl, v0, v0 + cd), alto + 1.5, CUBIERTA.AZOTEA),
  ]
}

/**
 * Lo que va detrás de la crujía del frente en una casa sin alas (chica, o sin marco): un cuerpo más bajo
 * con la cumbrera hacia el fondo si el lote es angosto; si no, crujías bajas paralelas a la calle. Los
 * patios no se inventan acá: las casas de patio traen sus alas del dato (src/alas.js).
 */
function fondoDeLote({ L, D, c, alero, tan, cubierta }) {
  const bajo = Math.max(alero - 0.4, ALTO_MINIMO_ALA_M)
  if (L < ANCHO_SIN_PATIO_M) return dosAguasAlFondo({ u0: 0, u1: L, v0: c, v1: D, alero: bajo, tan: tanAcotada(tan, L / 2, 1.3), cubierta })
  const n = Math.max(1, Math.round((D - c) / FONDO_CRUJIA_PARALELA_M))
  const paso = (D - c) / n
  return Array.from({ length: n }, (_, i) => dosAguas({
    u0: 0, u1: L, v0: c + i * paso, v1: c + (i + 1) * paso, alero: bajo, tan: tanAcotada(tan, paso / 2, SUBIDA_IRREGULAR_M), cubierta,
  })).flat()
}

/** La casa de teja: la crujía del frente con la cumbrera paralela a la calle y, si el lote da, el resto. */
function casaDeTeja({ L, D, alero, tan, cubierta, semilla, caderaIzq, caderaDer, fondoCrujia }) {
  const c0 = fondoCrujia ?? 6 + 1.5 * azar(semilla, 12)
  const c = D <= FONDO_UNA_CRUJIA_M || D - c0 < RESTO_MINIMO_M ? D : c0
  const crujia = dosAguas({ u0: 0, u1: L, v0: 0, v1: c, alero, tan: tanAcotada(tan, c / 2), cubierta, caderaIzq, caderaDer })
  return c < D ? [...crujia, ...fondoDeLote({ L, D, c, alero, tan, cubierta })] : crujia
}

/** Dos (o cuatro) aguas con la cumbrera siguiendo el lado largo: ranchos, quintas y galpones. */
function aLoLargo({ L, D, cuatro = false, ...resto }) {
  const dos = { u0: 0, u1: L, v0: 0, v1: D, caderaIzq: cuatro, caderaDer: cuatro, ...resto }
  return D <= L ? dosAguas({ ...dos, tan: tanAcotada(resto.tan, D / 2) }) : dosAguasAlFondo({ ...dos, tan: tanAcotada(resto.tan, L / 2) })
}

/**
 * El plan del techo de una casa (o de una de sus etapas). `ancho` (a lo largo del frente) y `fondo`
 * son los lados de su rectángulo; `libres` dice qué otros lados dan a la calle (izq, der, fondo);
 * `lleno`, qué parte del rectángulo ocupa la huella; `conAlero` y `conPretil`, si en algún momento de
 * la etapa la fachada lleva lo uno o lo otro (por defecto, lo que diga el estilo); `crujia`, el fondo de
 * la crujía del frente si lo fija la manzana (si no, sale de la semilla). Devuelve las
 * medidas del lote, la altura de la pared del frente (`alto` = pisos × altoPiso, donde arranca el
 * tejado), cuánto vuela el alero, cuánto sube el pretil sobre ese arranque, y los faldones.
 */
export function planDeTecho({
  ancho: L, fondo: D, estilo, pisos, semilla, nace = 5, libres = {}, lleno = 1, crujia = null,
  conAlero = !DE_PRETIL.includes(estilo), conPretil = DE_PRETIL.includes(estilo),
}) {
  const altoPiso = altoDePiso(estilo, semilla)
  const alto = pisos * altoPiso
  const base = { ancho: L, fondo: D, alto, altoPiso, pisos, alero: 0, pretil: 0 }
  const cubierta = cubiertaDe(estilo, semilla, nace)
  if (cubierta === CUBIERTA.AZOTEA) return { ...base, faldones: azotea({ L, D, alto, semilla }) }
  if (cubierta === CUBIERTA.ZINC) {
    // ranchos y galpones: la cumbrera a lo largo, y la chapa vuela un poco
    return { ...base, alero: estilo === GALPON ? 0.5 : 0.3, faldones: aLoLargo({ L, D, alero: alto, tan: TAN_ZINC, cubierta }) }
  }
  const medidas = { ...base, alero: conAlero ? 0.5 + 0.3 * azar(semilla, 9) : 0, pretil: conPretil ? PRETIL_M : 0 }
  const tan = Math.tan(((25 + 5 * azar(semilla, 11)) * Math.PI) / 180)
  // (las grandes —conventos, mercados—, con naves más anchas)
  if (lleno < LLENO_MINIMO) return { ...medidas, faldones: crujiasParalelas({ L, D, alero: alto, tan, cubierta, nave: Math.min(L, D) > 40 ? NAVE_PUBLICA_M : undefined }) }
  // lo público de teja (iglesias, conventos, cuarteles hasta 1843): naves anchas, a lo largo
  if (estilo === PUBLICO) return { ...medidas, faldones: crujiasParalelas({ L, D, alero: alto, tan, cubierta, nave: NAVE_PUBLICA_M }) }
  if (estilo === QUINTA) return { ...medidas, faldones: aLoLargo({ L, D, alero: alto, tan, cubierta, cuatro: true }) }
  // en una esquina, el extremo de la crujía que da a la otra calle va a cuatro aguas (si el largo alcanza):
  // el alero, o el pretil, dan la vuelta a la esquina
  const cadera = (libre) => Boolean(libre)
  return {
    ...medidas,
    faldones: casaDeTeja({ L, D, alero: alto, tan, cubierta, semilla, caderaIzq: cadera(libres.izq), caderaDer: cadera(libres.der), fondoCrujia: crujia ?? undefined }),
  }
}

/** Cuánto ha bajado el faldón (en planta, m) desde su cumbre hasta el punto (u, v): negativo, del otro lado. */
export const bajadaEn = (f, u, v) => (u - f.origen[0]) * f.caida[0] + (v - f.origen[1]) * f.caida[1]

/**
 * Altura del faldón (sobre la base de la casa) en el punto (u, v) del lote. Un ala estirada fuera del lote
 * (src/alas.js) sigue plana más allá de su cumbre y de su alero (`f.bajada`): ni sube más ni se mete bajo tierra.
 */
export function alturaDe(f, u, v) {
  return f.cumbre - f.tan * Math.min(f.bajada ?? Infinity, Math.max(0, bajadaEn(f, u, v)))
}

const TOLERANCIA_M = 1e-7

/** ¿El punto cae en la región (convexa) del faldón? */
function contiene(region, u, v) {
  let signo = 0
  for (let k = 0; k < region.length; k++) {
    const [p, q] = [region[k], region[(k + 1) % region.length]]
    const lado = (q[0] - p[0]) * (v - p[1]) - (q[1] - p[1]) * (u - p[0])
    if (Math.abs(lado) < TOLERANCIA_M) continue
    if (signo === 0) signo = Math.sign(lado)
    else if (Math.sign(lado) !== signo) return false
  }
  return true
}

/** El faldón que cubre el punto (u, v) del lote, o null si cae fuera. */
export function faldonEn(plan, u, v) {
  return plan.faldones.find((f) => contiene(f.region, u, v)) ?? null
}
