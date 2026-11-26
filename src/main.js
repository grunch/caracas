import {
  WebGLRenderer, Scene, PerspectiveCamera, PlaneGeometry, Mesh, BufferAttribute,
  CanvasTexture, TextureLoader, SRGBColorSpace, Color, Timer, HemisphereLight, DirectionalLight, LinearFilter,
} from 'three'
import { cargarPak } from './pak.js'
import { pedirDato } from './temprano.js'
import { crearMascara } from './mascaras.js'
import { registrarServiceWorker, avisarLoBajado } from './registrar-sw.js'
import { crearPlanoPorNiveles, nivelNecesario, NIVEL_CHICO, NIVEL_4K } from './plano-niveles.js'
import { crearCasas } from './casas.js'
import { pedirCiudad } from './ciudad-pedido.js'
import { crearMaterialCiudad, crearMaterialSombraCiudad } from './material.js'
import { cargarArboles } from './arboles.js'
import { HITOS, crearHitos, suprimirTechos, zonasDeSupresion } from './hitos.js'
import { pedirHitos } from './hitos-pedido.js'
import { acercar, pasoDeCuadro } from './animar.js'
import { texturasHoy, HOY_CERCA } from './hoy.js'
import { crearBuscador } from './buscador/interfaz.js'
import { crearTeselasFinas } from './teselas.js'
import { crearLineaDeTiempo, crearSecuencia, escalaCrece, PRIMERA_EPOCA } from './epocas.js'
import { crearPlanosDeEpoca, planoDeEpoca } from './planos.js'
import { cargarCallesDeEpoca } from './calles-epoca.js'
import { SIN_PLANO } from './shader/plano.js'
import { crearCoords } from './coords.js'
import { crearCamara } from './camara.js'
import { cargarCalles, crearRotulos } from './calles.js'
import { decodificarRelieve, crearRelieve, uniformsRelieve, ponerRelieve, alturaSuelo, hinchado, subdivisionDeLaHoja, terrazasDeHitos } from './relieve.js'
import { COLOR_MESA } from './mesa.js'
import { vectorSol, ajustesDeAcabado, esRenderPorSoftware } from './luz.js'
import { crearAcabado } from './acabado.js'
import { normalizarMarcas, distanciaDeVuelo } from './marcas.js'
import { crearCapaMarcas } from './marcas-capa.js'
import { MARCAS } from './marcas-datos.js'
import { ordenDeVitrina } from './vitrina.js'
import './marcas.css'
import { crearVisorDePlano } from './visor-plano-panel.js'
import './visor-plano.css'
import { engancharFichas } from './ficha-panel.js'
import { crearAcerca } from './acerca-panel.js'
import { leerCreditos } from './acerca.js'
import { debeMostrarIntro, recordarIntro } from './intro.js'
import { debeArrancar, esperaDeArranque, velocidadDeOla, vistaDeHoja, VISTA_CENTRO, DURACION_VUELO_S } from './arranque.js'
import { accionDeTecla, movimientoDeTecla } from './controles.js'
import { esLiviano, esMinimo, proporcionDePixeles, cuantosTrabajadores } from './calidad.js'
import { crearResolucionAdaptable } from './resolucion.js'
import { crearPanelDeMedicion } from './medir-panel.js'
import { NIVELES } from './plano-niveles.js'
import { crearModoAPie } from './a-pie-modo.js'
import { hitosConPlanta } from './hitos/plantas.js'
import { crearModoVolar } from './volar-modo.js'
import { crearModoManejar } from './manejar-modo.js'
import { crearMenuRecorrer } from './recorrer.js'
import { crearCielo, cieloDeModo } from './cielo.js'

const params = new URLSearchParams(location.search)
const EXAGERACION = 1.3 // el valle se lee mejor con el relieve un poco exagerado

// --- la bienvenida y el «Acerca» (src/acerca-panel.js): antes que nada, para que la bienvenida se vea mientras
// carga el plano y sus teclas valgan antes que las de los demás paneles. No esperan a nada ni frenan la carga ---
const crecePedido = pedirDato('datos/crece.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
crecePedido.catch(() => {}) // sin crece.json (la demo de CI) no hay línea de tiempo: se avisa más abajo
// lo que cada acción de src/controles.js hace acá; las funciones se declaran más abajo
const HACER = {
  color: () => alternarColor(),
  hoy: () => alternarHoy(),
  nombres: () => alternarMarcas(),
  plano: () => visorPlano?.abrir(),
  buscar: () => buscador.enfocar(),
  acerca: () => acerca.abrir(),
}
let listo = false // el módulo terminó de arrancar: ya se puede levantar la ciudad
let crecerPedido = false // «Ver crecer la ciudad» se tocó antes de tiempo: se cumple al estar listo
let andarAlLlegar = false // …o antes de que llegara la línea de tiempo: echa a andar cuando llegue
const almacen = () => localStorage
const conIntro = debeMostrarIntro(params, almacen)
let introCerrada = () => {}
const cierreDeIntro = new Promise((r) => { introCerrada = r })
const acerca = crearAcerca({
  boton: document.getElementById('ayuda'), desde: PRIMERA_EPOCA, acciones: Object.keys(HACER),
  mostrarIntro: conIntro,
  alCerrarIntro: () => { recordarIntro(almacen); introCerrada() },
  alVerCrecer: () => { if (listo) verCrecer(); else crecerPedido = true },
  pedirEpocas: () => crecePedido.then((j) => j.epocas),
  pedirCreditos: () => leerCreditos((url) => fetch(url)),
  commit: typeof __COMMIT__ === 'undefined' ? null : __COMMIT__, // lo pone vite.config.js al construir
})
/** Levanta la ciudad y echa a andar la línea de tiempo (si esta copia la trae). */
function verCrecer() {
  levantar(true)
  if (lineaDeTiempo) lineaDeTiempo.andar(); else andarAlLlegar = true
}

const meta = await pedirDato('datos/ciudad.json')
  .then((r) => { if (!r.ok) throw new Error(`datos/ciudad.json: ${r.status}`); return r.json() })
  .catch((e) => {
    document.getElementById('loading').textContent = 'No se pudo cargar el plano. Recarga la página para intentarlo de nuevo.'
    throw e
  })
const coords = crearCoords(meta.plano)
const { hoja } = coords

const renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
const maxTextura = renderer.capabilities.maxTextureSize
// el nivel mínimo (src/calidad.js) es el liviano y, además, sin sombras, un píxel por punto y un solo worker
const minimo = esMinimo({ params, memoria: navigator.deviceMemory })
const liviano = minimo || esLiviano({ params, maxTextura, pantalla: { ancho: screen.width, alto: screen.height }, memoria: navigator.deviceMemory })
renderer.setPixelRatio(proporcionDePixeles({ dpr: devicePixelRatio, liviano, minimo, captura: params.has('capture') }))
renderer.setSize(innerWidth, innerHeight)
document.getElementById('view').appendChild(renderer.domElement)
// la vista no tiene texto: su nombre accesible dice qué es y cómo se mueve (el resto, en #sobre y en el «Acerca»)
renderer.domElement.setAttribute('role', 'img')
renderer.domElement.setAttribute('aria-label', 'La ciudad en 3D sobre el plano. Muévete con las flechas, gira con Mayús y las flechas, acércate con + y −.')
renderer.domElement.addEventListener('webglcontextrestored', () => location.reload())
const gl = renderer.getContext()
const gpu = gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER)
const porSoftware = esRenderPorSoftware(gpu) // SwiftShader en CI y en los E2E: cuadros de segundos


