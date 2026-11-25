/** Piloto visual: tres cuadras existentes; no cambia la parcelación ni los datos históricos. */
import {puntoEnPoligono} from './hitos/suprimir.js'
export const PILOTO_COLONIAL = [
 {id:'U1772-0080',poligono:[[8804.926,7177.362],[8850.839,6921.014],[9035.975,6955.786],[8986.062,7216.633]]},
 {id:'U1772-0095',poligono:[[9094.898,6749.251],[9137.991,6497.003],[9390.107,6543.511],[9342.907,6798.433]]},
 {id:'U1772-0205',poligono:[[8633.142,6663.802],[8686.434,6414.912],[8932.468,6462.707],[8875.451,6711.978]]},
]
export function nivelDetalle(distancia,anterior=0,liviano=false){
 if(distancia>(anterior?440:400))return 0
 if(liviano)return 1
 return distancia<(anterior===2?200:160)?2:1
}
function enBorde(p,poligono){
 return poligono.some((a,i)=>{const b=poligono[(i+1)%poligono.length],dx=b[0]-a[0],dz=b[1]-a[1],l2=dx*dx+dz*dz,t=((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l2
  return t>=-.001&&t<=1.001&&Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz)<.3})
}
/** El trazado rasterizado de 1843 no coincide exactamente con la cuadra regular de 1772.
 * Ambos extremos deben seguir el MISMO borde, a menos de 3 m, y mirar hacia la calle. */
function frenteDeCalle(b,c,normal,poligono){
 const area=poligono.reduce((s,p,i)=>{const q=poligono[(i+1)%poligono.length];return s+p[0]*q[1]-q[0]*p[1]},0)
 return poligono.some((p,i)=>{
  const q=poligono[(i+1)%poligono.length],dx=q[0]-p[0],dz=q[1]-p[1],l=Math.hypot(dx,dz),signo=Math.sign(area)
  if((normal[0]*dz-normal[1]*dx)*signo/l<.9)return false
  return [b,c].every(v=>{const t=((v[0]-p[0])*dx+(v[1]-p[1])*dz)/(l*l)
   return t>=0&&t<=1&&Math.hypot(v[0]-p[0]-t*dx,v[1]-p[1]-t*dz)<3})
 })
}
/** Se leen los triángulos YA extruidos: la altura y el reparto son los mismos de la fachada nativa. */
export function extraerFrentes({atributos:a,indices},manzanas){
 const salida=[],vistos=new Set(),p=a.position
 for(let j=0;j<indices.length;j+=3){
  const k=indices[j],info=k*4
  const nace=a.aVida[k*2],muere=a.aVida[k*2+1]
  const generado1772=a.aInfo[info+2]>=256&&a.aInfo[info+2]%256===0&&nace===1&&muere===2
  const historia1843=a.aHistoria?Math.floor(a.aHistoria[k*2]/65536)%256:0
  const colonial1843=nace<=2&&(!muere||muere>2)&&historia1843%16===0&&Math.floor(historia1843/16)>0
  if((!generado1772&&!colonial1843)||a.aPared[k*3+1]<1.8||Math.abs(a.normal[k*3+1])>.01||a.aTecho[k*4+3]>.5)continue
  const ancla=Array.from(a.aAncla.slice(k*2,k*2+2)),m=manzanas.find(m=>puntoEnPoligono(ancla,m.poligono))
  if(!m)continue
  const bajos=Array.from(indices.slice(j,j+3)).filter(v=>Math.abs(p[v*3+1])<.001).sort((x,y)=>a.aPared[x*3]-a.aPared[y*3])
  if(bajos.length!==2)continue
  const [v,w]=bajos,desde=a.aPared[v*3],hasta=a.aPared[w*3],du=hasta-desde
  if(du<.5)continue
  const b=[p[v*3],p[v*3+2]],c=[p[w*3],p[w*3+2]]
  const eje=[(c[0]-b[0])/du,(c[1]-b[1])/du],origen=[b[0]-desde*eje[0],b[1]-desde*eje[1]],normal=[a.normal[k*3],a.normal[k*3+2]].map(x=>x/Math.hypot(a.normal[k*3],a.normal[k*3+2]))
  const epoca=generado1772?1:2
  if(epoca===1?(!enBorde(b,m.poligono)||!enBorde(c,m.poligono)||!enBorde([(b[0]+c[0])/2,(b[1]+c[1])/2],m.poligono)):!frenteDeCalle(b,c,normal,m.poligono))continue
  const clave=[epoca,...ancla,...b,...c].map(x=>x.toFixed(3)).join(',');if(vistos.has(clave))continue;vistos.add(clave)
  salida.push({manzana:m.id,epoca,vida:[epoca,epoca+1],ancla,origen,eje,normal,desde,hasta,largo:a.aPared[k*3+1],altoPiso:a.aPared[k*3+2],pisos:epoca===1?a.aInfo[info+3]:Math.floor(historia1843/16),semilla:a.aInfo[info+1]})
 }
 return salida
}
/** Cajas locales: x a lo largo del muro, z hacia la calle. Base y piezas finas se fusionan por separado. */
export function piezasDeFrente(f){
 const p=[],caja=(tipo,x,y,z,w,h,d,color,fino=false)=>p.push({tipo,x,y,z,w,h,d,color,fino})
 const alto=f.altoPiso*f.pisos
 caja('cornisa',(f.desde+f.hasta)/2,alto-.25,.06,f.hasta-f.desde,.15,.16,0xeadfc6)
 if(f.pisos<2)return p
 const n=Math.max(1,Math.floor(f.largo/3.8+.3)),paso=f.largo/n
 const escala=f.altoPiso>4.6?Math.min(f.altoPiso/4.6,1.2):Math.max(.5,Math.min(1,(f.altoPiso-.65)/3.3)),dintel=3.25*escala
 for(let i=0;i<n;i++){
  const x=(i+.5)*paso,w=1.56,y=f.altoPiso
  if(x-w/2<f.desde+.08||x+w/2>f.hasta-.08)continue
  caja('losa',x,y+.07,.33,w,.14,.74,0x8c7c63)
  caja('pasamanos',x,y+1.04,.67,w,.06,.06,0x353e32)
  for(const lado of [-1,1]){
   caja('pasamanos',x+lado*(w/2-.03),y+1.04,.33,.06,.06,.7,0x353e32)
   caja('marco',x+lado*.54,y+(dintel+.15)/2,.055,.12,dintel-.15+.12,.14,0xeadfc6)
  }
  caja('dintel',x,y+dintel+.06,.055,1.2,.12,.14,0xeadfc6)
  for(let k=0;k<=8;k++)caja('barrote',x-w/2+.03+k*(w-.06)/8,y+.59,.67,.035,.9,.035,0x353e32,k%4!==0)
  for(const lado of [-1,1])for(let k=1;k<=3;k++)caja('barrote',x+lado*(w/2-.03),y+.59,k*.16,.035,.9,.035,0x353e32,k!==2)
 }
 return p
}
