import {
  WebGLRenderer, Scene, PerspectiveCamera, PlaneGeometry, Mesh, BufferAttribute,
  CanvasTexture, TextureLoader, SRGBColorSpace, Color, Timer, HemisphereLight, DirectionalLight,
} from 'three'
import { cargarPak } from './pak.js'
import { geometriaCiudad } from './ciudad.js'
import { crearMaterialCiudad } from './material.js'
import { acercar } from './animar.js'
import { crearCoords } from './coords.js'
import { crearCamara } from './camara.js'

const params = new URLSearchParams(location.search)
const COLOR_FONDO = 0x1d1a17

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
const ciudad = crearMaterialCiudad({ plano: meta.plano, metro: meta.plano.metro, mapa: cuadriculaProvisoria() })

// --- la hoja del plano: el suelo, con el mismo material (pisos = 0 en aInfo) ---
const suelo = new PlaneGeometry(hoja.ancho, hoja.alto).rotateX(-Math.PI / 2)
suelo.translate(hoja.x0 + hoja.ancho / 2, 0, hoja.z0 + hoja.alto / 2)
suelo.setAttribute('aInfo', new BufferAttribute(new Float32Array(suelo.attributes.position.count * 4), 4))
scene.add(new Mesh(suelo, ciudad.material))

cargarPlano().catch(() => { /* todavía no hay escaneo procesado: queda la cuadrícula */ })

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
  anterior?.dispose()
  pedirCuadro(3)
}

// --- la ciudad y la ola ---
const DURACION_OLA_S = 5
let olaObjetivo = 0
let olaMax = 0
cargarPak('datos/ciudad.pak', { vertices: Float32Array, techos: Uint32Array }).then((datos) => {
  const g = geometriaCiudad(datos, coords)
  olaMax = g.boundingSphere.center.length() + g.boundingSphere.radius + 400
  scene.add(new Mesh(g, ciudad.material))
  document.getElementById('alzar').hidden = false
  pedirCuadro(3)
}).catch((e) => console.warn(`ciudad: ${e.message}`))

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

document.getElementById('alzar').addEventListener('click', () => levantar())
document.getElementById('color').addEventListener('click', () => alternarColor())
addEventListener('keydown', (e) => {
  if (e.repeat || e.target.closest?.('input, textarea')) return
  if (e.code === 'Space') { e.preventDefault(); levantar() }
  if (e.code === 'KeyC' && !e.metaKey && !e.ctrlKey) alternarColor()
})

const cam = crearCamara(camera, renderer.domElement, { pedirCuadro, hoja })

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
  if (uColor.value !== colorObjetivo) {
    uColor.value = acercar(uColor.value, colorObjetivo, dt / DURACION_COLOR_S)
    pedirCuadro(2)
  }
  if (pendientes <= 0) return
  pendientes--
  renderer.render(scene, camera)
})

document.body.classList.add('listo')
window.lab = { renderer, scene, camera, cam, coords, meta, pedirCuadro, ciudad, levantar, alternarColor, ready: true }

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
