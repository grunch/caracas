/**
 * Los hitos (src/hitos.js) como lugares del buscador: se encuentran por su nombre o un alias y sirven de
 * referencia en la prosa ("la cuadra al norte de la Catedral"), para lo que hace falta el nombre con artículo.
 * Un hito sin entrada acá igual entra, con su nombre tal cual.
 */
const APODOS = Object.freeze({
  'plaza-bolivar': { corto: 'la Plaza Bolívar', alias: ['Plaza Mayor'] },
  catedral: { corto: 'la Catedral', alias: ['Catedral'] },
  'san-francisco': { corto: 'la iglesia de San Francisco', alias: ['Iglesia San Francisco'] },
  altagracia: { corto: 'la iglesia de Altagracia', alias: ['Iglesia Altagracia'] },
  'santa-capilla': { corto: 'la Santa Capilla', alias: ['Iglesia Santa Capilla'] },
  'san-mauricio': { corto: 'la iglesia de San Mauricio', alias: ['San Mauricio'] },
  'santa-teresa': { corto: 'la basílica de Santa Teresa', alias: ['Iglesia Santa Teresa', 'Basílica Santa Teresa'] },
  'la-pastora': { corto: 'la iglesia de La Pastora', alias: ['Iglesia La Pastora'] },
  panteon: { corto: 'el Panteón Nacional', alias: [] },
  'casa-amarilla': { corto: 'la Casa Amarilla', alias: [] },
  capitolio: { corto: 'el Capitolio', alias: ['Capitolio', 'Palacio Federal', 'Palacio Legislativo'] },
  'palacio-arzobispal': { corto: 'el Palacio Arzobispal', alias: ['Palacio Episcopal', 'Arzobispado'] },
  universidad: { corto: 'la Universidad', alias: ['Universidad', 'Universidad Central'] },
  miraflores: { corto: 'el Palacio de Miraflores', alias: ['Palacio de Miraflores'] },
})

/** hitos ({ id, nombre, x, y, nace, muere }) → lugares para `indexarEsquinas`. */
export function lugaresDe(hitos) {
  return hitos.filter((h) => h?.id && h.nombre && Number.isFinite(h.x) && Number.isFinite(h.y)).map((h) => Object.freeze({
    id: h.id, nombre: h.nombre, corto: APODOS[h.id]?.corto ?? h.nombre, alias: APODOS[h.id]?.alias ?? [],
    px: Object.freeze([h.x, h.y]), nace: h.nace ?? 0, muere: h.muere ?? 0,
  }))
}