const scene = new Scene()
scene.background = new Color(COLOR_MESA) // fuera de la hoja: la mesa (src/mesa.js)
const camera = new PerspectiveCamera(35, innerWidth / innerHeight, 5, 60000)

// --- render bajo demanda: solo se dibuja mientras haya cuadros pedidos ---
let pendientes = 3
const pedirCuadro = (n = 2) => { pendientes = Math.max(pendientes, n) }
// (lo que pasa dentro de la caja del buscador, de la bienvenida o del «Acerca» no cambia la vista: escribir
// o leer el panel con la rueda no redibuja la ciudad)
for (const ev of ['pointerdown', 'pointerup', 'keydown', 'wheel', 'focus']) {
  addEventListener(ev, (e) => { if (!e.target?.closest?.('#buscar, #intro, #acerca')) pedirCuadro(3) }, { capture: true, passive: true })
}
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  pedirCuadro(3)
})

// --- luz y material compartido por el suelo y la ciudad ---
scene.add(new HemisphereLight(0xfff4e0, 0x6b5a48, 1.6))
const sol = new DirectionalLight(0xfff1d6, 2.2)
sol.position.fromArray(vectorSol()).multiplyScalar(2500) // la dirección del sol es una sola (src/luz.js)
scene.add(sol)
// el relieve: sus uniforms van en el material; sin relieve.bin la hoja queda lisa
// los hitos de una manzana entera en ladera se asientan en una terraza: el plano de la ladera (src/relieve.js)
const terrazas = terrazasDeHitos(HITOS, coords)
const relieveU = uniformsRelieve(hoja, terrazas)
relieveU.uExageracion.value = Number(params.get('exagerar')) || EXAGERACION
let relieve = null
const ciudad = crearMaterialCiudad({ plano: meta.plano, metro: meta.plano.metro, mapa: cuadriculaProvisoria(), relieve: relieveU })
// el cielo de los recorridos, solo a pie, en coche o en avión: papel en tinta, celeste en color (src/cielo.js)
const cielo = crearCielo({ U: ciudad.U })
scene.add(cielo.malla)

// --- la hoja del plano: el suelo, con el mismo material (pisos = 0 en aInfo), subdividida para
// apoyarse en el relieve ---
const suelo = new PlaneGeometry(hoja.ancho, hoja.alto, ...subdivisionDeLaHoja(porSoftware)).rotateX(-Math.PI / 2)
suelo.translate(hoja.x0 + hoja.ancho / 2, 0, hoja.z0 + hoja.alto / 2)
suelo.setAttribute('aInfo', new BufferAttribute(new Float32Array(suelo.attributes.position.count * 4), 4))
suelo.setAttribute('aAncla', new BufferAttribute(new Float32Array(suelo.attributes.position.count * 2), 2))
scene.add(new Mesh(suelo, ciudad.material))

cargarRelieve().catch((e) => console.warn(`relieve: ${e.message}`))

async function cargarRelieve() {
  const r = await pedirDato('datos/relieve.bin')
  if (!r.ok) throw new Error(`datos/relieve.bin: ${r.status}`)
  relieve = crearRelieve(decodificarRelieve(await r.arrayBuffer()), hoja, terrazas)
  ponerRelieve(relieveU, relieve)
  casas.ponerRelieve(alturaDelTerreno)
  pedirCuadro(3)
}

/**
 * Carga progresiva (src/plano-niveles.js): primero.webp (1024) para el primer cuadro y después chico (2048).
 * Los de 4096 y 8192 se piden recién cuando la vista se acerca tanto que hacen falta (en el ciclo de render);
 * con ellos suben también las máscaras de suelo y de rótulos. Las teselas finas de 3072 van aparte.
 */
const planoBase = crearPlanoPorNiveles({
  cargar: (url) => cargarTextura(url, true),
  poner: (t) => ponerTextura(ciudad.U.uMapa, t),
  alSubir: (nivel) => { if (nivel >= NIVEL_4K) mejorarMascaras() },
})
async function cargarPlano() {
  await planoBase.pedir(0) // sin el primero no hay plano: queda la cuadrícula
  // si el chico falla, un cuadro más: con el render quieto, nadie volvería a mirar qué nivel pide la vista
  await planoBase.pedir(NIVEL_CHICO).catch(() => pedirCuadro(3))
}
// (después de crear planoBase: llamarla antes fallaba sin avisar y la hoja quedaba con la cuadrícula)
cargarPlano().catch(() => { /* todavía no hay escaneo procesado: queda la cuadrícula */ })

async function cargarTextura(url, esColor) {
  const t = await new TextureLoader().loadAsync(url)
  if (esColor) t.colorSpace = SRGBColorSpace // la máscara de suelo son datos, no color
  t.anisotropy = renderer.capabilities.getMaxAnisotropy()
  return t
}

/** Un campo de datos (las calles de época): sin espacio de color ni mipmaps, que promediarían distancias. */
async function cargarCampo(url) {
  const t = await cargarTextura(url, false)
  t.generateMipmaps = false
  t.minFilter = LinearFilter
  return t
}

function ponerTextura(uniforme, t) {
  const anterior = uniforme.value
  uniforme.value = t
  // las ranuras de teselas inactivas usan el plano general de respaldo: que no queden con el liberado
  ciudad.U.uFino.value = ciudad.U.uFino.value.map((v) => (v === anterior ? t : v))
  anterior?.dispose()
  pedirCuadro(3)
}

