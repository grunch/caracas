import { crearLienzo } from './lienzo.js'
import { parteDe } from './partes.js'
import { METRO } from './datos/marco.js'

/** Dibuja los hitos en un lienzo y devuelve arrays planos. */
export function construirHitos(hitos, coords) {
  if (Math.abs(coords.metro - METRO) > 1e-9) throw new Error(`hitos: definidos a ${METRO} m/px y el plano viene a ${coords.metro}`)
  const lienzo = crearLienzo()
  const rangos = []
  hitos.forEach((h, i) => {
    const desde = lienzo.vertices
    const p = lienzo.hito({ origen: coords.aMundo(h.x, h.y), eje: h.eje, nace: h.nace ?? 0, muere: h.muere ?? 0, semilla: i + 1 })
    for (const { tipo, nace, muere, ...medidas } of h.partes) {
      const dibujar = parteDe(tipo)
      if (!dibujar) throw new Error(`hito ${h.id}: parte de tipo desconocido "${tipo}"`)
      dibujar(p.con({ nace, muere }), medidas)
    }
    rangos.push({ id: h.id, desde, hasta: lienzo.vertices })
  })
  return { ...lienzo.datos(), rangos }
}
