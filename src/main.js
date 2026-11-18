import {
  WebGLRenderer, Scene, PerspectiveCamera, PlaneGeometry, Mesh, BufferAttribute,
  CanvasTexture, TextureLoader, SRGBColorSpace, Color, Timer, HemisphereLight, DirectionalLight,
} from 'three'
import { cargarPak } from './pak.js'
import { geometriaCiudad } from './ciudad.js'
import { crearMaterialCiudad } from './material.js'
import { cargarArboles } from './arboles.js'
import { acercar } from './animar.js'
import { texturasHoy, HOY_CERCA } from './hoy.js'
import { crearTeselasFinas } from './teselas.js'
import { crearLineaDeTiempo, crearSecuencia, escalaCrece } from './epocas.js'
import { crearPlanosDeEpoca, planoDeEpoca } from './planos.js'
import { SIN_PLANO } from './shader/plano.js'
import { crearCoords } from './coords.js'
import { crearCamara } from './camara.js'
import { cargarCalles, crearRotulos } from './calles.js'
import { decodificarRelieve, crearRelieve, uniformsRelieve, ponerRelieve, alturaSuelo } from './relieve.js'

const params = new URLSearchParams(location.search)
const COLOR_FONDO = 0x1d1a17
const EXAGERACION = 1.3 // el valle se lee mejor con el relieve un poco exagerado
const SUBDIVISION_HOJA = [384, 306] // la hoja se hincha con el relieve (≈ 24 m por cuadro)

const meta = await fetch('datos/ciudad.json')
  .then((r) => { if (!r.ok) throw new Error(`datos/ciudad.json: ${r.status}`); return r.json() })
  .catch((e) => {
    document.getElementById('loading').textContent = 'No se pudo cargar el plano. Recarga la página para intentarlo de nuevo.'
    throw e
  })
const coords = crearCoords(meta.plano)
const { hoja } = coords

const renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
renderer.setPixelRatio(params.has('capture') ? 1 : Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
document.getElementById('view').appendChild(renderer.domElement)
renderer.domElement.addEventListener('webglcontextrestored', () => location.reload())

const maxTextura = renderer.capabilities.maxTextureSize
const liviano = params.has('liviano') || (!params.has('pesado') &&
  (maxTextura < 8192 || Math.min(screen.width, screen.height) < 600 || (navigator.deviceMemory ?? 8) < 4))

const scene = new Scene()
scene.background = new Color(COLOR_FONDO)
const camera = new PerspectiveCamera(35, innerWidth / innerHeight, 5, 60000)

// --- render bajo demanda: solo se dibuja mientras haya cuadros pedidos ---
let pendientes = 3
const pedirCuadro = (n = 2) => { pendientes = Math.max(pendientes, n) }
for (const ev of ['pointerdown', 'pointerup', 'keydown', 'wheel', 'focus']) addEventListener(ev, () => pedirCuadro(3), { capture: true, passive: true })
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight)
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  pedirCuadro(3)
})

// --- luz y material compartido por el suelo y la ciudad ---
scene.add(new HemisphereLight(0xfff4e0, 0x6b5a48, 1.6))
const sol = new DirectionalLight(0xfff1d6, 2.2)
sol.position.set(-1200, 2000, 900)
scene.add(sol)
// el relieve: sus uniforms van en el material; sin relieve.bin la hoja queda lisa
const relieveU = uniformsRelieve(hoja)
relieveU.uExageracion.value = Number(params.get('exagerar')) || EXAGERACION
let relieve = null
const ciudad = crearMaterialCiudad({ plano: meta.plano, metro: meta.plano.metro, mapa: cuadriculaProvisoria(), relieve: relieveU })

// --- la hoja del plano: el suelo, con el mismo material (pisos = 0 en aInfo), subdividida para
// apoyarse en el relieve ---
const suelo = new PlaneGeometry(hoja.ancho, hoja.alto, ...SUBDIVISION_HOJA).rotateX(-Math.PI / 2)
suelo.translate(hoja.x0 + hoja.ancho / 2, 0, hoja.z0 + hoja.alto / 2)
suelo.setAttribute('aInfo', new BufferAttribute(new Float32Array(suelo.attributes.position.count * 4), 4))
suelo.setAttribute('aAncla', new BufferAttribute(new Float32Array(suelo.attributes.position.count * 2), 2))
scene.add(new Mesh(suelo, ciudad.material))

cargarPlano().catch(() => { /* todavía no hay escaneo procesado: queda la cuadrícula */ })
cargarRelieve().catch((e) => console.warn(`relieve: ${e.message}`))

async function cargarRelieve() {
  const r = await fetch('datos/relieve.bin')
  if (!r.ok) throw new Error(`datos/relieve.bin: ${r.status}`)
  relieve = crearRelieve(decodificarRelieve(await r.arrayBuffer()), hoja)
  ponerRelieve(relieveU, relieve)
  document.getElementById('alzar').hidden = false
  pedirCuadro(3)
}

