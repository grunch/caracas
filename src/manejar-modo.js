/**
 * El modo manejar (T62): el vehículo de la época por las calles, sin atravesar las casas (las mismas huellas que a
 * pie, src/a-pie.js). La cuenta está en src/manejar.js. Teclas: W/S o ↑/↓ acelera y frena, A/D o ←/→ gira, V
 * cambia la vista (afuera o cabina), B toca la bocina, M prende o apaga el sonido, N cambia de vehículo, Q y E
 * cambian el año (y con él el vehículo), Esc vuelve al mapa. El sonido se sintetiza con WebAudio: sin archivos.
 */
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshLambertMaterial } from 'three'
import { choca, joystick, puntoDeEntrada, rejillaDeCasas } from './a-pie.js'
import { camaraDeCoche, entradaDeManejo, otroVehiculo, pasoEnCoche, sonidoDe, vehiculoDeEpoca } from './manejar.js'

const RADIO_M = 1.1
const FOV = 55
const TECLAS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'])
const AÑO = Object.freeze({ KeyQ: -1, KeyE: 1 })

const MATERIALES = {
  madera: new MeshLambertMaterial({ color: 0x8a6a48 }),
  negro: new MeshLambertMaterial({ color: 0x2a221b }),
  papel: new MeshLambertMaterial({ color: 0xe9dcc0 }),
  animal: new MeshLambertMaterial({ color: 0x7a5a3e }),
}

/** Un vehículo procedural de la flota: caja, ruedas y, si es de tiro, el animal adelante. Mira hacia −z. */
export function crearVehiculo(v) {
  const g = new Group()
  const caja = (a, al, l, x, y, z, m) => {
    const p = new Mesh(new BoxGeometry(a, al, l), m)
    p.position.set(x, y, z)
    p.castShadow = true
    g.add(p)
  }
  const rueda = (x, z, r) => {
    const p = new Mesh(new CylinderGeometry(r, r, 0.15, 12), MATERIALES.negro)
    p.rotation.z = Math.PI / 2
    p.position.set(x, r, z)
    p.castShadow = true
    g.add(p)
  }
  const { largo, ancho } = v
  if (v.traccion === 'animal') {
    const cuerpo = largo * 0.5
    caja(ancho, 0.9, cuerpo, 0, 1.2, cuerpo / 2, v.id === 'carreta' ? MATERIALES.madera : MATERIALES.negro)
    if (v.id !== 'carreta') caja(ancho * 0.95, 0.8, cuerpo * 0.6, 0, 2, cuerpo * 0.6, MATERIALES.negro) // capota
    for (const x of [-ancho / 2, ancho / 2]) rueda(x, cuerpo * 0.7, 0.6)
    const animales = v.id === 'carreta' ? [-0.45, 0.45] : [0] // la yunta, o un caballo
    for (const x of animales) caja(0.5, 1.1, 1.8, x, 1.2, -1.2, MATERIALES.animal)
  } else {
    caja(ancho, 0.6, largo, 0, 0.8, 0, MATERIALES.negro)
    caja(ancho * 0.9, 0.9, largo * 0.45, 0, 1.55, largo * 0.1, v.id === 'ford-t' ? MATERIALES.negro : MATERIALES.papel)
    for (const x of [-ancho / 2, ancho / 2]) for (const z of [-largo * 0.35, largo * 0.35]) rueda(x, z, v.id === 'ford-t' ? 0.45 : 0.38)
  }
  return g
}