// --- teselas finas: de cerca, las cuatro de 3072 px que rodean lo que se mira ---
const DIST_TESELAS_M = 2000 // más cerca que esto, un texel de la textura de 8192 (~1,1 m) ocupa más de un píxel
let teselas = null
fetch('plano/laminas.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status)))).then((laminas) => {
  if (laminas.tesela > maxTextura) return // la GPU no las admite: queda la textura general
  teselas = crearTeselasFinas({
    laminas, cargar: (url) => cargarTextura(url, true), U: ciudad.U, pedirCuadro, respaldo: () => ciudad.U.uMapa.value,
  })
  pedirCuadro(3) // si la cámara ya está cerca y el render quedó quieto, que empiece a pedir teselas
}).catch((e) => console.warn(`teselas: ${e.message}`))

// --- la ciudad y la ola (sale de la plaza y se apura hacia las orillas: src/arranque.js) ---
let olaObjetivo = 0
// la ola llega hasta la esquina más lejana de la hoja (el terreno se hincha en toda ella)
let olaMax = Math.hypot(Math.max(-hoja.x0, hoja.x0 + hoja.ancho), Math.max(-hoja.z0, hoja.z0 + hoja.alto)) + ciudad.U.uAnchoOla.value
let arboles = null
let datosCiudad = null // las partes de ciudad.pak, con la vida que dejan los hitos: el modo a pie choca con ellas
let casasListas = false
const sinTrabajadores = params.has('sintrabajador') || typeof Worker !== 'function'
// las casas, una malla por baldosa (src/casas.js): van llegando de a una, las del centro primero
// (sus arreglos se sueltan al subirlos a la GPU: son cientos de MB; ?arreglos los conserva, para depurar)
const casas = crearCasas({ material: ciudad.material, materialDeSombra: crearMaterialSombraCiudad(ciudad.U), soltarArreglos: !params.has('arreglos') })
scene.add(casas.grupo)
// hasta dónde sube el shader lo que está en (x, z) con la ciudad en pie: para la caja de cada baldosa
const alturaDelTerreno = (x, z) => relieve.alturaEn(x, z) * relieveU.uExageracion.value
let primerasCasas = () => {}
/** Llegó lo que se ve en la época con que abre el sitio: la entrada ya puede levantar la ciudad. */
const primerasCasasPedidas = new Promise((ok) => { primerasCasas = ok })
// las casas se levantan en workers, para que la página no se congele mientras tanto (src/ciudad-pedido.js);
// ?sintrabajador las levanta en este hilo (para comparar, o si los workers dan problemas)
const crearTrabajador = sinTrabajadores ? null
  : () => new Worker(new URL('./ciudad-trabajador.js', import.meta.url), { type: 'module' })
const detalleColonial = params.get('detallecasas') === '1' && !minimo
  ? (await import('./detalle-colonial.js')).crearDetalleColonial({coords,U:ciudad.U,liviano:liviano||porSoftware}) : null
if(detalleColonial)scene.add(detalleColonial.grupo)

const casasPedidas = cargarPak('datos/ciudad.pak', { vertices: Float32Array, techos: Uint32Array, vida: Uint32Array, historia: Uint8Array, marcos: Float32Array, alas: Float32Array, vuelos: Uint8Array, paletas: Uint8Array }, pedirDato).then((datos) => {
  // donde hay un hito modelado a mano, la casa genérica de ese lugar no nace (src/hitos/suprimir.js)
  datosCiudad = { ...datos, vida: suprimirTechos(datos, zonasDeSupresion(HITOS)) }
  return pedirCiudad({
    datos: datosCiudad, plano: meta.plano, crearTrabajador,
    // primero lo que se ve en la época con que abre el sitio; el resto, después
    primera: PRIMERA_EPOCA, cuantos: cuantosTrabajadores({ nucleos: navigator.hardwareConcurrency, liviano, software: porSoftware, minimo }),
    alLlegar(baldosa) {
      detalleColonial?.agregar(baldosa.paquete)
      casas.agregar(baldosa)
      olaMax = Math.max(olaMax, casas.alcance + 400)
      pedirCuadro(3)
    },
    alTerminarPase(pase) { if (pase === 0) primerasCasas() },
  })
}).then(() => {
  casasListas = true
  detalleColonial?.finalizar()
  pedirCuadro(3)
}).catch((e) => console.warn(`ciudad: ${e.message}`)).finally(() => primerasCasas()) // con casas o sin ellas, la entrada sigue
casasPedidas.then(() => {
  // los árboles, después de la ciudad entera (quien espera a los árboles sabe que ya llegó todo lo demás)
  // los árboles, después de la ciudad: una malla instanciada que comparte sus uniforms (src/arboles.js)
  return cargarArboles('datos/arboles.bin', { coords, U: ciudad.U, reservas: HITOS }).then((m) => {
    arboles = m
    scene.add(m)
    pedirCuadro(3)
  })
}).catch((e) => console.warn(`árboles: ${e.message}`))

// --- los hitos: edificios y lugares modelados a mano, en una sola malla con los uniforms de la ciudad ---
// (se construyen en un worker: en este hilo eran más de un segundo y medio de página congelada al arrancar)
let hitos = null
const hitosPedidos = pedirHitos({
  plano: meta.plano,
  crearTrabajador: sinTrabajadores ? null : () => new Worker(new URL('./hitos-trabajador.js', import.meta.url), { type: 'module' }),
}).then((datos) => {
  hitos = crearHitos({ coords, U: ciudad.U, datos })
  scene.add(hitos)
  pedirCuadro(3)
}).catch((e) => console.warn(`hitos: ${e.message}`))

