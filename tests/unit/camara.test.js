import { describe, test, expect } from 'vitest'
import { PerspectiveCamera, Raycaster, Vector2, Vector3, Plane } from 'three'
import { crearCamara } from '../../src/camara.js'

const lienzo = { addEventListener() {}, setPointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) }
const hoja = { x0: -1000, z0: -1000, ancho: 2000, alto: 2000 }

describe('crearCamara', () => {
  test('jump() pide cuadros: con el render quieto, si no, la vista no cambiaría', () => {
    const pedidos = []
    const cam = crearCamara(new PerspectiveCamera(), lienzo, { pedirCuadro: (n) => pedidos.push(n), hoja })
    pedidos.length = 0
    cam.jump({ x: 100, z: 50, dist: 600 })
    expect(pedidos.length).toBeGreaterThan(0)
    expect(cam.now).toMatchObject({ x: 100, z: 50, dist: 600 })
  })

  test('volar() cambia el destino sin saltar: la cámara llega animada, dentro de la hoja y de los límites', () => {
    // Arrange
    const pedidos = []
    const cam = crearCamara(new PerspectiveCamera(), lienzo, { pedirCuadro: (n) => pedidos.push(n), hoja })
    cam.jump({ x: 0, z: 0, dist: 2000 })
    pedidos.length = 0
    // Act
    cam.volar({ x: 5000, z: 50, dist: 1 })
    // Assert: el destino queda acotado; la vista todavía no se movió y hay cuadros pedidos
    expect(cam.goal).toMatchObject({ x: 1000, z: 50, dist: 40 })
    expect(cam.now).toMatchObject({ x: 0, z: 0, dist: 2000 })
    expect(pedidos.length).toBeGreaterThan(0)
    // y al avanzar el tiempo se acerca
    expect(cam.update(0.1)).toBe(true)
    expect(cam.now.x).toBeGreaterThan(0)
    for (let i = 0; i < 200; i++) cam.update(0.1)
    expect(cam.now.x).toBeCloseTo(1000, 1)
  })
})

describe('crearCamara con los dedos', () => {
  // un lienzo de 100 × 100 que guarda sus oyentes para mandarles eventos
  function lienzoConOyentes() {
    const oyentes = {}
    return {
      oyentes,
      addEventListener(tipo, f) { oyentes[tipo] = f },
      setPointerCapture() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      mandar(tipo, id, x, y) { oyentes[tipo]({ pointerId: id, clientX: x, clientY: y, button: 0, preventDefault() {} }) },
    }
  }
  function armar() {
    const camera = new PerspectiveCamera(35, 1, 5, 60000)
    const l = lienzoConOyentes()
    const cam = crearCamara(camera, l, { pedirCuadro: () => {}, hoja })
    cam.jump({ x: 0, z: 0, dist: 1500, yaw: 0, pitch: 1.0 })
    return { camera, l, cam }
  }
  /** El punto del suelo (y = 0) bajo un punto de la pantalla. */
  function sueloBajo(camera, x, y) {
    const rayo = new Raycaster()
    rayo.setFromCamera(new Vector2(x / 50 - 1, 1 - y / 50), camera)
    return rayo.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), new Vector3())
  }
  function enPantalla(camera, p) {
    const v = p.clone().project(camera)
    return { x: (v.x + 1) * 50, y: (1 - v.y) * 50 }
  }

  test('con dos dedos, lo que estaba bajo cada dedo sigue bajo él: acerca, gira y corre a la vez', () => {
    // Arrange
    const { camera, l, cam } = armar()
    l.mandar('pointerdown', 1, 40, 50)
    l.mandar('pointerdown', 2, 60, 50)
    const bajo1 = sueloBajo(camera, 40, 50)
    const bajo2 = sueloBajo(camera, 60, 50)
    const antes = { ...cam.now }

    // Act: los dedos se separan y giran en el sentido del reloj
    l.mandar('pointermove', 1, 36, 46)
    l.mandar('pointermove', 2, 66, 56)

    // Assert
    const p1 = enPantalla(camera, bajo1)
    const p2 = enPantalla(camera, bajo2)
    expect(Math.hypot(p1.x - 36, p1.y - 46)).toBeLessThan(2)
    expect(Math.hypot(p2.x - 66, p2.y - 56)).toBeLessThan(2)
    expect(cam.now.dist).toBeLessThan(antes.dist)
    expect(cam.now.yaw).toBeGreaterThan(antes.yaw)
    expect(cam.goal).toMatchObject({ dist: cam.now.dist, yaw: cam.now.yaw })   // sin amortiguar: van con los dedos
  })

  test('deslizar los dos dedos hacia arriba inclina la vista (más rasante)', () => {
    const { l, cam } = armar()
    l.mandar('pointerdown', 1, 40, 60)
    l.mandar('pointerdown', 2, 60, 60)
    for (const y of [55, 50, 45, 40]) { l.mandar('pointermove', 1, 40, y); l.mandar('pointermove', 2, 60, y) }
    expect(cam.goal.pitch).toBeLessThan(1.0)
    expect(cam.goal.dist).toBe(1500)   // inclinar no acerca
  })

  test('un deslizamiento rápido hacia arriba (un aviso por dedo) también inclina', () => {
    const { l, cam } = armar()
    l.mandar('pointerdown', 1, 40, 60)
    l.mandar('pointerdown', 2, 60, 60)
    l.mandar('pointermove', 1, 40, 45)
    l.mandar('pointermove', 2, 60, 45)
    expect(cam.goal.pitch).toBeLessThan(1.0)
    expect(cam.goal.dist).toBe(1500)   // no lo tomó por un pellizco
  })

  test('si cambia el par de dedos (se apoyó un tercero y se levantó uno), el gesto arranca de nuevo sin saltos', () => {
    // Arrange
    const { l, cam } = armar()
    l.mandar('pointerdown', 1, 40, 50)
    l.mandar('pointerdown', 2, 60, 50)
    l.mandar('pointerdown', 3, 90, 50)
    l.mandar('pointerup', 1, 40, 50)
    const antes = { ...cam.goal }

    // Act: el tercer dedo apenas se mueve
    l.mandar('pointermove', 3, 91, 50)

    // Assert
    expect(cam.goal).toMatchObject({ dist: antes.dist, yaw: antes.yaw, x: antes.x, z: antes.z })
  })

  test('al levantar un dedo, el otro sigue arrastrando sin saltos', () => {
    // Arrange
    const { camera, l, cam } = armar()
    l.mandar('pointerdown', 1, 40, 50)
    l.mandar('pointerdown', 2, 60, 50)
    l.mandar('pointermove', 2, 70, 50)
    l.mandar('pointerup', 2, 70, 50)
    const bajo = sueloBajo(camera, 40, 50)

    // Act
    l.mandar('pointermove', 1, 45, 52)

    // Assert
    const p = enPantalla(camera, bajo)
    expect(Math.hypot(p.x - 45, p.y - 52)).toBeLessThan(1)
    expect(Number.isFinite(cam.now.x)).toBe(true)
  })

  test('los gestos respetan los límites de distancia e inclinación', () => {
    const { l, cam } = armar()
    l.mandar('pointerdown', 1, 49, 50)
    l.mandar('pointerdown', 2, 51, 50)
    l.mandar('pointermove', 1, 0, 50)
    l.mandar('pointermove', 2, 100, 50)
    l.mandar('pointermove', 1, -5000, 50)
    l.mandar('pointermove', 2, 5000, 50)
    expect(cam.goal.dist).toBeGreaterThanOrEqual(40)
  })
})