/** El sonido del vehículo, sintetizado (WebAudio). `crearContexto` se inyecta en los tests. */
export function crearSonido(crearContexto = () => new (globalThis.AudioContext ?? globalThis.webkitAudioContext)()) {
  let ctx = null
  let motor = null
  let tiempoCasco = 0
  let prendido = true
  const ruido = () => {
    const b = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.05), ctx.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3
    return b
  }
  function tono(tipo, frecuencias, duracion, volumen) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = tipo
    frecuencias.forEach((f, i) => o.frequency.setValueAtTime(f, ctx.currentTime + (duracion * i) / frecuencias.length))
    g.gain.setValueAtTime(volumen, ctx.currentTime)
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + duracion)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + duracion)
  }
  return {
    arrancar() {
      if (ctx) return
      try { ctx = crearContexto() } catch { ctx = null }
    },
    parar() {
      motor?.osc.stop()
      motor = null
      ctx?.close?.()
      ctx = null
    },
    alternar() { prendido = !prendido; if (!prendido && motor) motor.gain.gain.value = 0; return prendido },
    get prendido() { return prendido },
    /** Cada cuadro: el motor a su frecuencia, o los cascos a su ritmo. */
    actualizar(v, velocidad, dt) {
      if (!ctx) return
      const s = sonidoDe(v, velocidad)
      if (v.traccion === 'motor') {
        if (!motor) {
          const osc = ctx.createOscillator()
          const filtro = ctx.createBiquadFilter()
          const gain = ctx.createGain()
          osc.type = 'sawtooth'
          filtro.type = 'lowpass'
          filtro.frequency.value = 420
          osc.connect(filtro).connect(gain).connect(ctx.destination)
          osc.start()
          motor = { osc, gain }
        }
        motor.osc.frequency.value = s.frecuencia
        motor.gain.gain.value = prendido ? s.ganancia : 0
        return
      }
      if (motor) { motor.osc.stop(); motor = null }
      if (!prendido || !s.cascosPorSegundo) return
      tiempoCasco += dt
      if (tiempoCasco < 1 / s.cascosPorSegundo) return
      tiempoCasco = 0
      const fuente = ctx.createBufferSource()
      const filtro = ctx.createBiquadFilter()
      const gain = ctx.createGain()
      fuente.buffer = ruido()
      filtro.type = 'bandpass'
      filtro.frequency.value = 900 + Math.random() * 400
      gain.gain.value = s.ganancia
      fuente.connect(filtro).connect(gain).connect(ctx.destination)
      fuente.start()
    },
    /** La bocina: la corneta de dos tonos del Ford T, la del V8, o un relincho si es de tiro. */
    bocina(v) {
      if (!ctx || !prendido) return
      if (v.id === 'ford-t') tono('square', [330, 420, 520, 420], 0.7, 0.12)
      else if (v.traccion === 'motor') tono('sawtooth', [440, 554], 0.45, 0.1)
      else tono('sawtooth', [880, 980, 820, 700, 560], 0.8, 0.06)
    },
  }
}

