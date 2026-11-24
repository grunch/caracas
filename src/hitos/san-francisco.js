import { crearSanFrancisco } from './san-francisco-modelo.js'
import { MAT } from './lienzo.js'

/** Lleva el estudio de la Iglesia de San Francisco al lienzo común de hitos.
 * +Z del estudio es el norte (la fachada, en z = +31) y +X el oeste (el campanario colonial, hacia el convento).
 * En datos/iglesias.js el ancla está al pie de esa fachada y +a entra hacia el sur: p.en(31, 0, 0, −π/2) lleva
 * z = +31 → a = 0, z = −31 → a = 62 y +X → +b. Vida, tinta, relieve y sombras los aporta el lienzo.
 */
export function sanFrancisco(p, { anio }) {
  const { edificio } = crearSanFrancisco({ anio, nivelDetalle: 'ciudad', conCeiba: false })
  const q = p.en(31, 0, 0, -Math.PI / 2)
  const geometrias = new Set(), materiales = new Set()
  edificio.updateMatrixWorld(true)
  try {
    edificio.traverse((objeto) => {
      if (!objeto.isMesh) return
      geometrias.add(objeto.geometry)
      materiales.add(objeto.material)
      q.geo(objeto.geometry.clone().applyMatrix4(objeto.matrixWorld), {
        color: objeto.material.color.toArray(), // Three.js guarda el color en lineal
        mat: objeto.userData.mat === 'teja' ? MAT.TEJA : MAT.LISO,
      })
    })
  } finally {
    geometrias.forEach((g) => g.dispose())
    materiales.forEach((m) => m.dispose())
  }
}