/**
 * Carga progresiva: primero.webp (1024) para el primer cuadro, después chico (2048) y medio
 * (8192, o 4096 en equipos livianos). Las teselas finas de 3072 llegan con el material propio.
 */
async function cargarPlano() {
  const niveles = ['plano/primero.webp', 'plano/chico.webp', liviano ? 'plano/medio-4k.webp' : 'plano/medio.webp']
  for (const url of niveles) {
    try {
      ponerTextura(ciudad.U.uMapa, await cargarTextura(url, true))
    } catch (e) {
      if (url === niveles[0]) throw e // sin el primero no hay plano: queda la cuadrícula
      console.warn(`plano: no se pudo cargar ${url}`)
    }
  }
}

async function cargarTextura(url, esColor) {
  const t = await new TextureLoader().loadAsync(url)
  if (esColor) t.colorSpace = SRGBColorSpace // la máscara de suelo son datos, no color
  t.anisotropy = renderer.capabilities.getMaxAnisotropy()
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

// --- la ciudad y la ola ---
const DURACION_OLA_S = 5
let olaObjetivo = 0
// la ola llega hasta la esquina más lejana de la hoja (el terreno se hincha en toda ella)
let olaMax = Math.hypot(Math.max(-hoja.x0, hoja.x0 + hoja.ancho), Math.max(-hoja.z0, hoja.z0 + hoja.alto)) + ciudad.U.uAnchoOla.value
let arboles = null
cargarPak('datos/ciudad.pak', { vertices: Float32Array, techos: Uint32Array, vida: Uint32Array }).then((datos) => {
  const g = geometriaCiudad(datos, coords)
  olaMax = Math.max(olaMax, g.boundingSphere.center.length() + g.boundingSphere.radius + 400)
  scene.add(new Mesh(g, ciudad.material))
  document.getElementById('alzar').hidden = false
  pedirCuadro(3)
}).catch((e) => console.warn(`ciudad: ${e.message}`)).then(() => {
  // los árboles, después de la ciudad: una malla instanciada que comparte sus uniforms (src/arboles.js)
  return cargarArboles('datos/arboles.bin', { coords, U: ciudad.U, sol: sol.position }).then((m) => {
    arboles = m
    scene.add(m)
    pedirCuadro(3)
  })
}).catch((e) => console.warn(`árboles: ${e.message}`))

// --- la línea de tiempo: 1578 → 1936; cada época llega como una ola desde la plaza ---
const DURACION_EPOCA_S = 3.5
const OLA_EPOCA_MAX_M = 9000 // más que la distancia de la plaza a la esquina más lejana de la hoja
// la ola espera al plano de su época (el nivel chico) hasta este tiempo; si no llega, sale igual con el
// de 1936 debajo y el plano viejo aparece cuando llegue
const ESPERA_PLANO_MS = 2500
let lineaDeTiempo = null
let secuencia = null
let planos = null
// el plano calzado de cada época (plano/epocas.json, tools/planos-epocas.mjs); sin él, siempre 1936
// (con un tope: si el índice no responde, la línea de tiempo arranca igual)
const ESPERA_INDICE_MS = 5000
const indicePlanos = Promise.race([
  fetch('plano/epocas.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status)))),
  new Promise((_, mal) => setTimeout(() => mal(new Error('plano/epocas.json no respondió')), ESPERA_INDICE_MS)),
]).catch((e) => { console.warn(`planos de época: ${e.message}`); return { planos: [] } })
Promise.all([fetch('datos/crece.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status)))), indicePlanos])
  .then(([{ epocas, celda_m }, indice]) => {
    const U = ciudad.U
    planos = crearPlanosDeEpoca({
      planos: indice.planos, hoja: meta.plano, cargar: (url) => cargarTextura(url, true), U, pedirCuadro,
      vacio: SIN_PLANO, liviano, maxTextura,
    })
    const planoDe = (i) => planoDeEpoca(epocas[i]?.año, indice.planos)?.año ?? null
    // arranca en la primera época sin ola; después, una ola por vez (lo elegido durante una, espera)
    U.uEpocaDe.value = U.uEpocaA.value = 0
    U.uOlaEpoca.value = OLA_EPOCA_MAX_M
    planos.usar(planoDe(0), planoDe(0))
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
    })
    lineaDeTiempo = crearLineaDeTiempo({ contenedor: document.getElementById('epocas'), epocas, alElegir: (i) => secuencia.elegir(i) })
    cargarTextura('plano/crece.png', false).then((t) => {
      const { width: cols, height: rows } = t.image
      U.uCreceEscala.value.fromArray(escalaCrece(meta.plano, { cols, rows }, celda_m ?? 8))
      ponerTextura(U.uCrece, t)
    }).catch((e) => console.warn(`crece: ${e.message}`))
  }).catch((e) => console.warn(`épocas: ${e.message}`)) // sin crece.json (p. ej. la demo de CI): la ciudad entera, sin línea de tiempo

function levantar(arriba = olaObjetivo === 0) {
  olaObjetivo = arriba ? olaMax : 0
  document.getElementById('alzar').textContent = arriba ? 'Acostar la ciudad' : 'Levantar la ciudad'
  pedirCuadro(3)
}

// --- tinta ⇄ color: la máscara de suelo se baja la primera vez que se prende el color ---
const DURACION_COLOR_S = 1.2
let colorObjetivo = 0
let sueloPedido = null
function alternarColor(prender = colorObjetivo === 0) {
  colorObjetivo = prender ? 1 : 0
  const boton = document.getElementById('color')
  boton.setAttribute('aria-pressed', String(prender))
  boton.classList.toggle('on', prender)
  boton.textContent = prender ? 'Tinta' : 'Color'
  if (prender) {
    sueloPedido ??= cargarTextura(liviano ? 'plano/suelo-2k.webp' : 'plano/suelo.webp', false)
      .then((t) => ponerTextura(ciudad.U.uSuelo, t))
      .catch((e) => { sueloPedido = null; console.warn(`suelo: ${e.message}`) })
  }
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

document.getElementById('alzar').addEventListener('click', () => levantar())
document.getElementById('color').addEventListener('click', () => alternarColor())
document.getElementById('hoy').addEventListener('click', () => alternarHoy())
addEventListener('keydown', (e) => {
  // los controles con foco conservan su teclado (Espacio activa el botón, se escribe en los campos)
  if (e.repeat || e.target.closest?.('input, textarea, select, button, a, [role="button"]')) return
  if (e.code === 'Space') { e.preventDefault(); levantar() }
  if (e.code === 'KeyC' && !e.metaKey && !e.ctrlKey) alternarColor()
  if (e.code === 'KeyH' && !e.metaKey && !e.ctrlKey) alternarHoy()
})

// la altura del suelo tal como se dibuja: la cámara mira siempre al terreno
const sueloEn = (x, z) => alturaSuelo(relieve, x, z,
  { ola: ciudad.U.uOla.value, anchoOla: ciudad.U.uAnchoOla.value, exageracion: relieveU.uExageracion.value })
const cam = crearCamara(camera, renderer.domElement, { pedirCuadro, hoja, suelo: sueloEn })

const reloj = new Timer()
renderer.setAnimationLoop((t) => {
  reloj.update(t)
  const dt = Math.min(reloj.getDelta(), 0.1)
  if (cam.update(dt)) pedirCuadro(2)
  const { uOla, uColor } = ciudad.U
  if (uOla.value !== olaObjetivo) {
    uOla.value = acercar(uOla.value, olaObjetivo, (olaMax / DURACION_OLA_S) * dt)
    pedirCuadro(2)
  }
  const { uOlaEpoca } = ciudad.U
  if (uOlaEpoca.value < OLA_EPOCA_MAX_M) {
    uOlaEpoca.value = acercar(uOlaEpoca.value, OLA_EPOCA_MAX_M, (OLA_EPOCA_MAX_M / DURACION_EPOCA_S) * dt)
    if (uOlaEpoca.value >= OLA_EPOCA_MAX_M) secuencia?.termino()
    pedirCuadro(2)
  }
  if (uColor.value !== colorObjetivo) {
    uColor.value = acercar(uColor.value, colorObjetivo, dt / DURACION_COLOR_S)
    pedirCuadro(2)
  }
  if (ciudad.U.uHoy.value !== hoyObjetivo) {
    ciudad.U.uHoy.value = acercar(ciudad.U.uHoy.value, hoyObjetivo, dt / DURACION_HOY_S)
    pedirCuadro(2)
  }
  if (pendientes <= 0) return
  pendientes--
  if (teselas) {
    const { px, py } = coords.aPixel(cam.now.x, cam.now.z)
    teselas.update(px, py, cam.now.dist < DIST_TESELAS_M)
  }
  rotulos?.dibujar({ camera, dist: cam.now.dist, x: cam.now.x, z: cam.now.z, opacidad: ciudad.U.uHoy.value })
  renderer.render(scene, camera)
})

if (params.has('hoy')) alternarHoy(true)
document.body.classList.add('listo')
window.lab = {
  renderer, scene, camera, cam, coords, meta, pedirCuadro, ciudad, levantar, alternarColor, alternarHoy, relieveU, sueloEn, ready: true,
  get relieve() { return relieve },
  get teselas() { return teselas },
  get arboles() { return arboles },
  get calles() { return rotulos },
  get lineaDeTiempo() { return lineaDeTiempo },
  get planos() { return planos },
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
