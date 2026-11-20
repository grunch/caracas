/**
 * Cámara propia (sin OrbitControls): un estado objetivo y uno actual que lo persigue
 * con amortiguación exponencial. Arrastrar mueve, rueda acerca (hacia el cursor),
 * botón derecho gira e inclina. Con dos dedos (src/gestos.js): pellizcar acerca, gira y corre, y lo que estaba
 * entre los dedos sigue entre ellos; deslizarlos juntos hacia arriba o abajo inclina. El objetivo va apoyado en el suelo (`suelo(x, z)`, el relieve tal
 * como se dibuja) y la cámara nunca baja de él: acercarse al Ávila no lo atraviesa.
 */
import { Vector3, Raycaster, Plane, Vector2 } from 'three'
import { gestoDeDosDedos, modoDeGesto } from './gestos.js'
import { curvaSuave, vistaEnTrayecto } from './trayecto.js'

const LIMITES = { distMin: 40, distMax: 9000, pitchMin: 0.18, pitchMax: 1.5 }
const SUAVIDAD = 8
const SUAVIDAD_VUELO = 30 // en un vuelo con guion (volarA) la vista sigue de cerca al trayecto
const ALTURA_MINIMA_M = 12 // sobre el suelo que queda debajo de la cámara
const INCLINAR_POR_PX = 0.004 // como el botón derecho
// un toque de tecla (src/controles.js, movimientoDeTecla): llega amortiguado, como la rueda
const PASO = Object.freeze({ mover: 0.08, girar: 0.08, inclinar: 0.05, acercar: 1.25 })

