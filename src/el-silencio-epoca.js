/** Extensión de presentación: los datos binarios conservan sus seis épocas originales. */
export const EPOCA_SILENCIO = 6
export function conElSilencio(epocas) {
  if(epocas.length!==6 || epocas[5].año!==1936)return epocas
  return [...epocas,{año:1945,base:1936,parcial:true,
    titulo:'El Silencio en 1945 · reconstrucción parcial',
    corto:'plano base de 1936 con El Silencio inaugurado en 1945',
    obras:'Reconstrucción parcial: sólo se actualiza El Silencio; el resto de Caracas conserva la base de 1936.',
    fuente:'https://entrerayas.com/a-66-anos-de-la-inauguracion-de-la-reurbanizacion-el-silencio/',
  }]
}

/** La entrada cuyo plano abre el visor: la de la hoja base en una vista parcial (título y créditos de esa hoja). */
export function planoBaseDe(epocas, epoca) {
  if (!epoca?.parcial) return epoca
  return epocas.find((e) => e.año === epoca.base && !e.parcial) ?? { ...epoca, año: epoca.base }
}