// --- la línea de tiempo: 1578 → 1936; cada época llega como una ola desde la plaza ---
const DURACION_EPOCA_S = 3.5
const OLA_EPOCA_MAX_M = 9000 // más que la distancia de la plaza a la esquina más lejana de la hoja
// la ola espera al plano de su época (el nivel chico) hasta este tiempo; si no llega, sale igual con el
// de 1936 debajo y el plano viejo aparece cuando llegue
const ESPERA_PLANO_MS = 2500
let lineaDeTiempo = null
let epocaPedida = null // la época que pidió la vitrina antes de que llegara la línea de tiempo (crece.json)
let visorPlano = null // el plano de la época, aparte (P; src/visor-plano-panel.js)
let secuencia = null
let planos = null
// el plano calzado de cada época (plano/epocas.json, tools/planos-epocas.mjs); sin él, siempre 1936
// (con un tope: si el índice no responde, la línea de tiempo arranca igual)
const ESPERA_INDICE_MS = 5000
// Apagado por omisión: el plano viejo pegado como un parche sobre el de 1936 se ve mal. Queda detrás de
// ?planos hasta rehacerlo (T25b): en tinta, la hoja muestra siempre el plano de 1936.
const indicePlanos = !params.has('planos') ? Promise.resolve({ planos: [] }) : Promise.race([
  fetch('plano/epocas.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status)))),
  new Promise((_, mal) => setTimeout(() => mal(new Error('plano/epocas.json no respondió')), ESPERA_INDICE_MS)),
]).catch((e) => { console.warn(`planos de época: ${e.message}`); return { planos: [] } })
Promise.all([crecePedido, indicePlanos])
  .then(([{ epocas, celda_m }, indice]) => {
    const U = ciudad.U
    planos = crearPlanosDeEpoca({
      planos: indice.planos, hoja: meta.plano, cargar: (url) => cargarTextura(url, true), U, pedirCuadro,
      vacio: SIN_PLANO, liviano, maxTextura,
    })
    const planoDe = (i) => planoDeEpoca(epocas[i]?.año, indice.planos)?.año ?? null
    // arranca en la primera época sin ola; después, una ola por vez (lo elegido durante una, espera)
    U.uEpocaDe.value = U.uEpocaA.value = PRIMERA_EPOCA
    U.uOlaEpoca.value = OLA_EPOCA_MAX_M
    planos.usar(planoDe(PRIMERA_EPOCA), planoDe(PRIMERA_EPOCA))
    secuencia = crearSecuencia((de, a) => {
      const esperar = new Promise((ok) => setTimeout(ok, ESPERA_PLANO_MS))
      Promise.race([planos.preparar(planoDe(a)), esperar]).then(() => {
        planos.usar(planoDe(de), planoDe(a))
        planos.preparar(planoDe(a + 1)) // ▶ las recorre en orden: la siguiente, precargada
        U.uEpocaDe.value = de
        U.uEpocaA.value = a
        U.uOlaEpoca.value = 0
        pedirCuadro(3)
      })
    }, PRIMERA_EPOCA)
    lineaDeTiempo = crearLineaDeTiempo({
      contenedor: document.getElementById('epocas'), epocas, desde: PRIMERA_EPOCA,
      alElegir: (i) => { secuencia.elegir(i); visorPlano?.elegir(epocas[i]) },
    })
    visorPlano = crearVisorDePlano({
      contenedor: document.getElementById('epocas'), liviano, añoBase: epocas.at(-1).año,
      base: ['plano/chico.webp', liviano ? 'plano/medio-4k.webp' : 'plano/medio.webp'],
      indice: () => fetch('plano/epocas.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status)))).then((j) => j.planos),
    })
    visorPlano.elegir(epocas[lineaDeTiempo.actual])
    pedirMascaras() // el agua, para la hoja en tinta de antes de 1936
    // las calles de 1772 sobre el suelo liso de su época (src/calles-epoca.js); con ?planos se ve el plano de la época
    if (!params.has('planos')) {
      cargarCallesDeEpoca(1772, { U, plano: meta.plano, epocas, cargar: cargarCampo })
        .then(() => pedirCuadro(3))
        .catch((e) => console.warn(`calles de época: ${e.message}`))
    }
    if (epocaPedida !== null) lineaDeTiempo.elegir(epocaPedida)
    if (andarAlLlegar) lineaDeTiempo.andar()
    cargarTextura('plano/crece.png', false).then((t) => {
      // etapas codificadas: un mipmap las promediaría y el borde de la ciudad cambiaría de época a lo lejos
      t.generateMipmaps = false
      t.minFilter = LinearFilter
      const { width: cols, height: rows } = t.image
      U.uCreceEscala.value.fromArray(escalaCrece(meta.plano, { cols, rows }, celda_m ?? 8))
      ponerTextura(U.uCrece, t)
    }).catch((e) => console.warn(`crece: ${e.message}`))
  }).catch((e) => console.warn(`épocas: ${e.message}`)) // sin crece.json (p. ej. la demo de CI): la ciudad entera, sin línea de tiempo

let olaElegida = false // alguien levantó o acostó la ciudad: la entrada (arrancar) no la vuelve a levantar
function levantar(arriba = olaObjetivo === 0) {
  olaElegida = true
  olaObjetivo = arriba ? olaMax : 0
  pedirCuadro(3)
}

// --- tinta ⇄ color: la máscara de suelo y la de rótulos del plano las usan el color y, antes de 1936, la
// hoja en tinta (src/shader/papel.js): se bajan cuando arranca la línea de tiempo o se prende el color ---
const DURACION_COLOR_S = 1.2
let colorObjetivo = 0
// las máscaras van al paso del plano (src/mascaras.js): de 2048 mientras alcanza el plano chico; las de 4096,
// cuando la vista se acerca (mejorarMascaras) y el equipo no es liviano
const mascaraDeSuelo = crearMascara({
  nombre: 'suelo', chica: 'plano/suelo-2k.webp', completa: 'plano/suelo.webp',
  cargar: (url) => cargarTextura(url, false), poner: (t) => ponerTextura(ciudad.U.uSuelo, t),
})
// sin la máscara de rótulos todo anda igual: el plano se marca entero, con sus nombres
const mascaraDeRotulos = crearMascara({
  nombre: 'rótulos del plano', chica: 'plano/rotulos-2k.webp', completa: 'plano/rotulos.webp',
  cargar: (url) => cargarTextura(url, false), poner: (t) => ponerTextura(ciudad.U.uRotulos, t),
})
function pedirMascaras() {
  mascaraDeSuelo.pedir()
  mascaraDeRotulos.pedir()
}
function mejorarMascaras() {
  if (liviano) return
  mascaraDeSuelo.mejorar()
  mascaraDeRotulos.mejorar()
}
function alternarColor(prender = colorObjetivo === 0) {
  colorObjetivo = prender ? 1 : 0
  const boton = document.getElementById('color')
  boton.setAttribute('aria-pressed', String(prender))
  boton.classList.toggle('on', prender)
  // un botón de ícono (la gota): lo que hace va en su nombre accesible y en su título
  const accion = prender ? 'Ver en tinta' : 'Ver en color'
  boton.setAttribute('aria-label', accion)
  boton.title = `${accion} (C)`
  if (prender) pedirMascaras()
  pedirCuadro(3)
}

// --- lo de hoy (H): la Caracas actual en rojo; sus texturas se bajan la primera vez que se prende ---
const DURACION_HOY_S = 0.8
let hoyObjetivo = 0
let hoyPedido = null
function alternarHoy(prender = hoyObjetivo === 0) {
  hoyObjetivo = prender ? 1 : 0
  const boton = document.getElementById('hoy')
  boton.setAttribute('aria-pressed', String(prender))
  boton.classList.toggle('on', prender)
  document.body.classList.toggle('hoy', prender)
  if (prender) hoyPedido ??= cargarHoy().catch((e) => { hoyPedido = null; console.warn(`hoy: ${e.message}`) })
  if (prender) callesPedidas ??= cargarRotulos().catch((e) => { callesPedidas = null; console.warn(`calles: ${e.message}`) })
  pedirCuadro(3)
}

// --- los nombres de las calles de hoy: un canvas 2D sobre la vista, sin eventos (src/calles.js) ---
let rotulos = null
let callesPedidas = null
async function cargarRotulos() {
  const indice = await cargarCalles('datos/', coords)
  const lienzo = Object.assign(document.createElement('canvas'), { id: 'calles' })
  lienzo.setAttribute('aria-hidden', 'true')
  lienzo.style.pointerEvents = 'none'
  renderer.domElement.after(lienzo)
  rotulos = crearRotulos({
    lienzo, indice, altura: sueloEn,
    tamaño: () => ({ ancho: innerWidth, alto: innerHeight, dpr: params.has('capture') ? 1 : devicePixelRatio }),
  })
  pedirCuadro(3)
}

/** La de lejos primero (sin ella no hay nada que estampar); la de cerca, después y si se puede. */
async function cargarHoy() {
  const U = ciudad.U
  const [lejos, cerca] = texturasHoy({ maxTextura, liviano })
  const t = await cargarTextura(lejos, false) // datos, no color: sin sRGB
  U.uHoyLejosRes.value.set(t.image.width, t.image.height)
  ponerTextura(U.tHoyLejos, t)
  if (cerca !== HOY_CERCA) return
  cargarTextura(cerca, false).then((c) => {
    U.uHoyCercaRes.value.set(c.image.width, c.image.height)
    ponerTextura(U.tHoyCerca, c)
    U.uHoyCercaOn.value = 1
  }).catch((e) => console.warn(`hoy de cerca: ${e.message}`))
}

document.getElementById('color').addEventListener('click', () => alternarColor())
document.getElementById('hoy').addEventListener('click', () => alternarHoy())
addEventListener('keydown', (e) => {
  // la vista con el teclado: flechas, Mayús y flechas, + y − (WCAG 2.1.1; la ayuda sale de la misma tabla)
  const movimiento = movimientoDeTecla(e)
  if (movimiento) {
    e.preventDefault()
    girarVitrina = false // quien mueve la vista con el teclado la maneja (en la vitrina deja de girar)
    if (movimiento.tipo === 'mover') cam.mover(movimiento.dx, movimiento.dy)
    else if (movimiento.tipo === 'girar') cam.girar(movimiento.giro, movimiento.inclinar)
    else cam.acercar(movimiento.veces)
    return
  }
  // los atajos salen de la tabla de src/controles.js (la misma que muestra el «Acerca»); los controles con
  // foco conservan su teclado (Espacio activa el botón, se escribe en los campos)
  const accion = accionDeTecla(e, Object.keys(HACER))
  if (!accion) return
  e.preventDefault()
  HACER[accion.id]()
})

// la altura del suelo tal como se dibuja: la cámara mira siempre al terreno
const sueloEn = (x, z) => alturaSuelo(relieve, x, z,
  { ola: ciudad.U.uOla.value, anchoOla: ciudad.U.uAnchoOla.value, exageracion: relieveU.uExageracion.value })
const cam = crearCamara(camera, renderer.domElement, { pedirCuadro, hoja, suelo: sueloEn })

// --- los modos de recorrido: a pie (T60) y en avión (T61); mientras duran, la cámara del mapa espera ---
const avisoModo = document.getElementById('modo')
const TEXTO_MODO = Object.freeze({
  caminar: { boton: 'Caminar', titulo: 'A pie', raton: 'WASD o flechas para caminar, Mayús para correr, arrastra para mirar. Esc vuelve al mapa.', dedos: 'El dedo de la izquierda camina; el de la derecha mira.' },
  manejar: { boton: 'Manejar', titulo: 'En coche', raton: 'W y S aceleran y frenan, A y D giran, V cambia la vista, B la bocina, O el sonido, N otro vehículo, Q y E el año. Esc se baja.', dedos: 'Un dedo acelera y gira, como un joystick.' },
  volar: { boton: 'Volar', titulo: 'En avión', raton: 'A y D giran, W y S suben y bajan, Mayús acelera, Q y E cambian el año. Esc aterriza.', dedos: 'Un dedo gira y sube o baja.' },
})
let callarAyuda = null
const menuRecorrer = crearMenuRecorrer({ grupo: document.getElementById('recorrer-grupo'), boton: document.getElementById('recorrer') })
/** Lo común a los modos al entrar o salir: clases del body, botones y el cartel (su ayuda se calla a los 12 s). */
function cambioDeModo(nombre, dentro) {
  document.body.classList.toggle('modo', dentro)
  document.body.classList.toggle(`modo-${nombre}`, dentro)
  const boton = document.getElementById(nombre)
  boton.querySelector('.rotulo').textContent = dentro ? 'Volver al mapa' : TEXTO_MODO[nombre].boton
  if (dentro) menuRecorrer.cerrar()
  boton.setAttribute('aria-pressed', String(dentro))
  avisoModo.hidden = !dentro
  cielo.mostrar(cieloDeModo(document.body.classList))
  avisoModo.classList.remove('callado')
  clearTimeout(callarAyuda)
  if (!dentro) return
  const t = TEXTO_MODO[nombre]
  avisoModo.querySelector('.titulo').textContent = t.titulo
  avisoModo.querySelector('.raton').textContent = t.raton
  avisoModo.querySelector('.dedos').textContent = t.dedos
  callarAyuda = setTimeout(() => avisoModo.classList.add('callado'), 12000)
}
const aPie = crearModoAPie({
  camera, lienzo: renderer.domElement, cam, coords, suelo: sueloEn, pedirCuadro,
  casas: () => datosCiudad, hitos: hitosConPlanta, epoca: () => ciudad.U.uEpocaA.value, alCambiar: (dentro) => cambioDeModo('caminar', dentro),
})
const enAvion = crearModoVolar({
  camera, lienzo: renderer.domElement, cam, escena: scene, suelo: sueloEn, hoja, pedirCuadro,
  cambiarEpoca: (d) => lineaDeTiempo?.elegir(lineaDeTiempo.actual + d), alCambiar: (dentro) => cambioDeModo('volar', dentro),
})
const enCoche = crearModoManejar({
  camera, lienzo: renderer.domElement, cam, escena: scene, coords, suelo: sueloEn, pedirCuadro,
  casas: () => datosCiudad, epoca: () => ciudad.U.uEpocaA.value,
  cambiarEpoca: (d) => lineaDeTiempo?.elegir(lineaDeTiempo.actual + d),
  alCambiar: (dentro, v) => {
    if (!document.body.classList.contains('modo-manejar') || !dentro) cambioDeModo('manejar', dentro)
    if (dentro) avisoModo.querySelector('.titulo').textContent = v.nombre
  },
})
/** Cada modo entra con su botón (y otro toque lo saca); al entrar a uno, los demás se cierran. */
const MODOS = Object.freeze({ caminar: aPie, volar: enAvion, manejar: enCoche })
for (const [nombre, modo] of Object.entries(MODOS)) {
  document.getElementById(nombre).addEventListener('click', (e) => {
    if (modo.activo) { modo.salir(); return }
    for (const otro of Object.values(MODOS)) otro.salir()
    levantar(true)
    if (!modo.entrar()) e.currentTarget.title = 'Las casas todavía no llegaron: prueba en un momento'
  })
}
let alturaMostrada = null

// --- las marcas (M): los nombres de los lugares, por época, en una capa de DOM sobre la vista (src/marcas.js) ---
const sinAnimar = matchMedia('(prefers-reduced-motion: reduce)')
const marcasDelMapa = normalizarMarcas(MARCAS, { hitos: HITOS, coords })
const marcas = crearCapaMarcas({
  contenedor: document.getElementById('marcas'),
  marcas: marcasDelMapa,
  tamaño: () => ({ ancho: innerWidth, alto: innerHeight }),
  altura: sueloEn,
  alSobre: () => pedirCuadro(2),
  alAbrir(marca) {
    // la cámara vuela al lugar (nunca se aleja); la ficha se abre con el evento (src/ficha-panel.js)
    const destino = { x: marca.x, z: marca.z, dist: distanciaDeVuelo(marca.nivel, { ahora: cam.now.dist, destino: cam.goal.dist }) }
    if (sinAnimar.matches) cam.jump(destino); else cam.volar(destino)
    marcas.alAbrirMarca?.(marca)
    dispatchEvent(new CustomEvent('abrirmarca', { detail: marca }))
  },
})
function alternarMarcas(prender = !marcas.prendida) {
  marcas.mostrar(prender)
  const boton = document.getElementById('nombres')
  boton.setAttribute('aria-pressed', String(prender))
  boton.classList.toggle('on', prender)
  pedirCuadro(3)
}
document.getElementById('nombres').addEventListener('click', () => alternarMarcas())
// --- las fichas: al abrir una marca, el panel con sus nombres, su texto por época y sus fotos (src/ficha-panel.js) ---
const fichas = engancharFichas({ capa: marcas, U: ciudad.U })
if (params.has('sinmarcas')) alternarMarcas(false)

// --- la vitrina (T71): embebido en edificios.html, el visor obedece las órdenes del mismo origen (src/vitrina.js) ---
const VITRINA = Object.freeze({ dist: 320, pitch: 0.75, giro: 0.12 }) // m, rad, rad/s alrededor del edificio
let girarVitrina = false
if (params.has('vitrina')) {
  document.body.classList.add('vitrina')
  const porId = new Map(marcasDelMapa.map((m) => [m.id, m]))
  renderer.domElement.addEventListener('pointerdown', () => { girarVitrina = false }) // quien toca la vista, la maneja
  addEventListener('message', (e) => {
    const orden = ordenDeVitrina(e, location.origin)
    if (!orden) return
    // la página que embebe pudo empezar a escuchar después del aviso «lista» (postMessage no guarda mensajes):
    // pregunta y se le contesta. El oyente se instala en el mismo tramo sin esperas que termina en el aviso: cuando
    // atiende una pregunta, el visor ya está listo
    if (orden.tipo === 'pregunta') {
      if (e.source === window.parent && window.parent !== window) window.parent.postMessage({ vitrina: 'lista' }, location.origin)
    } else if (orden.tipo === 'ir' && porId.has(orden.id)) {
      const m = porId.get(orden.id)
      const destino = { x: m.x, z: m.z, dist: VITRINA.dist, pitch: VITRINA.pitch }
      if (sinAnimar.matches) cam.jump(destino); else cam.volar(destino)
      girarVitrina = !sinAnimar.matches
    } else if (orden.tipo === 'epoca') {
      if (lineaDeTiempo) lineaDeTiempo.elegir(orden.indice); else epocaPedida = orden.indice
    } else if (orden.tipo === 'levantar') {
      levantar(true)
    } else if (orden.tipo === 'girar') {
      girarVitrina = orden.si && !sinAnimar.matches
    }
  })
}

// --- la luz y el acabado: sombras arrojadas, contorno a tinta, bruma y grano de papel (src/acabado.js) ---
const acabado = crearAcabado({
  renderer, scene, camera, U: ciudad.U,
  ajustes: ajustesDeAcabado({ params, liviano, software: porSoftware, maxTextura, minimo }),
  limite: { x0: hoja.x0, z0: hoja.z0, x1: hoja.x0 + hoja.ancho, z1: hoja.z0 + hoja.alto },
  vista: () => cam.now,
})

// --- el buscador: esquinas, cuadras y direcciones de hoy; su alfiler sigue al terreno (src/buscador/) ---
const buscador = crearBuscador({
  formulario: document.getElementById('buscar'), plano: meta.plano, coords, camera, cam, suelo: sueloEn, pedirCuadro,
  hitos: HITOS, epoca: () => lineaDeTiempo?.actual ?? null, animar: !params.has('capture'),
})

const reloj = new Timer()
// si los cuadros salen lentos mientras la vista se mueve, se dibuja con menos píxeles; quieta, con todos
// (src/resolucion.js). En las capturas y con render por software no: ahí importa que el cuadro sea el mismo
const resolucion = params.has('capture') || porSoftware ? null
  : crearResolucionAdaptable({ maxima: renderer.getPixelRatio(), minima: renderer.getPixelRatio() > 1 ? 1 : 0.75 })
let tic = 0
// ?medir: un panel con lo que cuesta cada cuadro (src/medir-panel.js); con él la vista se dibuja sin parar
const medicion = !params.has('medir') ? null : crearPanelDeMedicion({
  contenedor: document.body,
  leer: () => ({
    llamadas: renderer.info.render.calls, triangulos: renderer.info.render.triangles, pixeles: renderer.getPixelRatio(),
    lienzo: [renderer.domElement.width, renderer.domElement.height],
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    nivel: NIVELES[planoBase.puesto]?.lado ?? null, calidad: minimo ? 'mínima' : liviano ? 'liviana' : 'completa',
  }),
})
// (three.js reinicia la cuenta en cada pase: para sumar los de un cuadro entero se reinicia a mano)
if (medicion) renderer.info.autoReset = false
let ticDibujado = -2
let racha = 0
const RACHA_DE_MOVIMIENTO = 4
let msDibujado = 0
renderer.setAnimationLoop((t) => {
  reloj.update(t)
  const dt = pasoDeCuadro(reloj.getDelta(), porSoftware)
  if (aPie.activo) {
    if (aPie.update(dt)) pedirCuadro(2)
  } else if (enAvion.activo) {
    if (enAvion.update(dt)) pedirCuadro(2)
    // la altura en el cartel, de a 10 m (no cada cuadro: es una región que se anuncia)
    const altura = Math.round(enAvion.altura / 10) * 10
    if (altura !== alturaMostrada) avisoModo.querySelector('.titulo').textContent = `En avión · ${(alturaMostrada = altura)} m sobre el suelo`
  } else if (enCoche.activo) {
    if (enCoche.update(dt)) pedirCuadro(2)
    const rotulo = `${enCoche.vehiculo.nombre} · ${enCoche.kmh} km/h`
    if (rotulo !== alturaMostrada) avisoModo.querySelector('.titulo').textContent = (alturaMostrada = rotulo)
  } else {
    if (girarVitrina) { cam.goal.yaw += VITRINA.giro * dt; pedirCuadro(2) }
    if (cam.update(dt)) pedirCuadro(2)
  }
  const { uOla, uColor } = ciudad.U
  if (uOla.value !== olaObjetivo) {
    uOla.value = acercar(uOla.value, olaObjetivo, velocidadDeOla(uOla.value, olaObjetivo > uOla.value) * dt)
    pedirCuadro(2)
  }
  const { uOlaEpoca } = ciudad.U
  if (uOlaEpoca.value < OLA_EPOCA_MAX_M) {
    uOlaEpoca.value = acercar(uOlaEpoca.value, OLA_EPOCA_MAX_M, (OLA_EPOCA_MAX_M / DURACION_EPOCA_S) * dt)
    if (uOlaEpoca.value >= OLA_EPOCA_MAX_M) secuencia?.termino()
    pedirCuadro(2)
  }
  // de cada baldosa de casas solo se dibuja lo que vive en la época que se mira; mientras pasa la ola de una
  // época a otra, lo de las dos (src/casas.js)
  const epocaA = ciudad.U.uEpocaA.value
  if (casas.ponerEpocas(uOlaEpoca.value < OLA_EPOCA_MAX_M ? ciudad.U.uEpocaDe.value : epocaA, epocaA)) pedirCuadro(2)
  if(detalleColonial?.actualizar(camera,[uOlaEpoca.value < OLA_EPOCA_MAX_M ? ciudad.U.uEpocaDe.value : epocaA,epocaA],sueloEn)){acabado.invalidarSombras();pedirCuadro(2)}
  if (uColor.value !== colorObjetivo) {
    uColor.value = acercar(uColor.value, colorObjetivo, dt / DURACION_COLOR_S)
    pedirCuadro(2)
  }
  if (ciudad.U.uHoy.value !== hoyObjetivo) {
    ciudad.U.uHoy.value = acercar(ciudad.U.uHoy.value, hoyObjetivo, dt / DURACION_HOY_S)
    pedirCuadro(2)
  }
  tic++
  if (medicion) pedirCuadro(1)
  if (pendientes <= 0) {
    // la vista quedó quieta: si venía dibujándose con menos píxeles, un último cuadro con todos, en este mismo
    // callback (cambiar la proporción borra el lienzo: sin dibujar ahora, se vería un cuadro en blanco)
    const nitida = resolucion?.quieta() ?? null
    if (nitida === null) {
      // nadie pidió un cuadro: de paso, se sube a la GPU una baldosa de casas de las que todavía no se vieron
      casas.subirUna(renderer)
      return
    }
    renderer.setPixelRatio(nitida)
    pendientes = 1
  }
  pendientes--
  if (resolucion) {
    // varios cuadros seguidos: la vista se mueve, y lo que tardó el anterior dice si el equipo llega (un par de
    // cuadros sueltos, como los que siguen a una textura que llega o al cuadro nítido de la vista quieta, no cuentan)
    const ahora = performance.now()
    racha = tic - ticDibujado === 1 ? racha + 1 : 0
    // (mientras llega la ciudad no se mide: ahí los cuadros lentos son de la carga, no de dibujar)
    const cambio = casasListas && racha >= RACHA_DE_MOVIMIENTO ? resolucion.cuadro(ahora - msDibujado) : null
    if (cambio !== null) renderer.setPixelRatio(cambio)
    ticDibujado = tic
    msDibujado = ahora
  }
  buscador.dibujar() // el alfiler del buscador sigue a su punto del terreno
  // a pie, lo que se mira es donde está el caminante
  const enRecorrido = aPie.activo || enCoche.activo || enAvion.activo
  const foco = aPie.activo ? { ...aPie.estado, dist: 0 } : enCoche.activo ? { ...enCoche.estado, dist: 0 } : enAvion.activo ? { ...enAvion.estado, dist: enAvion.altura } : cam.now
  if (teselas) {
    const { px, py } = coords.aPixel(foco.x, foco.z)
    teselas.update(px, py, foco.dist < DIST_TESELAS_M)
  }
  // el plano general, en el nivel que pide la vista; en el mapa, la de destino: un vuelo (también el de la
  // entrada, con guion) no baja los niveles intermedios por los que pasa. Se espera a que el chico haya
  // llegado o fallado: si falla, los de arriba igual se pueden pedir
  if (planoBase.puesto >= 0 && planoBase.resuelto >= NIVEL_CHICO) {
    planoBase.pedir(nivelNecesario({
      dist: enRecorrido ? foco.dist : cam.destino.dist, altoPx: renderer.domElement.height, fov: camera.fov, anchoHoja: hoja.ancho,
      liviano, maxTextura, distTeselas: teselas ? DIST_TESELAS_M : null,
    }))?.catch(() => {})
  }
  // las marcas primero: sus carteles tienen prioridad sobre los nombres de las calles
  const { uEpocaDe, uEpocaA, uAnchoOla } = ciudad.U
  const ocupados = marcas.dibujar({
    camera, dist: cam.now.dist,
    epoca: { de: uEpocaDe.value, a: uEpocaA.value, ola: uOlaEpoca.value, ancho: uAnchoOla.value },
    sube: (d) => hinchado(d, uOla.value, uAnchoOla.value),
  })
  // de los árboles, lo que vive en la época que se mira, entero de cerca y simple de lejos (src/arboles.js)
  arboles?.actualizar({
    camara: camera, color: ciudad.U.uColor.value, alturaEn: relieve ? alturaDelTerreno : null,
    epocas: [uOlaEpoca.value < OLA_EPOCA_MAX_M ? uEpocaDe.value : uEpocaA.value, uEpocaA.value],
  })
  fichas.actualizar() // con la ficha abierta, sigue a la época que llega con la ola
  rotulos?.dibujar({ camera, dist: cam.now.dist, x: cam.now.x, z: cam.now.z, opacidad: ciudad.U.uHoy.value, ocupados })
  if (medicion) renderer.info.reset()
  acabado.dibujar()
  medicion?.cuadro(performance.now())
})

if (params.has('hoy')) alternarHoy(true)
document.body.classList.add('listo')
listo = true
if (crecerPedido) verCrecer()
if (debeArrancar(params) && !(detalleColonial && params.has('verbalcones'))) arrancar()
// la página que embebe la vitrina espera este aviso para mandar sus órdenes
if (params.has('vitrina') && window.parent !== window) window.parent.postMessage({ vitrina: 'lista' }, location.origin)
window.lab = {
  renderer, scene, camera, cam, cielo, aPie, enAvion, enCoche, marcasDelMapa, coords, meta, pedirCuadro, ciudad, levantar, alternarColor, alternarHoy, alternarMarcas, marcas, fichas, relieveU, sueloEn, acabado, ready: false,
  get relieve() { return relieve },
  get casasListas() { return casasListas },
  detalleColonial,
  casas,
  get teselas() { return teselas },
  get arboles() { return arboles },
  get hitos() { return hitos },
  get calles() { return rotulos },
  get lineaDeTiempo() { return lineaDeTiempo },
  get planos() { return planos },
  planoBase, liviano, minimo,
  get resolucion() { return resolucion },
  get visorPlano() { return visorPlano },
}
window.lab.buscador = buscador
// «listo» para quien espera a window.lab (los tests, las capturas): con los hitos ya en la escena, o descartados
hitosPedidos.then(() => { window.lab.ready = true })
if(detalleColonial && params.has('verbalcones'))Promise.all([casasPedidas,hitosPedidos]).then(()=>{
  if(!detalleColonial.vista)return
  levantar(true);alternarColor(true);cam.jump(detalleColonial.vista);pedirCuadro(3)
})
// la segunda visita no baja ni revalida lo que no cambió (src/sw.js); no frena nada del arranque
window.lab.servicio = registrarServiceWorker({ contenedor: navigator.serviceWorker, construido: import.meta.env.PROD, params })
// cuando ya llegó la ciudad, el service worker guarda lo que esta visita bajó antes de que él existiera
Promise.all([window.lab.servicio, casasPedidas]).then(([estado]) => {
  if (estado === 'registrado') return avisarLoBajado(navigator.serviceWorker, performance.getEntriesByType('resource').map((e) => e.name))
}).catch(() => {})
window.lab.acerca = acerca

/**
 * La entrada (src/arranque.js): la hoja entera desde arriba se pone en color; cuando se cierra la bienvenida
 * (o al rato, si no la hay) y ya llegaron las casas, la ciudad se levanta y la cámara baja volando al centro.
 * Si mientras tanto la levantaron, tomaron la cámara o entraron a un modo de recorrido, se respeta lo que hicieron.
 */
function arrancar() {
  alternarColor(true)
  if (sinAnimar.matches) {
    // directo al final: el color y la ciudad en pie de una vez, sin transición
    levantar(true)
    ciudad.U.uColor.value = 1
    ciudad.U.uOla.value = olaObjetivo
    cam.jump(VISTA_CENTRO)
    return
  }
  cam.jump(vistaDeHoja(hoja))
  const desde = { ...cam.goal }
  Promise.all([conIntro ? cierreDeIntro : null, primerasCasasPedidas]).then(() => setTimeout(() => {
    // tomada: la tocó aunque no la haya movido (un dedo apoyado, quieto); movida: un vuelo a una marca, la vitrina…
    const movida = ['x', 'z', 'dist', 'yaw', 'pitch'].some((c) => Math.abs(cam.goal[c] - desde[c]) > 1e-6)
    if (!olaElegida) levantar(true)
    const enModo = Object.values(MODOS).some((m) => m.activo)
    if (!cam.tomada && !movida && !enModo) cam.volarA(VISTA_CENTRO, DURACION_VUELO_S)
  }, esperaDeArranque(conIntro)))
}

/** Papel con una cuadrícula de 100 m, hasta que exista plano/primero.webp. */
function cuadriculaProvisoria() {
  const c = Object.assign(document.createElement('canvas'), { width: 2048, height: Math.round((2048 * hoja.alto) / hoja.ancho) })
  const g = c.getContext('2d')
  g.fillStyle = '#f1e6cd'
  g.fillRect(0, 0, c.width, c.height)
  g.strokeStyle = '#2a221b55'
  const paso = (100 / hoja.ancho) * c.width
  for (let x = 0; x < c.width; x += paso) g.strokeRect(x, 0, 0, c.height)
  for (let y = 0; y < c.height; y += paso) g.strokeRect(0, y, c.width, 0)
  g.fillStyle = '#2a221b'
  g.font = 'italic 40px Georgia, serif'
  g.textAlign = 'center'
  g.fillText('aquí va el plano base', c.width / 2, c.height / 2)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}
