// Datos de prueba del registro vial (tools/red-vial-lib.mjs): un registro mínimo válido y las fuentes de los planos.

const plano = (anio, documento = anio) => ({
  tipo: 'historica', anios: [anio], url: `https://ejemplo.org/plano-${anio}`,
  fecha_documento: documento === null ? null : { desde: Math.min(anio, documento), hasta: documento },
  fecha_representada: { desde: anio, hasta: anio },
})

/** Las fuentes que arma la CLI desde las fichas, con las mismas claves. El plano de 1946 se catalogó en 1950. */
export const fuentesDePrueba = () => ({
  plano1772: plano(1772), plano1843: plano(1843, null), plano1889: plano(1889), plano1911: plano(1911),
  plano1936: plano(1936), plano1946: plano(1946, 1950),
})

/** Una etapa con su ficha de evidencias completa; `cambios` pisa lo que haga falta. */
export const etapa = (cambios = {}) => ({
  anio: 1772, estado: 'existente', certeza: 'documentada', documento: 'p', fuentes: ['p'],
  fecha_hecho: { tipo: 'levantamiento', desde: 1772, hasta: 1772 }, nombre: null, contradicciones: [],
  puntos: [[1, 2], [3, 4]], ancho_m: null, error_m: 3, ...cambios,
})

/** Un tramo con una etapa de 1772, acreditada por un documento que sirve para 1772 y 1936. */
export const registro = () => ({
  version: 2, sistema: 'mosaico-1936-px',
  fuentes: { p: { tipo: 'historica', anios: [1772, 1936], url: 'https://ejemplo.org/plano', fecha_documento: { desde: 1772, hasta: 1772 } } },
  tramos: [{ id: 'calle', etapas: [etapa()] }],
})
