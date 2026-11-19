/**
 * El modo a pie (T60): primera persona por las calles de la época elegida. La cuenta está en src/a-pie.js; acá,
 * la cámara, el teclado, el ratón y los dedos. Mientras dura, la cámara del mapa (src/camara.js) queda en pausa
 * y conserva su vista: al salir se vuelve a ella. `casas()`: las partes de ciudad.pak (o null si no llegaron);
 * `epoca()`: la época que rige (src/epocas.js; 99 sin línea de tiempo).
 */
import { choca, entradaDeTeclas, joystick, pasoAPie, puntoDeEntrada, rejillaDeCasas, teclaAjena } from './a-pie.js'

const OJOS_M = 1.6
const NEAR_M = 0.1
const FOV = 60
const MIRAR_POR_PX = 0.004
const MIRADA_MAX = 1.2
const TECLAS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space'])

export function crearModoAPie({ camera, lienzo, ventana = globalThis, cam, coords, suelo, casas, epoca, pedirCuadro, alCambiar = () => {} }) {
  let activo = false
  let estado = null
  let rejilla = null
  let epocaDeRejilla = null
  let antes = null
  const teclas = new Set()
  const punteros = new Map() // pointerId → { tipo: 'mirar' | 'joystick', inicio, ultimo }

  const chocaEn = (x, z) => choca(rejilla, x, z)
  function armarRejilla() {
    epocaDeRejilla = epoca()
    rejilla = rejillaDeCasas(casas(), epocaDeRejilla, coords.aMundo)
  }
  /** Cambió la época con el paseo en curso: si ahora hay una casa donde estaba, sale a la calle más cercana. */
  function rearmarRejilla() {
    armarRejilla()
    if (!chocaEn(estado.x, estado.z)) return
    const p = puntoDeEntrada({ x: estado.x, z: estado.z, dist: 0 }, chocaEn)
    estado = { ...estado, x: p.x, z: p.z }
  }
  function aplicar() {
    const y = suelo(estado.x, estado.z) + OJOS_M
    const c = Math.cos(estado.mirada)
    camera.position.set(estado.x, y, estado.z)
    camera.lookAt(estado.x + Math.sin(estado.rumbo) * c, y + Math.sin(estado.mirada), estado.z - Math.cos(estado.rumbo) * c)
    camera.updateMatrixWorld()
  }
  function mirar(dx, dy) {
    estado = { ...estado, rumbo: estado.rumbo + dx * MIRAR_POR_PX, mirada: Math.max(-MIRADA_MAX, Math.min(MIRADA_MAX, estado.mirada - dy * MIRAR_POR_PX)) }
    pedirCuadro(3)
  }

  // --- teclado: en captura, antes que los atajos del mapa (las flechas no mueven el mapa, Espacio no lo acuesta);
  // lo que pasa en un campo de texto o en un diálogo (el visor del plano: flechas para moverlo, Esc para cerrarlo) es suyo ---
  ventana.addEventListener('keydown', (e) => {
    if (!activo || teclaAjena(e)) return
    if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); salir(); return }
    if (!TECLAS.has(e.code) || e.ctrlKey || e.metaKey || e.altKey) return
    e.preventDefault()
    e.stopImmediatePropagation()
    teclas.add(e.code)
    pedirCuadro(3)
  }, { capture: true })
  ventana.addEventListener('keyup', (e) => { teclas.delete(e.code) }, { capture: true })
  ventana.addEventListener('blur', () => teclas.clear())

  // --- ratón: arrastrar mira; dedos: el de la mitad izquierda es un joystick, el otro mira ---
  lienzo.addEventListener('pointerdown', (e) => {
    if (!activo) return
    const enIzquierda = e.clientX < lienzo.getBoundingClientRect().width / 2
    const hayJoystick = [...punteros.values()].some((p) => p.tipo === 'joystick')
    const tipo = e.pointerType === 'touch' && enIzquierda && !hayJoystick ? 'joystick' : 'mirar'
    punteros.set(e.pointerId, { tipo, inicio: { x: e.clientX, y: e.clientY }, ultimo: { x: e.clientX, y: e.clientY } })
    lienzo.setPointerCapture?.(e.pointerId)
  })
  lienzo.addEventListener('pointermove', (e) => {
    const p = activo && punteros.get(e.pointerId)
    if (!p) return
    if (p.tipo === 'mirar') mirar(e.clientX - p.ultimo.x, e.clientY - p.ultimo.y)
    p.ultimo = { x: e.clientX, y: e.clientY }
    pedirCuadro(3)
  })
  const soltar = (e) => punteros.delete(e.pointerId)
  lienzo.addEventListener('pointerup', soltar)
  lienzo.addEventListener('pointercancel', soltar)

  /** Baja a la calle. → false si todavía no llegaron las casas. */
  function entrar() {
    if (activo) return true
    if (!casas()) return false
    armarRejilla()
    const p = puntoDeEntrada(cam.now, chocaEn)
    // de frente a donde miraba el mapa (la cámara orbital mira en la dirección (−sen yaw, −cos yaw))
    estado = { x: p.x, z: p.z, rumbo: -cam.now.yaw, mirada: 0 }
    antes = { near: camera.near, fov: camera.fov }
    camera.near = NEAR_M
    camera.fov = FOV
    camera.updateProjectionMatrix()
    cam.pausar(true)
    activo = true
    aplicar()
    alCambiar(true)
    pedirCuadro(3)
    return true
  }

  /** Vuelve al mapa, con la cámara donde estaba. */
  function salir() {
    if (!activo) return
    activo = false
    teclas.clear()
    punteros.clear()
    camera.near = antes.near
    camera.fov = antes.fov
    camera.updateProjectionMatrix()
    cam.pausar(false)
    alCambiar(false)
    pedirCuadro(3)
  }

  /** Avanza un cuadro; true si hay que seguir dibujando. */
  function update(dt) {
    if (!activo) return false
    if (epoca() !== epocaDeRejilla) rearmarRejilla() // cambió la época: otras casas en pie
    const deTeclas = entradaDeTeclas(teclas)
    const palanca = [...punteros.values()].find((p) => p.tipo === 'joystick')
    const entrada = palanca ? { ...joystick(palanca.inicio, palanca.ultimo), corre: deTeclas.corre } : deTeclas
    estado = pasoAPie(estado, entrada, dt, { choca: chocaEn })
    aplicar()
    return entrada.adelante !== 0 || entrada.lado !== 0 || punteros.size > 0
  }

  return {
    entrar, salir, update,
    get activo() { return activo },
    get estado() { return estado && { ...estado } },
  }
}