describe('crearCamara con el teclado', () => {
  const armar = () => {
    const cam = crearCamara(new PerspectiveCamera(35, 1, 5, 60000), lienzo, { pedirCuadro: () => {}, hoja })
    cam.jump({ x: 0, z: 0, dist: 1000, yaw: 0, pitch: 1.0 })
    return cam
  }

  test('mover() corre el destino en la dirección de la pantalla, en proporción a la distancia', () => {
    // Arrange: con yaw 0 la cámara mira hacia −z; arriba en la pantalla es −z y a la derecha es +x
    const cam = armar()
    // Act
    cam.mover(0, -1)
    const arriba = { ...cam.goal }
    cam.mover(1, 1)
    // Assert
    expect(arriba.z).toBeLessThan(0)
    expect(arriba.x).toBeCloseTo(0)
    expect(cam.goal.x).toBeGreaterThan(0)
    expect(cam.goal.z).toBeCloseTo(0)
    expect(Math.abs(arriba.z)).toBeGreaterThan(20)        // un paso se nota
    expect(Math.abs(arriba.z)).toBeLessThan(1000 * 0.25)  // y no salta
  })

  test('mover() respeta el giro: con la vista girada, «arriba» es otra dirección del suelo', () => {
    const cam = armar()
    cam.jump({ yaw: Math.PI / 2 })
    cam.mover(0, -1)
    expect(cam.goal.x).toBeLessThan(0)
    expect(cam.goal.z).toBeCloseTo(0)
  })

  test('acercar() y girar() cambian el destino dentro de los límites', () => {
    const cam = armar()
    cam.acercar(1)
    expect(cam.goal.dist).toBeLessThan(1000)
    for (let i = 0; i < 200; i++) cam.acercar(1)
    expect(cam.goal.dist).toBe(40)
    cam.girar(1, 0)
    expect(cam.goal.yaw).toBeGreaterThan(0)
    for (let i = 0; i < 200; i++) cam.girar(0, 1)
    expect(cam.goal.pitch).toBe(1.5)
  })
})
