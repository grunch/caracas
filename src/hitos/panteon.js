import { crearPanteon } from './panteon-modelo.js'
import { MAT } from './lienzo.js'

/** Lleva el estudio independiente al lienzo: +Z del modelo mira al sur, +a entra en la nave.
 * Su fachada está en z=27 y el hito ancla el pie de esa fachada en el plano de 1936.
 * Las vidas las recibe del pintor de cada parte, no del año civil del generador.
 */
export function panteon(p, { anio }) {
  const { edificio } = crearPanteon({ anio })
  const geometrias = new Set(), materiales = new Set()
  const q = p.en(27, 0, 0, -Math.PI / 2)
  edificio.updateMatrixWorld(true)
  try {
    edificio.traverse(objeto => {
      if (!objeto.isMesh) return
      geometrias.add(objeto.geometry)
      materiales.add(objeto.material)
      q.geo(objeto.geometry.clone().applyMatrix4(objeto.matrixWorld), {
        color: objeto.material.color.toArray(),
        mat: MAT.LISO,
      })
    })
  } finally {
    geometrias.forEach(g => g.dispose())
    materiales.forEach(m => m.dispose())
  }
}
