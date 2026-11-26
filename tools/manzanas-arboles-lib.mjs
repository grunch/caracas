import {puntoEnPoligono} from '../src/hitos/suprimir.js'
/** Cambia solo el intervalo de la época indicada (1772 por defecto): los árboles de las demás épocas conservan posición, tamaño y semilla. */
export function arbolesParaManzanas(arboles,nuevos,manzanas,{epoca=1}={}){
 // El descarte por caja evita recorrer cientos de polígonos para cada árbol del valle.
 const zonas=manzanas.map(m=>{const p=m.limite??m.poligono;return{m,p,x0:Math.min(...p.map(v=>v[0])),x1:Math.max(...p.map(v=>v[0])),y0:Math.min(...p.map(v=>v[1])),y1:Math.max(...p.map(v=>v[1]))}})
 const dentro=a=>zonas.some(({m,p,x0,x1,y0,y1})=>a.x>=x0&&a.x<=x1&&a.y>=y0&&a.y<=y1&&puntoEnPoligono([a.x,a.y],p)&&!(m.huecos??[]).some(h=>puntoEnPoligono([a.x,a.y],h)))
 const salida=[]
 for(const a of arboles){
  const fin=a.muere||Infinity
  if(a.nace>epoca||fin<=epoca||!dentro(a)){salida.push(a);continue}
  if(a.nace<epoca)salida.push({...a,muere:epoca})
  if(epoca<6&&fin>epoca+1)salida.push({...a,nace:epoca+1})
 }
 const propios=manzanas.filter(m=>m.arboles).flatMap(m=>m.arboles)
 if(manzanas.every(m=>m.arboles)){salida.push(...propios);return salida}
 for(const a of nuevos)if(a.nace===epoca&&a.muere===epoca+1&&dentro(a))salida.push(a)
 return salida
}
