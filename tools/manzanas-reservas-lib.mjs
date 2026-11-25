import {areaConSigno,recortarConvexo} from '../src/poligono.js'
import {ALA,CALLE} from '../src/alas.js'
const mezcla=(p,u,v)=>[0,1].map(k=>(1-u)*(1-v)*p[0][k]+u*(1-v)*p[1][k]+u*v*p[2][k]+(1-u)*v*p[3][k])
const largo=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
// Inversa bilineal: conserva el contorno oblicuo, no lo sustituye por una caja del mapa.
function local(p,q){
 let u=.5,v=.5
 for(let i=0;i<12;i++){
  const a=mezcla(p,u,v),du=[0,1].map(k=>(1-v)*(p[1][k]-p[0][k])+v*(p[2][k]-p[3][k])),dv=[0,1].map(k=>(1-u)*(p[3][k]-p[0][k])+u*(p[2][k]-p[1][k]))
  const x=a[0]-q[0],y=a[1]-q[1],det=du[0]*dv[1]-du[1]*dv[0]
  if(Math.abs(det)<1e-10)throw new Error('Solar degenerado al reservar edificio')
  u-=(x*dv[1]-y*dv[0])/det;v-=(du[0]*y-du[1]*x)/det
 }
 return[u,v]
}
/** Reserva las plantas reales y patios del hito. Retiene el mayor solar con frente a la misma calle.
 * Al cortar una parcela se redimensionan sus alas completas; no quedan tejados seccionados a mitad.
 * El espacio detrás del edificio permanece solar. No se mueve, escala ni duplica el hito.
 */
export function ajustarSolarAReservas(c,reservas,{metro}){
 const p=c.huella,forma=r=>[mezcla(p,r[0],0),mezcla(p,r[1],0),mezcla(p,r[1],r[2]),mezcla(p,r[0],r[2])]
 let candidatos=[[0,1,1]]
 for(const {poligono} of reservas){
  const siguientes=[]
  for(const r of candidatos){
   const comun=recortarConvexo(poligono,forma(r))
   if(Math.abs(areaConSigno(comun))<1e-5){siguientes.push(r);continue}
   const uv=comun.flatMap((a,i)=>Array.from({length:9},(_,j)=>local(p,[0,1].map(k=>a[k]+(comun[(i+1)%comun.length][k]-a[k])*j/8))))
   const u0=Math.max(r[0],Math.min(...uv.map(p=>p[0]))),u1=Math.min(r[1],Math.max(...uv.map(p=>p[0]))),v0=Math.max(0,Math.min(...uv.map(p=>p[1])))
   siguientes.push([r[0],u0,r[2]],[u1,r[1],r[2]],[r[0],r[1],v0])
  }
  candidatos=siguientes.filter(r=>(r[1]-r[0])*c.marco[4]*metro>=4&&r[2]*c.marco[5]*metro>=8)
 }
 candidatos=candidatos.filter(r=>reservas.every(({poligono})=>Math.abs(areaConSigno(recortarConvexo(poligono,forma(r))))<.01))
 candidatos.sort((a,b)=>(b[1]-b[0])*b[2]-(a[1]-a[0])*a[2])
 const r=candidatos[0];if(!r)return null
 if(r[0]===0&&r[1]===1&&r[2]===1)return c
 const huella=forma(r),o=huella[0],w=largo(o,huella[1]),eu=[(huella[1][0]-o[0])/w,(huella[1][1]-o[1])/w]
 const proy=q=>(q[1]-o[1])*eu[0]-(q[0]-o[0])*eu[1],d=(proy(huella[2])+proy(huella[3]))/2
 let calles=c.marco[6];if(r[0]>1e-6)calles&=~CALLE.IZQ;if(r[1]<1-1e-6)calles&=~CALLE.DER;if(r[2]<1-1e-6)calles&=~CALLE.FONDO
 const sx=w/c.marco[4],sz=d/c.marco[5]
 const alas=c.alas.map(([tipo,x0,z0,x1,z1])=>[tipo===ALA.ESQUINA_IZQ&&!(calles&CALLE.IZQ)?ALA.LATERAL_IZQ:tipo===ALA.ESQUINA_DER&&!(calles&CALLE.DER)?ALA.LATERAL_DER:tipo,x0*sx,z0*sz,x1*sx,z1*sz])
 return {...c,huella,marco:[...o,...eu,w,d,calles,c.marco[7]*sz],alas,pisos:calles?c.pisos:1}
}
