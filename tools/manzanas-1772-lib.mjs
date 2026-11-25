/** Adaptador del planificador aprobado en miraflores al formato nativo de casas de Caracas. */
import {planificarManzana,azarDeSemilla} from '../src/manzanas/plan.js'
import {puntoEnPerimetro} from '../src/manzanas/perimetro.js'
import {areaConSigno,recortarConvexo} from '../src/poligono.js'
import {seSolapan} from '../src/hitos/suprimir.js'
import {codificarPaleta} from '../src/manzanas/paleta.js'
import {ALA,CALLE} from '../src/alas.js'

export const RETIRO_EJES_M=3 // mismo retiro inferido de tools/geo/vectorizar.py; no es una medida histórica
export const RADIO_ENTORNO_PLAZA_M=200
export function cantidadPorDistancia(distancia,id){
 const rnd=azarDeSemilla(`densidad-1772-${id}`)
 const base=Math.max(8,Math.round(32-24*Math.min(1,Math.max(0,distancia)/1400)+(rnd()-.5)*4))
 // Ajuste visual solicitado: primera corona de manzanas, redondeando a casas enteras.
 return distancia<=RADIO_ENTORNO_PLAZA_M?Math.round(Math.round(base*.7)*.7):base
}
const centro=p=>[0,1].map(k=>p.reduce((s,v)=>s+v[k],0)/p.length)
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const cruz=(a,b)=>a[0]*b[1]-a[1]*b[0]
export function retraerCuadra(p,d){
 if(areaConSigno(p)<0)p=[...p].reverse()
 const lineas=p.map((a,i)=>{const b=p[(i+1)%p.length],v=[b[0]-a[0],b[1]-a[1]],l=Math.hypot(...v);return {a:[a[0]-v[1]/l*d,a[1]+v[0]/l*d],v}})
 return lineas.map((b,i)=>{const a=lineas[(i+lineas.length-1)%lineas.length],den=cruz(a.v,b.v);if(Math.abs(den)<1e-8)throw new Error('esquina degenerada');const t=cruz([b.a[0]-a.a[0],b.a[1]-a.a[1]],b.v)/den;return [a.a[0]+t*a.v[0],a.a[1]+t*a.v[1]]})
}
export function seleccionarManzanas1772({red,unidades,plaza,metro,hitos=[]}){
 const nodos=new Map(red.nodos.map(n=>[n.id,n.mosaico])),manzanas=[],omitidas=[]
 const reservas=hitos.filter(h=>(h.nace??0)<=1&&(!(h.muere??0)||h.muere>1)).flatMap(h=>h.suprime?.length?h.suprime:h.planta??[])
 for(const u of unidades){
  if(u.estado!=='aprobada'||u.ocupacion!=='continua'){omitidas.push({id:u.id,motivo:`${u.estado}/${u.ocupacion}`});continue}
  try{
   const ejes=u.nodos?.map(n=>nodos.get(n));if(ejes?.length!==4||ejes.some(p=>!p))throw new Error('sin cuatro esquinas identificadas')
   const poligono=retraerCuadra(ejes,RETIRO_EJES_M/metro)
   const giros=poligono.map((a,i)=>{const b=poligono[(i+1)%4],c=poligono[(i+2)%4];return cruz([b[0]-a[0],b[1]-a[1]],[c[0]-b[0],c[1]-b[1]])})
   if(giros.some(v=>v<=0))throw new Error('contorno no convexo')
   const lados=poligono.map((p,i)=>dist(p,poligono[(i+1)%4])*metro)
   if(lados.some(l=>l<60||l>200))throw new Error('lados fuera del intervalo 60–200 m del generador')
   if(reservas.some(p=>seSolapan(p,poligono)))throw new Error('conjunto histórico: conserva su implantación')
   const c=centro(poligono),distancia=dist(c,plaza)*metro
   manzanas.push({id:u.id,poligono,distancia,cantidadCasas:cantidadPorDistancia(distancia,u.id),semilla:`1772-${u.id}`})
  }catch(e){omitidas.push({id:u.id,motivo:e.message})}
 }
 return {manzanas,omitidas}
}

