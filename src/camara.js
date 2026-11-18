/**
 * Cámara propia (sin OrbitControls): un estado objetivo y uno actual que lo persigue
 * con amortiguación exponencial. Arrastrar mueve, rueda acerca (hacia el cursor),
 * botón derecho gira e inclina.
 */
import { Vector3, Raycaster, Plane, Vector2 } from 'three'

const LIMITES = { distMin: 40, distMax: 9000, pitchMin: 0.18, pitchMax: 1.5 }
const SUAVIDAD = 8

export function crearCamara(camera, lienzo, { pedirCuadro, hoja }) {
  // arranca mirando la hoja entera, un poco inclinada, como un plano sobre la mesa
  const goal = { x: hoja.x0 + hoja.ancho / 2, z: hoja.z0 + hoja.alto / 2, dist: Math.max(hoja.ancho, hoja.alto) * 1.9, yaw: 0, pitch: 1.2 }
  const now = { ...goal }
  const suelo = new Plane(new Vector3(0, 1, 0), 0)
  const rayo = new Raycaster()
  let arrastre = null

  const alSuelo = (cx, cy) => {
    const r = lienzo.getBoundingClientRect()
    rayo.setFromCamera(new Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera)
    return rayo.ray.intersectPlane(suelo, new Vector3())
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
    arrastre = { boton: e.button, x: e.clientX, y: e.clientY, ancla: alSuelo(e.clientX, e.clientY) }
  })
  lienzo.addEventListener('pointermove', (e) => {
    if (!arrastre) return
    if (arrastre.boton === 2) {
      goal.yaw -= (e.clientX - arrastre.x) * 0.005
      goal.pitch += (e.clientY - arrastre.y) * 0.004
      arrastre.x = e.clientX
      arrastre.y = e.clientY
    } else if (arrastre.ancla) {
      const p = alSuelo(e.clientX, e.clientY)
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
    camera.position.set(now.x + Math.sin(now.yaw) * h, Math.sin(now.pitch) * now.dist, now.z + Math.cos(now.yaw) * h)
    camera.lookAt(now.x, 0, now.z)
    camera.updateMatrixWorld()
  }

  /** Avanza la amortiguación; devuelve true si todavía se está moviendo. */
  function update(dt) {
    const k = 1 - Math.exp(-SUAVIDAD * dt)
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
  Object.assign(now, goal)
  aplicar()
  return { goal, now, update, jump: (v) => { Object.assign(goal, v); Object.assign(now, goal); aplicar() } }
}
