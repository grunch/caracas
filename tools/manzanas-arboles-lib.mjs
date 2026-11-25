import {puntoEnPoligono} from '../src/hitos/suprimir.js'
/** Cambia solo el intervalo de la época indicada (1772 por defecto): los árboles de las demás épocas conservan posición, tamaño y semilla. */
export function arbolesParaManzanas(arboles,nuevos,manzanas,{epoca=1}={}){
 const dentro=a=>manzanas.some(m=>puntoEnPoligono([a.x,a.y],m.limite??m.poligono)&&!(m.huecos??[]).some(h=>puntoEnPoligono([a.x,a.y],h)))
 const salida=[]
 for(const a of arboles){
  const fin=a.muere||Infinity
  if(a.nace>epoca||fin<=epoca||!dentro(a)){salida.push(a);continue}
  if(a.nace<epoca)salida.push({...a,muere:epoca})
  if(fin>epoca+1)salida.push({...a,nace:epoca+1})
 }
 const propios=manzanas.filter(m=>m.arboles).flatMap(m=>m.arboles)
 if(manzanas.every(m=>m.arboles)){salida.push(...propios);return salida}
 for(const a of nuevos)if(a.nace===epoca&&a.muere===epoca+1&&dentro(a))salida.push(a)
 return salida
}
