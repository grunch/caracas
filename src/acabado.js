/**
 * La luz y el acabado del cuadro (specs/04): antes de dibujar, el **mapa de sombras** desde el sol; después,
 * una pasada a pantalla completa con el **contorno a tinta** (de la profundidad), la **bruma** y el
 * **grano de papel** (src/shader/acabado.js). `dibujar()` reemplaza a `renderer.render(scene, camera)`
 * en el render bajo demanda: el cuadro se hace solo cuando alguien lo pide.
 *
 * - Las sombras: una cámara ortográfica en la dirección del sol, ajustada en cada cuadro a lo que la vista
 *   corta en el suelo (src/luz.js). Tiran sombra las mallas (sueltas o en un grupo) con `castShadow` y `customDepthMaterial` (el
 *   mismo vértice que su material: la ola, las épocas, el relieve); el suelo solo la recibe. Los materiales
 *   la leen con los uniforms de `U` (src/shader/sombra.js). Si nada cambió desde el cuadro anterior (la
 *   caja, la ola, las épocas, el color, el relieve), el mapa no se rehace; con la ciudad acostada en la hoja no hay sombras.
 * - El acabado: la escena va a una textura del tamaño de la pantalla (sRGB de 8 bits, con su profundidad) y
 *   de ahí a la pantalla, píxel a píxel (sin filtro: no desenfoca la letra chica del plano).
 */
import {
  WebGLRenderTarget, DepthTexture, OrthographicCamera, Scene, Mesh, BufferGeometry, BufferAttribute, ShaderMaterial,
  Matrix4, Vector2, Vector3, Vector4, LessEqualCompare, LinearFilter, NearestFilter, UnsignedIntType, SRGBColorSpace,
} from 'three'
import { ajustarSombra, huellaDeVista, alcanceDeSombras } from './luz.js'
import { VERTICE_ACABADO, FRAGMENTO_ACABADO } from './shader/acabado.js'

const A_UV = new Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1) // de −1…1 a 0…1
// entre estas alturas (metros del mundo, con el relieve exagerado) está todo lo que puede tirar sombra
const ALTURAS = Object.freeze({ yMin: -600, yMax: 3600 })
// lo que mueve una sombra además de la cámara: si nada de esto cambió, el mapa del cuadro anterior sirve
const MUEVEN_LA_SOMBRA = Object.freeze(['uOla', 'uOlaEpoca', 'uEpocaDe', 'uEpocaA', 'uColor', 'uExageracion'])

const tiraSombra = (o) => o.isMesh && o.castShadow && Boolean(o.customDepthMaterial)

/**
 * Con qué se dibuja una malla en el mapa de sombras: su material de profundidad. Si su material es un array
 * (las baldosas de casas, que dibujan solo los grupos de su geometría: src/casas.js), otro array igual de
 * largo: así en el mapa también se dibujan solo esos grupos.
 */
export const materialDeSombraDe = (o) => (Array.isArray(o.material) ? o.material.map(() => o.customDepthMaterial) : o.customDepthMaterial)

/**
 * Quién tira sombra entre los hijos visibles de la escena: una malla con `castShadow` y `customDepthMaterial`,
 * o las piezas así de un grupo (la avioneta, src/volar-modo.js). `ocultos`: lo que se esconde en la pasada.
 * `pose`: la posición y el giro de lo que tira, y cuáles de sus hijas están visibles (si cambia, el mapa de
 * sombras se rehace).
 */
