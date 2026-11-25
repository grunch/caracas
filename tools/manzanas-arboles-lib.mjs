import {puntoEnPoligono} from '../src/hitos/suprimir.js'
/** Cambia solo la vida de 1772: los árboles de las demás épocas conservan posición, tamaño y semilla. */
export function arbolesParaManzanas(arboles,nuevos,manzanas){
 const dentro=a=>manzanas.some(m=>puntoEnPoligono([a.x,a.y],m.limite??m.poligono)&&!(m.huecos??[]).some(h=>puntoEnPoligono([a.x,a.y],h)))
 const salida=[]
 for(const a of arboles){
  const fin=a.muere||Infinity
  if(a.nace>1||fin<=1||!dentro(a)){salida.push(a);continue}
  if(a.nace<1)salida.push({...a,muere:1})
  if(fin>2)salida.push({...a,nace:2})
 }
 const propios=manzanas.filter(m=>m.arboles).flatMap(m=>m.arboles)
 if(manzanas.every(m=>m.arboles)){salida.push(...propios);return salida}
 for(const a of nuevos)if(a.nace===1&&a.muere===2&&dentro(a))salida.push(a)
 return salida
}
