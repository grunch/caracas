/** Red curada por cortes cartográficos. No extrapola una geometría entre fechas ni usa OSM como prueba. */
export const ANIOS_RED = Object.freeze([1772,1843,1889,1911,1936,1946])
const finito = n => typeof n === 'number' && Number.isFinite(n)
const punto = p => Array.isArray(p) && p.length === 2 && p.every(finito)
const exigir = (ok, mensaje) => { if (!ok) throw new Error(mensaje) }
export function validarRedVial(red) {
  exigir(red?.version === 1 && red.sistema === 'mosaico-1936-px', 'versión o sistema de coordenadas no admitido')
  exigir(red.fuentes && typeof red.fuentes === 'object' && !Array.isArray(red.fuentes), 'faltan fuentes')
  exigir(Array.isArray(red.tramos), 'faltan tramos')
  const fuentes = red.fuentes, ids = new Set()
  for (const [id,f] of Object.entries(fuentes)) {
    exigir(['historica','actual'].includes(f.tipo) && Array.isArray(f.anios) && f.anios.every(a=>ANIOS_RED.includes(a)), `fuente ${id}: tipo/años inválidos`)
    exigir(typeof f.url === 'string' && /^https:\/\//.test(f.url) && URL.canParse(f.url), `fuente ${id}: URL inválida`)
  }
  for (const t of red.tramos) {
    exigir(typeof t.id === 'string' && t.id.length > 0 && !ids.has(t.id), 'id de tramo repetido o ausente'); ids.add(t.id)
    exigir(Array.isArray(t.etapas), `${t.id}: faltan etapas`)
    if (t.desde !== undefined) {
      exigir(Number.isInteger(t.desde) && t.desde >= 1500 && t.desde <= 2200, `${t.id}: apertura inválida`)
      exigir(Array.isArray(t.fuentesCronologia) && t.fuentesCronologia.length && t.fuentesCronologia.every(id=>fuentes[id]?.tipo==='historica'), `${t.id}: apertura sin fuente histórica`)
    }
    const anios = new Set()
    for (const e of t.etapas) {
      exigir(ANIOS_RED.includes(e.anio) && !anios.has(e.anio), `${t.id}: año no admitido o etapa repetida`); anios.add(e.anio)
      exigir(['existente','obra','proyecto','ausente','desconocido'].includes(e.estado), `${t.id}: estado inválido`)
      exigir(Array.isArray(e.fuentes) && e.fuentes.length && e.fuentes.every(id=>fuentes[id]), `${t.id}: fuente ausente`)
      exigir(e.fuentes.some(id=>fuentes[id].tipo==='historica' && fuentes[id].anios.includes(e.anio)), `${t.id}: sin evidencia histórica para ${e.anio}`)
      if (e.estado === 'existente') exigir(t.desde === undefined || e.anio >= t.desde, `${t.id}: existente antes de su apertura`)
      if (e.estado === 'existente' || e.puntos !== undefined) {
        exigir(Array.isArray(e.puntos) && e.puntos.length >= 2 && e.puntos.every(punto), `${t.id}: coordenadas inválidas`)
        exigir(e.puntos.some(p=>p[0]!==e.puntos[0][0] || p[1]!==e.puntos[0][1]), `${t.id}: tramo de longitud cero`)
      }
      exigir(e.ancho_m === null || finito(e.ancho_m) && e.ancho_m > 0, `${t.id}: ancho debe ser positivo o null`)
      exigir(e.error_m === null || finito(e.error_m) && e.error_m >= 0, `${t.id}: error debe ser positivo, cero o null`)
      if (e.medible !== undefined) exigir(typeof e.medible === 'boolean', `${t.id}: medible inválido`)
    }
  }
  return red
}
export function redDeEpoca(registro, anio) {
  exigir(ANIOS_RED.includes(anio), 'época de red no admitida')
  const red=validarRedVial(registro), tramos=[], pendientes=[], ausentes=[], proyectos=[], obras=[]
  for (const t of red.tramos) {
    const e=t.etapas.find(e=>e.anio===anio)
    if (!e) { (t.desde !== undefined && anio<t.desde ? ausentes : pendientes).push(t.id); continue }
    if (e.estado==='ausente') { ausentes.push(t.id); continue }
    if (e.estado==='proyecto') { proyectos.push(t.id); continue }
    if (e.estado==='obra') { obras.push(t.id); continue }
    if (e.estado==='desconocido' || e.medible===false) { pendientes.push(t.id); continue }
    tramos.push({tramo:t.id,nombre:e.nombre??t.nombre??null,puntos:e.puntos.map(p=>[...p]),medible:true,ancho_m:e.ancho_m,banda_m:e.error_m,fuentes:[...e.fuentes],procedencia:structuredClone(t.procedencia??null)})
  }
  return {version:1,sistema:red.sistema,año:anio,alcance:'Red parcial de evidencia explícita; los pendientes NO son calles ausentes.',fuentes:structuredClone(red.fuentes),tramos,pendientes,ausentes,proyectos,obras}
}
/** Importación sin pérdida de puntos ni tolerancias. El calce en píxeles 1936 NO fecha la calle en 1936. */
export function importarReferencias(ref1772, recuperadas) {
  exigir(Array.isArray(ref1772?.tramos) && Array.isArray(recuperadas?.tramos), 'referencias sin tramos')
  const red={version:1,sistema:'mosaico-1936-px',fuentes:{
    plano1772:{tipo:'historica',anios:[1772],url:'https://pares.cultura.gob.es/ParesBusquedas20/catalogo/description/26112'},
    plano1936:{tipo:'historica',anios:[1936],url:'https://archive.org/details/WCWdb_18053'},
  },tramos:[]}
  for(const t of ref1772.tramos){
    exigir(typeof t.medible==='boolean',`${t.tramo}: medible ausente`)
    red.tramos.push({id:t.tramo,procedencia:{archivo:'tools/geo/referencias/1772-calles-1936.json',sector:t.sector??null,identificado:structuredClone(t.identificado??[])},etapas:[{anio:1772,estado:'existente',puntos:structuredClone(t.puntos),ancho_m:null,error_m:t.banda_m??null,medible:t.medible,fuentes:['plano1772']}]})
  }
  for(const t of recuperadas.tramos)red.tramos.push({id:`recuperado:${t.id}`,nota:t.nota,procedencia:{archivo:'tools/geo/calles-historicas.json',original:structuredClone(t.original??null),nota:t.nota??null},etapas:[1772,1936].map(anio=>({anio,estado:'existente',puntos:structuredClone(t.anclajes),ancho_m:null,error_m:null,fuentes:[`plano${anio}`]}))})
  return validarRedVial(red)
}