export function repartoDeSombra(objetos) {
  const tiran = []
  const ocultos = []
  const poses = []
  for (const o of objetos) {
    if (!o.visible) continue
    const piezas = tiraSombra(o) ? [o] : o.isGroup ? o.children.filter((h) => h.visible && tiraSombra(h)) : []
    if (!piezas.length) { ocultos.push(o); continue }
    tiran.push(...piezas)
    if (o.isGroup) ocultos.push(...o.children.filter((h) => h.visible && !piezas.includes(h)))
    // qué hijas de lo que tira están prendidas (los árboles cambian de detalle sin cambiar de cuenta ni de pose)
    const hijas = piezas.flatMap((p) => p.children.filter((h) => h.visible).map((h) => h.id)).join('.')
    poses.push([...o.position.toArray(), ...o.quaternion.toArray()].join(',') + (hijas ? `:${hijas}` : ''))
  }
  return { tiran, ocultos, pose: poses.join(';') }
}

/**
 * `ajustes`: { sombras: lado del mapa (0 = sin sombras), contorno, grano } (ajustesDeAcabado, src/luz.js).
 * `U`: los uniforms de la ciudad. `vista()`: { dist, y } de lo que mira la cámara (src/camara.js).
 * `limite`: { x0, z0, x1, z1 }, la hoja.
 */
