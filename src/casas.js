/**
 * Las casas en la escena: un grupo con una malla por baldosa y pase (src/baldosas.js, src/ciudad-pedido.js).
 * Todas comparten el material de la ciudad. De cada una solo se dibujan los tramos de índices de las casas que
 * viven en la época que se mira (`ponerEpocas`), y three.js saltea las que quedan fuera de la vista: por eso
 * su esfera cubre la baldosa acostada en la hoja y también levantada sobre el relieve (`ponerRelieve`), que es
 * donde el shader la dibuja.
 *
 * three.js sube una geometría a la GPU la primera vez que la dibuja. Las baldosas que no se ven al abrir (las
 * de otras épocas, las de fuera de la vista) se subirían todas juntas al cambiar de época, con un tirón: por
 * eso `subirUna` las va subiendo de a una mientras nadie pide cuadros.
 */
import { Camera, Group, Mesh, MeshBasicMaterial, Scene, Sphere, Vector3, WebGLRenderTarget } from 'three'
import { geometriaDePaquete } from './ciudad-geometria.js'
import { rangosVivos, esferaSobreRelieve, alturasBajo } from './baldosas.js'
import { SIN_LINEA_DE_TIEMPO } from './epocas.js'

const ANTES_QUE_EL_SUELO = -1
const MARGEN_RELIEVE_M = 15 // lo que el terreno puede pasarse entre las muestras con que se mide una baldosa

export function crearCasas({ material, materialDeSombra }) {
  const grupo = new Group()
  const baldosas = []
  let epocas = [SIN_LINEA_DE_TIEMPO, SIN_LINEA_DE_TIEMPO]
  let alturaEn = null
  let alcance = 0
  // para subir una geometría sin que se vea: una malla aparte que la dibuja en un destino de 1 × 1
  const sonda = new Mesh(undefined, new MeshBasicMaterial())
  sonda.frustumCulled = false
  const escenaDeSonda = new Scene().add(sonda)
  const camaraDeSonda = new Camera()
  let destinoDeSonda = null

  function aplicarEpocas({ malla, tramos }) {
    const rangos = rangosVivos(tramos, ...epocas)
    malla.geometry.clearGroups()
    for (const r of rangos) malla.geometry.addGroup(r.desde, r.cuantos, 0)
    malla.visible = rangos.length > 0
  }

  function apoyar({ malla, esfera }) {
    const { yMin, yMax } = alturaEn ? alturasBajo(esfera, alturaEn) : { yMin: 0, yMax: 0 }
    const e = esferaSobreRelieve(esfera, yMin, yMax, alturaEn ? MARGEN_RELIEVE_M : 0)
    malla.geometry.boundingSphere = new Sphere(new Vector3(...e.centro), e.radio)
  }

  return {
    grupo,
    /** Una baldosa que llega (`{ id, pase, paquete, tramos }`): su malla, ya con las épocas y el relieve de ahora. */
    agregar({ id, pase, paquete, tramos }) {
      // el material va en un array: así three.js dibuja los grupos de la geometría (los tramos vivos) y no todo
      const malla = new Mesh(geometriaDePaquete(paquete), [material])
      malla.name = `casas ${id} · pase ${pase}`
      // las casas tiran sombra: desde el sol se dibujan con el mismo vértice (src/acabado.js)
      malla.customDepthMaterial = materialDeSombra
      malla.castShadow = true
      // las casas, siempre antes que el suelo, como cuando eran una sola malla: el piso de los patios va a la
      // altura del suelo, y cuál de los dos queda arriba depende de quién se dibuja primero. three.js ordena lo
      // opaco por la profundidad del centro de cada malla: sin esto, unas baldosas irían antes y otras después
      malla.renderOrder = ANTES_QUE_EL_SUELO
      const baldosa = { id, pase, malla, tramos, esfera: paquete.esfera, subida: false }
      malla.onAfterRender = () => { baldosa.subida = true } // se dibujó: su geometría ya está en la GPU
      aplicarEpocas(baldosa)
      apoyar(baldosa)
      baldosas.push(baldosa)
      grupo.add(malla)
      alcance = Math.max(alcance, Math.hypot(paquete.esfera.centro[0], paquete.esfera.centro[2]) + paquete.esfera.radio)
      return malla
    },
    /** La época que se mira va de `de` a `a` (iguales si no hay ola): solo se dibuja lo que vive entre las dos. */
    ponerEpocas(de, a) {
      if (de === epocas[0] && a === epocas[1]) return false
      epocas = [de, a]
      baldosas.forEach(aplicarEpocas)
      return true
    },
    /** `alturaDelTerreno(x, z)`: la altura a la que el shader sube lo que está en ese punto (null: la hoja lisa). */
    ponerRelieve(alturaDelTerreno) {
      alturaEn = alturaDelTerreno
      baldosas.forEach(apoyar)
    },
    /**
     * Sube a la GPU la geometría de una baldosa que todavía no se dibujó nunca; false si no queda ninguna.
     * Para llamar mientras no hay cuadros pedidos: reparte el costo de subir la ciudad en vez de pagarlo junto.
     */
    subirUna(renderer) {
      const baldosa = baldosas.find((b) => !b.subida)
      if (!baldosa) return false
      destinoDeSonda ??= new WebGLRenderTarget(1, 1)
      const { geometry } = baldosa.malla
      sonda.geometry = geometry
      const anterior = renderer.getRenderTarget()
      geometry.setDrawRange(0, 3) // alcanza con un triángulo: lo que se sube son los atributos enteros
      try {
        renderer.setRenderTarget(destinoDeSonda)
        renderer.render(escenaDeSonda, camaraDeSonda)
      } finally {
        geometry.setDrawRange(0, Infinity)
        renderer.setRenderTarget(anterior)
      }
      baldosa.subida = true
      return true
    },
    /** Hasta dónde llegan las casas desde la plaza, en metros (para la ola). */
    get alcance() { return alcance },
    get baldosas() { return baldosas },
    /** Cuántos vértices e índices hay en total, y cuántos índices se mandan a dibujar en la época de ahora. */
    get cuenta() {
      let vertices = 0, indices = 0, vivos = 0
      for (const { malla } of baldosas) {
        vertices += malla.geometry.attributes.position.count
        indices += malla.geometry.index.count
        if (malla.visible) for (const g of malla.geometry.groups) vivos += g.count
      }
      return { baldosas: baldosas.length, vertices, indices, vivos }
    },
  }
}
