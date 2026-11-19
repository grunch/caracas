/**
 * El modo en avión (T61): una avioneta low-poly, con sombra, sobre el valle; la cámara la sigue de atrás. La
 * cuenta está en src/volar.js. Mientras dura, la cámara del mapa (src/camara.js) queda en pausa y conserva su
 * vista. Q y E cambian el año (`cambiarEpoca(±1)`) y la ciudad cambia abajo, con la ola de cada época.
 */
import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from 'three'
import { camaraDetras, despegue, entradaDeVuelo, pasoEnAvion } from './volar.js'
import { joystick } from './a-pie.js'

const FOV = 50
const TECLAS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space'])
const AÑO = Object.freeze({ KeyQ: -1, KeyE: 1 })

/** La avioneta: fuselaje, alas, cola y timón, de papel con el borde en tinta (unos 12 m de envergadura). */
export function crearAvion() {
  const papel = new MeshLambertMaterial({ color: 0xe9dcc0 })
  const tinta = new MeshLambertMaterial({ color: 0x5a4a3a })
  const pieza = (ancho, alto, largo, x, y, z, material = papel) => {
    const m = new Mesh(new BoxGeometry(ancho, alto, largo), material)
    m.position.set(x, y, z)
    m.castShadow = true
    return m
  }
  const avion = new Group()
  avion.add(
    pieza(1.4, 1.4, 8, 0, 0, 0), // fuselaje (la nariz hacia −z)
    pieza(12, 0.25, 1.8, 0, 0.3, -0.8), // alas
    pieza(4, 0.2, 1.1, 0, 0.2, 3.6), // estabilizador
    pieza(0.2, 1.6, 1.2, 0, 1, 3.6, tinta), // timón
    pieza(1.6, 1.6, 0.2, 0, 0, -4.1, tinta), // hélice
  )
  avion.visible = false
  return avion
}

export function crearModoVolar({ camera, lienzo, ventana = globalThis, cam, escena, suelo, hoja, pedirCuadro, cambiarEpoca = () => {}, alCambiar = () => {} }) {
  let activo = false
  let estado = null
  let antes = null
  const teclas = new Set()
  const punteros = new Map()
  const avion = crearAvion()
  escena.add(avion)

  function aplicar() {
    avion.position.set(estado.x, estado.y, estado.z)
    avion.rotation.set(0, -estado.rumbo, -estado.alabeo, 'YXZ')
    const { ojo, mira } = camaraDetras(estado)
    camera.position.set(ojo.x, ojo.y, ojo.z)
    camera.lookAt(mira.x, mira.y, mira.z)
    camera.updateMatrixWorld()
  }

  ventana.addEventListener('keydown', (e) => {
    if (!activo || e.target?.closest?.('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return
    if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); salir(); return }
    if (e.code in AÑO) {
      e.preventDefault()
      e.stopImmediatePropagation()
      if (!e.repeat) cambiarEpoca(AÑO[e.code])
      return
    }
    if (!TECLAS.has(e.code)) return
    e.preventDefault()
    e.stopImmediatePropagation()
    teclas.add(e.code)
  }, { capture: true })
  ventana.addEventListener('keyup', (e) => { teclas.delete(e.code) }, { capture: true })
  ventana.addEventListener('blur', () => teclas.clear())

  // con los dedos: el joystick gira (izquierda y derecha) y sube o baja (arriba y abajo)
  lienzo.addEventListener('pointerdown', (e) => {
    if (!activo || e.pointerType !== 'touch' || punteros.size) return
    punteros.set(e.pointerId, { inicio: { x: e.clientX, y: e.clientY }, ultimo: { x: e.clientX, y: e.clientY } })
  })
  lienzo.addEventListener('pointermove', (e) => {
    const p = activo && punteros.get(e.pointerId)
    if (p) p.ultimo = { x: e.clientX, y: e.clientY }
  })
  const soltar = (e) => punteros.delete(e.pointerId)
  lienzo.addEventListener('pointerup', soltar)
  lienzo.addEventListener('pointercancel', soltar)

  function entrar() {
    if (activo) return true
    estado = despegue(cam.now, suelo)
    antes = { fov: camera.fov }
    camera.fov = FOV
    camera.updateProjectionMatrix()
    cam.pausar(true)
    avion.visible = true
    activo = true
    aplicar()
    alCambiar(true)
    pedirCuadro(3)
    return true
  }

  function salir() {
    if (!activo) return
    activo = false
    teclas.clear()
    punteros.clear()
    avion.visible = false
    camera.fov = antes.fov
    camera.updateProjectionMatrix()
    cam.pausar(false)
    alCambiar(false)
    pedirCuadro(3)
  }

  /** Avanza un cuadro: el avión no se detiene, así que mientras vuela siempre hay que dibujar. */
  function update(dt) {
    if (!activo) return false
    const deTeclas = entradaDeVuelo(teclas)
    const [palanca] = punteros.values()
    const dedo = palanca && joystick(palanca.inicio, palanca.ultimo)
    const entrada = dedo ? { girar: dedo.lado, subir: dedo.adelante, acelera: deTeclas.acelera } : deTeclas
    estado = pasoEnAvion(estado, entrada, dt, { suelo, hoja })
    aplicar()
    return true
  }

  return {
    entrar, salir, update, avion,
    get activo() { return activo },
    get estado() { return estado && { ...estado } },
    /** Metros sobre el suelo que queda debajo. */
    get altura() { return estado ? Math.round(estado.y - suelo(estado.x, estado.z)) : 0 },
  }
}
