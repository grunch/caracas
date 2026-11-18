import {
  WebGLRenderer, Scene, PerspectiveCamera, PlaneGeometry, Mesh, MeshBasicMaterial,
  CanvasTexture, TextureLoader, SRGBColorSpace, Color, Timer, Mesh as Malla,
  HemisphereLight, DirectionalLight,
} from 'three'
import { cargarPak } from './pak.js'
import { geometriaCiudad } from './ciudad.js'
import { crearMaterialCiudad } from './material.js'
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

// --- la hoja del plano ---
const material = new MeshBasicMaterial({ map: cuadriculaProvisoria() })
const plano = new Mesh(new PlaneGeometry(hoja.ancho, hoja.alto).rotateX(-Math.PI / 2), material)
plano.position.set(hoja.x0 + hoja.ancho / 2, 0, hoja.z0 + hoja.alto / 2)
scene.add(plano)

cargarPlano().catch(() => { /* todavía no hay escaneo procesado: queda la cuadrícula */ })

/**
 * Carga progresiva: primero.webp (1024) para el primer cuadro, después chico (2048) y medio
 * (8192, o 4096 en equipos livianos). Las teselas finas de 3072 llegan con el material propio.
 */
async function cargarPlano() {
  const maxTextura = renderer.capabilities.maxTextureSize
  const liviano = params.has('liviano') || (!params.has('pesado') &&
    (maxTextura < 8192 || Math.min(screen.width, screen.height) < 600 || (navigator.deviceMemory ?? 8) < 4))
  const niveles = ['plano/primero.webp', 'plano/chico.webp', liviano ? 'plano/medio-4k.webp' : 'plano/medio.webp']
  const cargador = new TextureLoader()
  for (const url of niveles) {
    try {
      ponerTextura(await cargador.loadAsync(url))
    } catch (e) {
      if (url === niveles[0]) throw e // sin el primero no hay plano: queda la cuadrícula
      console.warn(`plano: no se pudo cargar ${url}`)
    }
  }
}

function ponerTextura(t) {
  t.colorSpace = SRGBColorSpace
  t.anisotropy = renderer.capabilities.getMaxAnisotropy()
  const anterior = material.map
  material.map = t
  material.needsUpdate = true
  ciudad.U.uMapa.value = t
  anterior?.dispose()
  pedirCuadro(3)
}

// --- la ciudad ---
scene.add(new HemisphereLight(0xfff4e0, 0x6b5a48, 1.6))
const sol = new DirectionalLight(0xfff1d6, 2.2)
sol.position.set(-1200, 2000, 900)
scene.add(sol)

const ciudad = crearMaterialCiudad({ plano: meta.plano, metro: meta.plano.metro, mapa: material.map })
const DURACION_OLA_S = 5
let olaObjetivo = 0
let olaMax = 0
cargarPak('datos/ciudad.pak', { vertices: Float32Array, techos: Uint32Array }).then((datos) => {
  const g = geometriaCiudad(datos, coords)
  olaMax = g.boundingSphere.center.length() + g.boundingSphere.radius + 400
  scene.add(new Malla(g, ciudad.material))
  document.getElementById('alzar').hidden = false
  pedirCuadro(3)
}).catch((e) => console.warn(`ciudad: ${e.message}`))

function levantar(arriba = olaObjetivo === 0) {
  olaObjetivo = arriba ? olaMax : 0
  document.getElementById('alzar').textContent = arriba ? 'Acostar la ciudad' : 'Levantar la ciudad'
  pedirCuadro(3)
}
document.getElementById('alzar').addEventListener('click', () => levantar())
addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) { e.preventDefault(); levantar() }
})

const cam = crearCamara(camera, renderer.domElement, { pedirCuadro, hoja })

const reloj = new Timer()
renderer.setAnimationLoop((t) => {
  reloj.update(t)
  const dt = Math.min(reloj.getDelta(), 0.1)
  if (cam.update(dt)) pedirCuadro(2)
  const ola = ciudad.U.uOla
  if (ola.value !== olaObjetivo) {
    const paso = (olaMax / DURACION_OLA_S) * dt
    ola.value = olaObjetivo > ola.value ? Math.min(olaObjetivo, ola.value + paso) : Math.max(olaObjetivo, ola.value - paso)
    pedirCuadro(2)
  }
  if (pendientes <= 0) return
  pendientes--
  renderer.render(scene, camera)
})

document.body.classList.add('listo')
window.lab = { renderer, scene, camera, cam, coords, meta, pedirCuadro, ciudad, levantar, ready: true }

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