export function crearModoManejar({ camera, lienzo, ventana = globalThis, cam, escena, coords, suelo, casas, epoca, pedirCuadro, cambiarEpoca = () => {}, alCambiar = () => {}, sonido = crearSonido() }) {
  let activo = false
  let estado = null
  let vehiculo = null
  let malla = null
  let vista = 'afuera'
  let rejilla = null
  let epocaDeRejilla = null
  let antes = null
  const teclas = new Set()
  const punteros = new Map()
  const chocaEn = (x, z) => choca(rejilla, x, z, RADIO_M)

  function ponerVehiculo(v) {
    if (malla) escena.remove(malla)
    vehiculo = v
    malla = crearVehiculo(v)
    escena.add(malla)
    alCambiar(true, v)
  }
  function armarRejilla() {
    epocaDeRejilla = epoca()
    rejilla = rejillaDeCasas(casas(), epocaDeRejilla, coords.aMundo)
    if (estado && chocaEn(estado.x, estado.z)) estado = { ...estado, ...puntoDeEntrada({ ...estado, dist: 0 }, chocaEn), velocidad: 0 }
  }
  function aplicar() {
    malla.position.set(estado.x, suelo(estado.x, estado.z), estado.z)
    malla.rotation.set(0, -estado.rumbo, 0)
    malla.visible = vista === 'afuera'
    const { ojo, mira } = camaraDeCoche(estado, vista, suelo)
    camera.position.set(ojo.x, ojo.y, ojo.z)
    camera.lookAt(mira.x, mira.y, mira.z)
    camera.updateMatrixWorld()
  }

  ventana.addEventListener('keydown', (e) => {
    if (!activo || e.target?.closest?.('input, textarea, select, [contenteditable], dialog, [role="dialog"]') || e.ctrlKey || e.metaKey || e.altKey) return
    const propia = () => { e.preventDefault(); e.stopImmediatePropagation() }
    if (e.code === 'Escape') { propia(); salir(); return }
    if (e.code in AÑO) { propia(); if (!e.repeat) cambiarEpoca(AÑO[e.code]); return }
    if (e.code === 'KeyV') { propia(); if (!e.repeat) vista = vista === 'afuera' ? 'cabina' : 'afuera'; pedirCuadro(3); return }
    if (e.code === 'KeyB') { propia(); if (!e.repeat) sonido.bocina(vehiculo); return }
    if (e.code === 'KeyM') { propia(); if (!e.repeat) sonido.alternar(); return }
    if (e.code === 'KeyN') { propia(); if (!e.repeat) ponerVehiculo(otroVehiculo(vehiculo.id, epoca())); return }
    if (!TECLAS.has(e.code)) return
    propia()
    teclas.add(e.code)
  }, { capture: true })
  ventana.addEventListener('keyup', (e) => { teclas.delete(e.code) }, { capture: true })
  ventana.addEventListener('blur', () => teclas.clear())

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

  /** Sube al vehículo de la época, en la calle libre más cercana a donde mira el mapa. → false sin las casas. */
  function entrar() {
    if (activo) return true
    if (!casas()) return false
    armarRejilla()
    const p = puntoDeEntrada(cam.now, chocaEn)
    estado = { x: p.x, z: p.z, rumbo: -cam.now.yaw, velocidad: 0 }
    antes = { near: camera.near, fov: camera.fov }
    camera.near = 0.2
    camera.fov = FOV
    camera.updateProjectionMatrix()
    cam.pausar(true)
    sonido.arrancar()
    activo = true
    ponerVehiculo(vehiculoDeEpoca(epoca()))
    aplicar()
    pedirCuadro(3)
    return true
  }

  function salir() {
    if (!activo) return
    activo = false
    teclas.clear()
    punteros.clear()
    escena.remove(malla)
    malla = null
    sonido.parar()
    camera.near = antes.near
    camera.fov = antes.fov
    camera.updateProjectionMatrix()
    cam.pausar(false)
    alCambiar(false, null)
    pedirCuadro(3)
  }

  function update(dt) {
    if (!activo) return false
    if (epoca() !== epocaDeRejilla) {
      armarRejilla()
      const deLaEpoca = vehiculoDeEpoca(epoca())
      if (deLaEpoca.desde > vehiculo.desde || vehiculo.desde > epoca()) ponerVehiculo(deLaEpoca) // Q/E: el de ese año
    }
    const [palanca] = punteros.values()
    const dedo = palanca && joystick(palanca.inicio, palanca.ultimo)
    const entrada = dedo ? { acelera: dedo.adelante, girar: dedo.lado } : entradaDeManejo(teclas)
    estado = pasoEnCoche(estado, entrada, dt, vehiculo, { choca: chocaEn })
    sonido.actualizar(vehiculo, estado.velocidad, dt)
    aplicar()
    return true
  }

  return {
    entrar, salir, update,
    get activo() { return activo },
    get estado() { return estado && { ...estado } },
    get vehiculo() { return vehiculo },
    get vista() { return vista },
    /** km/h, para el cartel. */
    get kmh() { return estado ? Math.round(Math.abs(estado.velocidad) * 3.6) : 0 },
  }
}
