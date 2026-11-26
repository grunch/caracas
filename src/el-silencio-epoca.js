/** Séptima vista: fotos aéreas1946; la historia binaria conserva seis bytes. */
export const EPOCA_SILENCIO = 6
export function conElSilencio(epocas) {
  if(epocas.length!==6 || epocas[5].año!==1936)return epocas
  return [...epocas,{año:1946,base:1936,plano:'1950-archiveorg-plano-de-caracas-dcn',
    titulo:'Plano de Caracas · levantamiento aéreo de 1946',
    autor:'Departamento de Cartografía Nacional, Ministerio de Obras Públicas',
    corto:'plano DCN basado en fotografías aéreas de 1946',
    obras:'El Silencio ya está inaugurado. Se conserva el tejido anterior y se añaden manzanas del plano de 1946; casas nuevas y alturas interpretativas. La Ciudad Universitaria figura en construcción.',
    fuente:'University of Alberta Libraries · https://archive.org/details/WCWdb_18051',
    licencia:'Sin licencia declarada; fecha de catálogo [1950?], fotografías de 1946. Derechos pendientes de aclaración.',
  }]
}

/** La entrada cuyo plano abre el visor: la de la hoja base en una vista parcial (título y créditos de esa hoja). */
export function planoBaseDe(epocas, epoca) {
  if (!epoca?.parcial) return epoca
  return epocas.find((e) => e.año === epoca.base && !e.parcial) ?? { ...epoca, año: epoca.base }
}