export function crearAcabado({ renderer, scene, camera, U, ajustes, limite, vista }) {
  const tamaño = new Vector2()
  let sombras = null
  let lienzo = null
  let cuadrosDeSombra = 0

  if (ajustes.sombras > 0) {
    const n = ajustes.sombras
    const profundidad = new DepthTexture(n, n, UnsignedIntType)
    profundidad.compareFunction = LessEqualCompare // el shader la lee con sampler2DShadow: compara y filtra
    profundidad.minFilter = profundidad.magFilter = LinearFilter
    const destino = new WebGLRenderTarget(n, n, { depthTexture: profundidad, minFilter: NearestFilter, magFilter: NearestFilter })
    // el mapa existe (vacío: todo al sol) desde ya: los materiales lo tienen enlazado aunque todavía no se lea
    renderer.setRenderTarget(destino)
    renderer.clear()
    renderer.setRenderTarget(null)
    sombras = { destino, camara: new OrthographicCamera(), n, estado: '' }
    U.tSombra.value = profundidad
  }

  if (ajustes.contorno || ajustes.grano) {
    const destino = new WebGLRenderTarget(1, 1, { minFilter: NearestFilter, magFilter: NearestFilter, colorSpace: SRGBColorSpace })
    destino.depthTexture = new DepthTexture(1, 1, UnsignedIntType)
    destino.depthTexture.minFilter = destino.depthTexture.magFilter = NearestFilter
    const material = new ShaderMaterial({
      uniforms: {
        tColor: { value: destino.texture },
        tProf: { value: destino.depthTexture },
        uTexel: { value: new Vector2(1, 1) },
        uCamara: { value: new Vector4(1, 1000, 0.001, 1) },
        uAjustes: { value: new Vector3(ajustes.contorno ? 1 : 0, ajustes.grano ? 1 : 0, 0) },
        uColor: U.uColor,
      },
      vertexShader: VERTICE_ACABADO,
      fragmentShader: FRAGMENTO_ACABADO,
      depthTest: false,
      depthWrite: false,
    })
    // un triángulo que cubre la pantalla
    const triangulo = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    const malla = new Mesh(triangulo, material)
    malla.frustumCulled = false
    lienzo = { destino, material, escena: new Scene().add(malla), camara: new OrthographicCamera(-1, 1, 1, -1, 0, 1) }
  }

  /** La caja del mapa de sombras para la vista de ahora; devuelve su firma (para saber si cambió). */
  function ajustarCamaraDeSombras(alcance) {
    const e = camera.matrixWorld.elements
    const caja = ajustarSombra({
      puntos: huellaDeVista({
        ojo: [e[12], e[13], e[14]], derecha: [e[0], e[1], e[2]], arriba: [e[4], e[5], e[6]], adelante: [-e[8], -e[9], -e[10]],
        fov: camera.fov, aspecto: camera.aspect, ySuelo: vista().y, alcance,
      }),
      sol: U.uSol.value.toArray(), tamaño: sombras.n, limite, ...ALTURAS,
    })
    const c = sombras.camara
    Object.assign(c, { left: caja.izquierda, right: caja.derecha, bottom: caja.abajo, top: caja.arriba, near: caja.cerca, far: caja.lejos })
    c.position.set(0, 0, 0)
    c.lookAt(U.uSol.value.clone().negate())
    c.updateProjectionMatrix()
    c.updateMatrixWorld()
    U.uSombraMat.value.multiplyMatrices(A_UV, c.projectionMatrix).multiply(c.matrixWorldInverse)
    U.uSombra.value.set(1, 1 / sombras.n, caja.texel, 1 / (caja.lejos - caja.cerca))
    return `${caja.izquierda},${caja.abajo},${caja.lado},${alcance}`
  }

  /** El mapa de sombras: la escena desde el sol, solo lo que tira sombra y con su material de profundidad. */
  function dibujarSombras(firma) {
    const reparto = repartoDeSombra(scene.children)
    const tiran = reparto.tiran.map((o) => [o, o.material])
    const { ocultos } = reparto
    // (el relieve llega después de arrancar y cambia de textura: con él cambian todas las alturas;
    // la pose de lo que se mueve, como la avioneta, también rehace el mapa)
    const estado = `${firma}|${tiran.length}|${reparto.pose}|${U.tRelieve?.value?.uuid}|${MUEVEN_LA_SOMBRA.map((k) => U[k]?.value).join(',')}`
    if (estado === sombras.estado) return
    sombras.estado = estado
    for (const [o] of tiran) o.material = materialDeSombraDe(o)
    for (const o of ocultos) o.visible = false
    const fondo = scene.background
    scene.background = null
    try {
      renderer.setRenderTarget(sombras.destino)
      renderer.clear()
      renderer.render(scene, sombras.camara)
    } finally {
      renderer.setRenderTarget(null)
      scene.background = fondo
      for (const [o, material] of tiran) o.material = material
      for (const o of ocultos) o.visible = true
    }
    cuadrosDeSombra++
  }

  /** Un cuadro entero: las sombras (si cambiaron), la escena y el acabado. */
  function dibujar() {
    renderer.getDrawingBufferSize(tamaño)
    const radPorPixel = (2 * Math.tan((camera.fov * Math.PI) / 360)) / tamaño.y
    const pixeles = renderer.getPixelRatio()
    const alcance = alcanceDeSombras(vista().dist)
    U.uVista.value.set(alcance, radPorPixel, pixeles, 0)
    if (sombras) {
      // acostada en la hoja nada tira sombra: ni el mapa ni su lectura
      if (U.uOla.value > 0) dibujarSombras(ajustarCamaraDeSombras(alcance))
      else U.uSombra.value.x = 0
    }
    if (!lienzo) { renderer.render(scene, camera); return }
    if (lienzo.destino.width !== tamaño.x || lienzo.destino.height !== tamaño.y) lienzo.destino.setSize(tamaño.x, tamaño.y)
    const u = lienzo.material.uniforms
    u.uTexel.value.set(1 / tamaño.x, 1 / tamaño.y)
    u.uCamara.value.set(camera.near, camera.far, radPorPixel, pixeles)
    renderer.setRenderTarget(lienzo.destino)
    renderer.render(scene, camera)
    renderer.setRenderTarget(null)
    renderer.render(lienzo.escena, lienzo.camara)
  }

  return {
    dibujar,
    invalidarSombras() { if (sombras) sombras.estado = null },
    ajustes,
    /** Para las pruebas y las capturas: qué está prendido y cuántas veces se rehízo el mapa de sombras. */
    get estado() {
      return {
        sombras: sombras ? sombras.n : 0, contorno: ajustes.contorno, grano: ajustes.grano, pasada: Boolean(lienzo),
        cuadrosDeSombra, texel: sombras ? U.uSombra.value.z : null,
      }
    },
    get mapaDeSombras() { return sombras?.destino ?? null },
    get destino() { return lienzo?.destino ?? null },
  }
}
