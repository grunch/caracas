/**
 * Cámara propia (sin OrbitControls): un estado objetivo y uno actual que lo persigue
 * con amortiguación exponencial. Arrastrar mueve, rueda acerca (hacia el cursor),
 * botón derecho gira e inclina. El objetivo va apoyado en el suelo (`suelo(x, z)`, el relieve tal
 * como se dibuja) y la cámara nunca baja de él: acercarse al Ávila no lo atraviesa.
 */
import { Vector3, Raycaster, Plane, Vector2 } from 'three'

const LIMITES = { distMin: 40, distMax: 9000, pitchMin: 0.18, pitchMax: 1.5 }
const SUAVIDAD = 8
const ALTURA_MINIMA_M = 12 // sobre el suelo que queda debajo de la cámara

export function crearCamara(camera, lienzo, { pedirCuadro, hoja, suelo = () => 0 }) {
  // arranca mirando la hoja entera, un poco inclinada, como un plano sobre la mesa
  const goal = { x: hoja.x0 + hoja.ancho / 2, z: hoja.z0 + hoja.alto / 2, y: 0, dist: Math.max(hoja.ancho, hoja.alto) * 1.9, yaw: 0, pitch: 1.2 }
  const now = { ...goal }
  const plano = new Plane(new Vector3(0, 1, 0), 0)
  const rayo = new Raycaster()
  let arrastre = null

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
  lienzo.addEventListener('pointerdown', (e) => {
    lienzo.setPointerCapture(e.pointerId)
    arrastre = { boton: e.button, x: e.clientX, y: e.clientY, altura: now.y, ancla: alSuelo(e.clientX, e.clientY, now.y) }
  })
  lienzo.addEventListener('pointermove', (e) => {
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
  const soltar = () => { arrastre = null }
  lienzo.addEventListener('pointerup', soltar)
  lienzo.addEventListener('pointercancel', soltar)
  lienzo.addEventListener('wheel', (e) => {
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
    const k = 1 - Math.exp(-SUAVIDAD * dt)
    goal.y = suelo(goal.x, goal.z)
    let moviendo = false
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
  /** Salta la cámara (sin animación) y pide cuadros: con el render quieto, si no, la vista no cambia. */
  function jump(v) {
    Object.assign(goal, v)
    goal.y = suelo(goal.x, goal.z)
    Object.assign(now, goal)
    aplicar()
    pedirCuadro(3)
  }

  /** Vuela (con la misma amortiguación que el arrastre) hasta lo que se le pase: { x, z, dist, yaw, pitch }. */
  function volar(v) {
    Object.assign(goal, v)
    acotar()
    pedirCuadro(3)
  }

  return { goal, now, update, jump, volar }
}