/** Las casas de una cuadra en formato JSON de empacar-ciudad, aún sin índices globales. */
export function casasDeManzana(m,{metro}){
 const p=m.poligono,largos=p.map((v,i)=>dist(v,p[(i+1)%4])*metro)
 const ancho=(largos[0]+largos[2])/2,fondo=(largos[1]+largos[3])/2
 const plan=planificarManzana({cantidadCasas:m.cantidadCasas,semilla:m.semilla??m.id,ancho,fondo})
 const mundo=(x,z)=>puntoEnPerimetro(x,z,ancho,fondo,p)
 const borde=(a,b)=>p.some((v,i)=>{const w=p[(i+1)%4],l=dist(v,w);return [a,b].every(q=>Math.abs(cruz([w[0]-v[0],w[1]-v[1]],[q[0]-v[0],q[1]-v[1]]))/l<1e-5)})
 return plan.casas.map((c,i)=>{
  const co=Math.cos(c.giro),si=Math.sin(c.giro),local=(x,z)=>mundo(c.x+co*x+si*z,c.z-si*x+co*z)
  const huella=[local(-c.frente/2,0),local(c.frente/2,0),local(c.frente/2,c.profundidad),local(-c.frente/2,c.profundidad)]
  const o=huella[0],w=dist(o,huella[1]),eu=[(huella[1][0]-o[0])/w,(huella[1][1]-o[1])/w],ev=[-eu[1],eu[0]]
  const proy=q=>(q[0]-o[0])*ev[0]+(q[1]-o[1])*ev[1],d=(proy(huella[2])+proy(huella[3]))/2
  const sx=w/c.frente,sz=d/c.profundidad,izq=borde(huella[0],huella[3]),der=borde(huella[1],huella[2]),fondoCalle=borde(huella[2],huella[3])
  const calles=(izq?CALLE.IZQ:0)|(der?CALLE.DER:0)|(fondoCalle?CALLE.FONDO:0)
  const alas=[],agregar=(tipo,x0,z0,x1,z1)=>{if(x1-x0>1e-6&&z1-z0>1e-6)alas.push([tipo,(x0+c.frente/2)*sx,z0*sz,(x1+c.frente/2)*sx,z1*sz])}
  // Las esquinas del alzado nativo unen sus dos alas a inglete y de igual ancho.
  const principal=(izq||der)?Math.min(c.crujia,c.rects[0].d):c.rects[0].d,ala=c.crujia,hasta=c.rects[1].z+c.rects[1].d/2
  agregar(ALA.FRENTE,-c.frente/2,0,c.frente/2,principal)
  agregar(izq?ALA.ESQUINA_IZQ:ALA.LATERAL_IZQ,-c.frente/2,principal,-c.frente/2+ala,hasta)
  if(c.tipo!=='L')agregar(der?ALA.ESQUINA_DER:ALA.LATERAL_DER,c.frente/2-ala,principal,c.frente/2,hasta)
  if(c.tipo==='O')agregar(ALA.FONDO,-c.frente/2+ala,hasta-ala,c.frente/2-ala,hasta)
  agregar(ALA.PATIO,-c.frente/2+ala,principal,c.frente/2-(c.tipo==='L'?0:ala),hasta-(c.tipo==='O'?ala:0))
  agregar(ALA.SOLAR,-c.frente/2,hasta,c.frente/2,c.profundidad)
  const semilla=Math.floor(azarDeSemilla(`${m.id}-${i}`)()*65536),pisos=calles&&m.distancia<300&&c.altura>6?2:1
  return {paleta:codificarPaleta(c.muro,c.teja),huella,marco:[...o,...eu,w,d,calles,principal*sz],alas,pisos,semilla}
 })
}

/** Sustituye el intervalo [1772,1843), preservando las otras cinco épocas y los índices originales. */
export function integrarManzanas1772(datos,manzanas,{metro=.5}={}){
 const ciudad={...datos,paletas:[...(datos.paletas??datos.techos.map(()=>0))],vertices:[...datos.vertices],techos:datos.techos.map(t=>[...t]),vida:datos.vida.map(v=>[...v]),historia:datos.historia.map(h=>[...h]),vuelos:[...(datos.vuelos??datos.techos.map(()=>255))],marcos:(datos.marcos??[]).map(m=>[...m]),alas:(datos.alas??[]).map(a=>[...a])}
 const informe={manzanas:[],casasSustituidas:0,casasNuevas:0},marcos=new Map(ciudad.marcos.map(m=>[m[0],m]))
 // Se sustituyen solares mayoritariamente dentro de la cuadra. Si pisa uno mayoritariamente externo, se omite la cuadra para no cortar viviendas vecinas.
 const huellas=datos.techos.map(([inicio,n])=>Array.from({length:n},(_,i)=>datos.vertices.slice((inicio+i)*2,(inicio+i)*2+2)))
 const vivo=v=>v[0]<=1&&(!v[1]||v[1]>1)
 for(const m of manzanas){
  const afectados=[];let cruza=false
  huellas.forEach((h,i)=>{if(!vivo(datos.vida[i]))return;const area=Math.abs(areaConSigno(h)),comun=Math.abs(areaConSigno(recortarConvexo(h,m.poligono)));if(comun<.01)return;if(comun/area<.5){cruza=true;return}afectados.push(i)})
  if(cruza){informe.manzanas.push({id:m.id,estado:'omitida',motivo:'solar previo cruza el lindero'});continue}
  const nuevas=casasDeManzana(m,{metro})
  for(const i of afectados){const [nace,muere]=datos.vida[i];
   if(nace<1){ciudad.vida[i]=[nace,1];if(!muere||muere>2){const n=ciudad.techos.length;ciudad.techos.push([...datos.techos[i]]);ciudad.paletas.push(datos.paletas?.[i]??0);ciudad.vida.push([2,muere]);ciudad.historia.push([...datos.historia[i]]);ciudad.vuelos.push(datos.vuelos?.[i]??255);if(marcos.has(i))ciudad.marcos.push([n,...marcos.get(i).slice(1)])}}
   else ciudad.vida[i]=!muere||muere>2?[2,muere]:null
  }
  for(const c of nuevas){const n=ciudad.techos.length,inicio=ciudad.vertices.length/2;ciudad.vertices.push(...c.huella.flat());ciudad.techos.push([inicio,4,c.pisos,0,c.semilla]);ciudad.paletas.push(c.paleta);ciudad.vida.push([1,2]);ciudad.historia.push(Array(6).fill(16*c.pisos));ciudad.vuelos.push(0);ciudad.marcos.push([n,...c.marco,ciudad.alas.length,c.alas.length]);ciudad.alas.push(...c.alas)}
  informe.casasSustituidas+=afectados.length;informe.casasNuevas+=nuevas.length
  informe.manzanas.push({...m,estado:'integrada',anteriores:afectados.length,nuevas:nuevas.length})
 }
 const conservar=ciudad.vida.map((v,i)=>v?i:-1).filter(i=>i>=0),indice=new Map(conservar.map((viejo,nuevo)=>[viejo,nuevo]))
 for(const campo of ['techos','vida','historia','vuelos','paletas'])ciudad[campo]=conservar.map(i=>ciudad[campo][i])
 ciudad.marcos=ciudad.marcos.filter(m=>indice.has(m[0])).map(m=>[indice.get(m[0]),...m.slice(1)])
 return {ciudad,informe}
}
