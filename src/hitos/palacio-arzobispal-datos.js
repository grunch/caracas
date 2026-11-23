/** Cronología del Palacio Arzobispal (estudio de miraflores, docs/palacio-arzobispal.md), solo hasta 1936:
 * la vista restaurada de 1979–1980 del estudio no entra en los mapas. */
export const ANIOS_ARZOBISPAL = Object.freeze([1772, 1843, 1889, 1911, 1936])

export function etapaArzobispal(anio) {
  if (!ANIOS_ARZOBISPAL.includes(anio)) throw new RangeError(`Año no disponible para el Palacio Arzobispal: ${anio}`)
  const colonial = anio < 1876
  return Object.freeze({
    anio, colonial,
    id: colonial ? 'colonial' : 'guzmancista',
    // la diócesis pasa a arquidiócesis en 1803: antes, Palacio Episcopal
    nombre: anio < 1803 ? 'Palacio Episcopal' : 'Palacio Arzobispal',
  })
}
