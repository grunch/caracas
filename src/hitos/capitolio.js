import { crearCapitolio } from './capitolio-modelo.js'
import { MAT } from './lienzo.js'

const CUPULA = 'Cúpula del Salón Elíptico'
const PALMAS = 'Chaguaramos del patio'

/** Lleva el estudio del Convento de las Concepciones / Capitolio al lienzo común de hitos.
 * Ejes del modelo: +X este, +Y arriba, +Z sur, origen al centro de la manzana nominal de 92 × 108 m: es el mismo
 * marco del hito (+a este, +b sur), así que no hay giro ni desplazamiento. `esquinas` (NO, NE, SE, SO en metros del
 * marco) lo llevan en planta a la manzana del hito, que no es un rectángulo: la plataforma nominal de 95 × 111 m va a
 * ellas por un mapeo bilineal (cada fachada sigue su calle; la altura no cambia).
 * `componente` separa lo que cambia entre 1889, 1911 y 1936 (la cúpula y los chaguaramos) del cuerpo
 * neoclásico, que se dibuja una sola vez. Vida, tinta, relieve y sombras los aporta el lienzo.
 */
const PLATAFORMA = [95, 111] // m: lo más ancho del modelo en todos sus años (src/hitos/capitolio-modelo.js; fuera solo salen la escalinata sur y, en 1772, la gradería del norte)

/** (x, z) del modelo → (a, b) en el marco: la plataforma nominal llevada a las cuatro `esquinas` (NO, NE, SE, SO). */
export function aEsquinas(esquinas, x, z) {
  const [u, v] = [x / PLATAFORMA[0] + 0.5, z / PLATAFORMA[1] + 0.5]
  const [no, ne, se, so] = esquinas
  const peso = [(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v]
  return [0, 1].map((k) => peso[0] * no[k] + peso[1] * ne[k] + peso[2] * se[k] + peso[3] * so[k])
}

/** La derivada del mapeo en (x, z): [[∂a/∂x, ∂a/∂z], [∂b/∂x, ∂b/∂z]] (la altura no cambia). */
function jacobiano(esquinas, x, z) {
  const [u, v] = [x / PLATAFORMA[0] + 0.5, z / PLATAFORMA[1] + 0.5]
  const [no, ne, se, so] = esquinas
  const du = [0, 1].map((k) => ((1 - v) * (ne[k] - no[k]) + v * (se[k] - so[k])) / PLATAFORMA[0])
  const dv = [0, 1].map((k) => ((1 - u) * (so[k] - no[k]) + u * (se[k] - ne[k])) / PLATAFORMA[1])
  return [[du[0], dv[0]], [du[1], dv[1]]]
}

/** Lleva la geometría a las esquinas: las posiciones por el mapeo y los normales por la inversa transpuesta de su
 * derivada (revisión de #166: el estiramiento cambia las pendientes de techos y cúpulas). */
export function llevarAEsquinas(geometria, esquinas) {
  const pos = geometria.getAttribute('position'), nor = geometria.getAttribute('normal')
  for (let i = 0; i < pos.count; i++) {
    const [x, z] = [pos.getX(i), pos.getZ(i)]
    if (nor) {
      // n' ∝ (J⁻¹)ᵀ n en el plano x–z, con y igual: basta la adjunta transpuesta (el determinante se va al normalizar)
      const [[j00, j01], [j10, j11]] = jacobiano(esquinas, x, z)
      const det = j00 * j11 - j01 * j10
      const [nx, ny, nz] = [nor.getX(i), nor.getY(i), nor.getZ(i)]
      const [mx, mz] = [(j11 * nx - j10 * nz) / det, (-j01 * nx + j00 * nz) / det]
      const largo = Math.hypot(mx, ny, mz) || 1
      nor.setXYZ(i, mx / largo, ny / largo, mz / largo)
    }
    const [a, b] = aEsquinas(esquinas, x, z)
    pos.setX(i, a)
    pos.setZ(i, b)
  }
  pos.needsUpdate = true
  if (nor) nor.needsUpdate = true
  return geometria
}

const NOMINALES = [[-47.5, -55.5], [47.5, -55.5], [47.5, 55.5], [-47.5, 55.5]]

export function capitolio(p, { anio, componente = 'todo', esquinas = NOMINALES }) {
  const { edificio } = crearCapitolio({ anio, nivelDetalle: 'ciudad' })
  const cupula = edificio.getObjectByName(CUPULA), palmas = edificio.getObjectByName(PALMAS)
  // Sin estos grupos, el cuerpo se tragaría la cúpula y las palmas y quedarían duplicadas entre épocas.
  if (componente !== 'todo' && (!cupula || !palmas)) throw new Error(`capitolio: el modelo no tiene el grupo «${cupula ? PALMAS : CUPULA}»`)
  const geometrias = new Set(), materiales = new Set()
  const pertenece = (objeto, grupo) => {
    for (let padre = objeto; grupo && padre; padre = padre.parent) if (padre === grupo) return true
    return false
  }
  const entra = (objeto) => {
    if (componente === 'todo') return true
    const esCupula = pertenece(objeto, cupula), esPalma = pertenece(objeto, palmas)
    if (componente === 'cupula') return esCupula
    if (componente === 'palmas') return esPalma
    if (componente === 'cuerpo') return !esCupula && !esPalma
    throw new RangeError(`componente desconocido del Capitolio: ${componente}`)
  }
  edificio.updateMatrixWorld(true)
  try {
    edificio.traverse(objeto => {
      if (!objeto.isMesh) return
      geometrias.add(objeto.geometry)
      materiales.add(objeto.material)
      if (!entra(objeto)) return
      p.geo(llevarAEsquinas(objeto.geometry.clone().applyMatrix4(objeto.matrixWorld), esquinas), {
        color: objeto.material.color.toArray(), // Three.js guarda el color en lineal
        mat: MAT.LISO,
      })
    })
  } finally {
    geometrias.forEach(g => g.dispose())
    materiales.forEach(m => m.dispose())
  }
}
