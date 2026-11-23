import { crearPalacioArzobispal, ENVOLVENTE, CUBIERTAS } from './palacio-arzobispal-modelo.js'
import { MAT } from './lienzo.js'

const COMPONENTES = ['todo', 'comun', 'epoca']

/** Las mallas del modelo que entran en un componente: 'epoca' (fachadas, muros con su color y cubiertas, que
 * cambian entre la envolvente colonial y la de 1876–1877), 'comun' (los patios, iguales en todas las fechas) o
 * 'todo'. Sin los grupos con nombre, lo común se tragaría la envolvente y quedaría duplicada entre épocas. */
export function piezasDelArzobispal(edificio, componente = 'todo') {
  if (!COMPONENTES.includes(componente)) throw new RangeError(`componente desconocido del Palacio Arzobispal: ${componente}`)
  const grupos = [ENVOLVENTE, CUBIERTAS].map(nombre => {
    const grupo = edificio.getObjectByName(nombre)
    if (!grupo) throw new Error(`palacio arzobispal: el modelo no tiene el grupo «${nombre}»`)
    return grupo
  })
  const deEpoca = (objeto) => {
    for (let padre = objeto; padre; padre = padre.parent) if (grupos.includes(padre)) return true
    return false
  }
  const piezas = []
  edificio.traverse(objeto => {
    if (!objeto.isMesh) return
    if (componente === 'todo' || (componente === 'epoca') === deEpoca(objeto)) piezas.push(objeto)
  })
  return piezas
}

/** Lleva el estudio del Palacio Arzobispal al lienzo común de hitos.
 * Frente +Z del estudio → −a (oeste, la plaza); +X (la fachada lateral) → +b (sur, la calle de Gradillas a
 * San Jacinto). El origen es el centro del palacio. Vida, tinta, relieve y sombras los aporta el lienzo.
 */
export function palacioArzobispal(p, { anio, componente = 'todo' }) {
  const { edificio } = crearPalacioArzobispal({ anio, nivelDetalle: 'ciudad' })
  const q = p.en(0, 0, 0, -Math.PI / 2)
  const geometrias = new Set(), materiales = new Set()
  edificio.traverse(o => { if (o.isMesh) { geometrias.add(o.geometry); materiales.add(o.material) } })
  edificio.updateMatrixWorld(true)
  try {
    for (const objeto of piezasDelArzobispal(edificio, componente)) {
      q.geo(objeto.geometry.clone().applyMatrix4(objeto.matrixWorld), {
        color: objeto.material.color.toArray(), // Three.js guarda el color en lineal
        mat: objeto.userData.mat === 'teja' ? MAT.TEJA : MAT.LISO,
      })
    }
  } finally {
    geometrias.forEach(g => g.dispose())
    materiales.forEach(m => m.dispose())
  }
}