export function crearCamara(camera, lienzo, { pedirCuadro, hoja, suelo = () => 0 }) {
  // arranca mirando la hoja entera, un poco inclinada, como un plano sobre la mesa
  const goal = { x: hoja.x0 + hoja.ancho / 2, z: hoja.z0 + hoja.alto / 2, y: 0, dist: Math.max(hoja.ancho, hoja.alto) * 1.9, yaw: 0, pitch: 1.2 }
  const now = { ...goal }
  const plano = new Plane(new Vector3(0, 1, 0), 0)
  const rayo = new Raycaster()
  let arrastre = null
  const dedos = new Map() // pointerId → { x, y } de los punteros apoyados
  let pausada = false // un modo de recorrido (src/a-pie-modo.js) tiene la vista: no se atiende la entrada
  let dos = null // el gesto con dos dedos en curso: { ids, inicio, previo, modo, altura, ancla }
  let vuelo = null // el vuelo con guion en curso (volarA): { desde, hasta, t, segundos }

  // el plano horizontal a la altura del objetivo (fija durante un arrastre, para que no resbale)
  const alSuelo = (cx, cy, altura = now.y) => {
    plano.constant = -altura
    const r = lienzo.getBoundingClientRect()
    rayo.setFromCamera(new Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera)
    return rayo.ray.intersectPlane(plano, new Vector3())
  }
  const acotar = () => {
    goal.dist = Math.min(LIMITES.distMax, Math.max(LIMITES.distMin, goal.dist))
    goal.pitch = Math.min(LIMITES.pitchMax, Math.max(LIMITES.pitchMin, goal.pitch))
    goal.x = Math.min(hoja.x0 + hoja.ancho, Math.max(hoja.x0, goal.x))
    goal.z = Math.min(hoja.z0 + hoja.alto, Math.max(hoja.z0, goal.z))
  }

  lienzo.addEventListener('contextmenu', (e) => e.preventDefault())
  const empezarArrastre = (boton, x, y) => { arrastre = { boton, x, y, altura: now.y, ancla: alSuelo(x, y, now.y) } }
  const par = () => [...dedos.values()].slice(0, 2).map((d) => ({ ...d }))
  const idsDelPar = () => [...dedos.keys()].slice(0, 2)
  /** El gesto con dos dedos arranca (o vuelve a arrancar) desde donde están ahora los dos primeros. */
  const empezarDos = () => {
    const inicio = par()
    const medio = { x: (inicio[0].x + inicio[1].x) / 2, y: (inicio[0].y + inicio[1].y) / 2 }
    dos = { ids: idsDelPar(), inicio, previo: inicio, modo: null, altura: now.y, ancla: alSuelo(medio.x, medio.y, now.y) }
  }
  lienzo.addEventListener('pointerdown', (e) => {
    if (pausada) return
    vuelo = null
    lienzo.setPointerCapture(e.pointerId)
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (dedos.size === 2) {
      arrastre = null
      empezarDos()
    } else if (dedos.size === 1) {
      empezarArrastre(e.button, e.clientX, e.clientY)
    }
  })
  lienzo.addEventListener('pointermove', (e) => {
    if (pausada) return
    if (dedos.has(e.pointerId)) dedos.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (dos && dedos.size >= 2) {
      moverConDos()
      return
    }
    if (!arrastre) return
    if (arrastre.boton === 2) {
      goal.yaw -= (e.clientX - arrastre.x) * 0.005
      goal.pitch += (e.clientY - arrastre.y) * 0.004
      arrastre.x = e.clientX
      arrastre.y = e.clientY
    } else if (arrastre.ancla) {
      const p = alSuelo(e.clientX, e.clientY, arrastre.altura)
      if (p) {
        goal.x += arrastre.ancla.x - p.x
        goal.z += arrastre.ancla.z - p.z
        Object.assign(now, { x: goal.x, z: goal.z })
        aplicar()
      }
    }
    acotar()
    pedirCuadro(3)
  })
  /** Dos dedos: el modo se decide una vez; hasta entonces no se aplica nada, y al decidir, todo desde el inicio. */
  function moverConDos() {
    const ahora = par()
    dos.modo ??= modoDeGesto(dos.inicio, ahora)
    if (!dos.modo) return
    const g = gestoDeDosDedos(dos.previo, ahora)
    dos.previo = ahora
    if (dos.modo === 'inclinar') {
      goal.pitch += g.inclinar * INCLINAR_POR_PX
    } else {
      goal.dist /= g.escala
      goal.yaw += g.giro
    }
    acotar()
    Object.assign(now, { dist: goal.dist, yaw: goal.yaw, pitch: goal.pitch })
    aplicar()
    // lo que estaba entre los dedos vuelve a quedar entre ellos (así acerca hacia ahí y gira alrededor de ahí)
    const p = dos.modo === 'pellizcar' && dos.ancla ? alSuelo(g.medio.x, g.medio.y, dos.altura) : null
    if (p) {
      goal.x += dos.ancla.x - p.x
      goal.z += dos.ancla.z - p.z
      acotar()
      Object.assign(now, { x: goal.x, z: goal.z })
      aplicar()
    }
    pedirCuadro(3)
  }
  const soltar = (e) => {
    dedos.delete(e.pointerId)
    if (dedos.size >= 2) {
      // si se levantó uno de los dos del gesto, el par es otro: se arranca de nuevo, sin tomar el cambio por gesto
      if (dos && dos.ids.includes(e.pointerId)) empezarDos()
      return
    }
    dos = null
    // si queda un dedo, sigue arrastrando desde donde está (sin salto)
    const [queda] = dedos.values()
    if (queda) empezarArrastre(0, queda.x, queda.y)
    else arrastre = null
  }
  lienzo.addEventListener('pointerup', soltar)
  lienzo.addEventListener('pointercancel', soltar)
  lienzo.addEventListener('wheel', (e) => {
    if (pausada) return
    vuelo = null
    e.preventDefault()
    const p = alSuelo(e.clientX, e.clientY)
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1)
    const nueva = Math.min(LIMITES.distMax, Math.max(LIMITES.distMin, goal.dist * Math.exp(delta * 0.0012)))
    const f = nueva / goal.dist
    if (p) {
      goal.x = p.x + (goal.x - p.x) * f
      goal.z = p.z + (goal.z - p.z) * f
    }
    goal.dist = nueva
    acotar()
    pedirCuadro(3)
  }, { passive: false })

  function aplicar() {
    const h = Math.cos(now.pitch) * now.dist
    const x = now.x + Math.sin(now.yaw) * h
    const z = now.z + Math.cos(now.yaw) * h
    camera.position.set(x, Math.max(now.y + Math.sin(now.pitch) * now.dist, suelo(x, z) + ALTURA_MINIMA_M), z)
    camera.lookAt(now.x, now.y, now.z)
    camera.updateMatrixWorld()
  }

  /** Avanza la amortiguación; devuelve true si todavía se está moviendo. */
  function update(dt) {
    const enVuelo = Boolean(vuelo)
    if (vuelo) {
      vuelo.t = Math.min(1, vuelo.t + dt / vuelo.segundos)
      Object.assign(goal, vuelo.t >= 1 ? vuelo.hasta : vistaEnTrayecto(vuelo.desde, vuelo.hasta, curvaSuave(vuelo.t)))
      acotar()
      if (vuelo.t >= 1) vuelo = null
    }
    const k = 1 - Math.exp(-(enVuelo ? SUAVIDAD_VUELO : SUAVIDAD) * dt)
    goal.y = suelo(goal.x, goal.z)
    let moviendo = enVuelo
    for (const c of Object.keys(goal)) {
      const d = goal[c] - now[c]
      if (Math.abs(d) > 1e-4 * (c === 'dist' ? now.dist : 1)) moviendo = true
      now[c] += d * k
    }
    aplicar()
    return moviendo
  }

  acotar()
  goal.y = suelo(goal.x, goal.z)
  Object.assign(now, goal)
  aplicar()
  /** Salta la cámara (sin animación, dentro de los límites) y pide cuadros: con el render quieto, si no, la vista no cambia. */
  function jump(v) {
    vuelo = null
    Object.assign(goal, v)
    acotar()
    goal.y = suelo(goal.x, goal.z)
    Object.assign(now, goal)
    aplicar()
    pedirCuadro(3)
  }

  /** Vuela (con la misma amortiguación que el arrastre) hasta lo que se le pase: { x, z, dist, yaw, pitch }. */
  function volar(v) {
    vuelo = null
    Object.assign(goal, v)
    acotar()
    pedirCuadro(3)
  }

  /**
   * Vuela con guion hasta `v` ({ x, z, dist, yaw, pitch }, lo que falte queda como está) en `segundos`: arranca
   * y llega suave (src/trayecto.js). Lo corta cualquier cosa que haga la persona con la cámara.
   */
  function volarA(v, segundos) {
    const desde = { x: goal.x, z: goal.z, dist: goal.dist, yaw: goal.yaw, pitch: goal.pitch }
    vuelo = { desde, hasta: { ...desde, ...v }, t: 0, segundos }
    pedirCuadro(3)
  }

  /** Con el teclado: corre el destino `dx` (derecha) y `dy` (abajo) pasos, en las direcciones de la pantalla. */
  function mover(dx, dy) {
    vuelo = null
    const paso = goal.dist * PASO.mover
    const adelante = { x: -Math.sin(goal.yaw), z: -Math.cos(goal.yaw) }
    const derecha = { x: Math.cos(goal.yaw), z: -Math.sin(goal.yaw) }
    goal.x += (derecha.x * dx - adelante.x * dy) * paso
    goal.z += (derecha.z * dx - adelante.z * dy) * paso
    acotar()
    pedirCuadro(3)
  }
  /** Acerca (`veces` > 0) o aleja (< 0), un paso por vez. */
  function acercar(veces) {
    vuelo = null
    goal.dist /= PASO.acercar ** veces
    acotar()
    pedirCuadro(3)
  }
  /** Gira (`giro` > 0: como los dedos en el sentido del reloj) e inclina (`inclinar` > 0: más desde arriba). */
  function girar(giro, inclinar) {
    vuelo = null
    goal.yaw += giro * PASO.girar
    goal.pitch += inclinar * PASO.inclinar
    acotar()
    pedirCuadro(3)
  }

  /** Deja de atender (o vuelve a atender) el ratón, los dedos y la rueda; suelta lo que estuviera apretado. */
  function pausar(si) {
    pausada = si
    vuelo = null
    arrastre = null
    dos = null
    dedos.clear()
  }

  return {
    goal, now, update, jump, volar, volarA, mover, acercar, girar, pausar,
    get volando() { return Boolean(vuelo) },
  }
}
