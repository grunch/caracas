import {BoxGeometry,CylinderGeometry,Shape,ShapeGeometry,SphereGeometry} from 'three'
import {AVENIDAS_SUR_INICIALES,CALLES_SUR_1936,CONTORNO_SUR_1936,CONTORNO_SUR_INICIAL} from './datos/cementerio-sur.js'
import {MAT} from './lienzo.js'

const COLOR={tierra:0x829568,camino:0xc7b99a,piedra:0xc3bba8,claro:0xf6ead2,hoja:0x486644,tronco:0x6b543a}
function local(p){return [(p[0]-7100)/2,(p[1]-12500)/2]}
function emitir(p,g,color){p.geo(g,{color})}
function caja(p,w,h,d,x,y,z,color){emitir(p,new BoxGeometry(w,h,d).translate(x,y,z),color)}
function suelo(p,contorno){
 const s=new Shape(),pts=contorno.map(([x,z])=>local([x,z]));s.moveTo(pts[0][0],-pts[0][1]);
 for(const [x,z] of pts.slice(1))s.lineTo(x,-z);s.closePath();
 const xs=pts.map(q=>q[0]),zs=pts.map(q=>q[1]),ancho=Math.max(...xs)-Math.min(...xs),fondo=Math.max(...zs)-Math.min(...zs)
 // El piso baja hasta el DEM por vértice; evita dejar una losa horizontal suspendida sobre las laderas.
 p.geo(new ShapeGeometry(s,1).rotateX(-Math.PI/2).translate(0,-.05,0),{color:[ancho/2,fondo/2,-1],mat:MAT.JARDIN})
}
function camino(p,a,b,ancho){
 const [x0,z0]=a,[x1,z1]=b,dx=x1-x0,dz=z1-z0,l=Math.hypot(dx,dz),g=new BoxGeometry(l,.3,ancho);
 g.rotateY(Math.atan2(-dz,dx)).translate((x0+x1)/2,.5,(z0+z1)/2);emitir(p,g,COLOR.camino)
}
function dentro([x,z],poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c;}return c}
function distancia(p,a,b){const [x,z]=p,[ax,az]=a,[bx,bz]=b,dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz||1,f=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l));return Math.hypot(x-(ax+f*dx),z-(az+f*dz))}
export function recortarTramo(a,b,poly){
 const dx=b[0]-a[0],dz=b[1]-a[1],ts=[0,1]
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const c=poly[j],d=poly[i],ex=d[0]-c[0],ez=d[1]-c[1],den=dx*ez-dz*ex
  if(Math.abs(den)<1e-8)continue
  const t=((c[0]-a[0])*ez-(c[1]-a[1])*ex)/den,u=((c[0]-a[0])*dz-(c[1]-a[1])*dx)/den
  if(t>0&&t<1&&u>=0&&u<=1)ts.push(t)
 }
 ts.sort((x,y)=>x-y)
 const tramos=[]
 for(let i=0;i<ts.length-1;i++){const t0=ts[i],t1=ts[i+1],m=(t0+t1)/2;if(t1-t0>1e-7&&dentro([a[0]+dx*m,a[1]+dz*m],poly))tramos.push([[a[0]+dx*t0,a[1]+dz*t0],[a[0]+dx*t1,a[1]+dz*t1]])}
 return tramos
}

/** Modelo integrado con piezas ligeras. Perímetros 1889/1911 interpretativos; solo 1936 está calco de plano. */
export function cementerioSur(p,{fase='ampliado'}={}){
 const extendido=fase==='ampliado',contorno=extendido?CONTORNO_SUR_1936:CONTORNO_SUR_INICIAL;
 const viasSinRecortar=(extendido?CALLES_SUR_1936:AVENIDAS_SUR_INICIALES).map(tramo=>tramo.map(local)),poly=contorno.map(local);
 const vias=viasSinRecortar.flatMap((v,i)=>recortarTramo(v[0],v[1],poly).map(t=>({tramo:t,ancho:extendido?(i===0?5.5:i<6?3.7:3.3):4})));
 suelo(p,contorno);
 vias.forEach(v=>camino(p,v.tramo[0],v.tramo[1],v.ancho));
 const minX=Math.min(...poly.map(q=>q[0])),maxX=Math.max(...poly.map(q=>q[0])),minZ=Math.min(...poly.map(q=>q[1])),maxZ=Math.max(...poly.map(q=>q[1]));
 const paso=extendido?30:20,margin=extendido?12:8;let tumba=0;
 for(let z=minZ+margin,iz=0;z<maxZ-margin;z+=paso,iz++)for(let x=minX+margin,ix=0;x<maxX-margin;x+=paso,ix++){
  const q=[x+(iz%2)*paso*.45,z];if(!dentro(q,poly))continue;
  const cerca=vias.some(v=>distancia(q,v.tramo[0],v.tramo[1])<(v.ancho/2+1.8));
  if(cerca||(ix*7+iz*11)%13===0)continue;
  caja(p,1.35,.22,2.4,q[0],.25,q[1],COLOR.piedra);tumba++;
  if((ix*5+iz*3)%17===0)caja(p,1.45,.65,.35,q[0],.65,q[1]-1.1,COLOR.claro);
 }
 const pasoArbol=extendido?47:28;
 for(let z=minZ+20,iz=0;z<maxZ-20;z+=pasoArbol,iz++)for(let x=minX+20,ix=0;x<maxX-20;x+=pasoArbol,ix++){
  const q=[x+(iz%2)*14,z+(ix%3)*7];if(!dentro(q,poly))continue;
  if(vias.some(v=>distancia(q,v.tramo[0],v.tramo[1])<(v.ancho/2+6)))continue;
  if((ix*3+iz*5)%(extendido?4:3)!==0)continue;
  const h=5+(ix*7+iz*11)%4;
  emitir(p,new CylinderGeometry(.13,.22,h*.35,6).translate(q[0],h*.175,q[1]),COLOR.tronco);
  emitir(p,new SphereGeometry(1,6,4).scale(1.25,h*.48,1.25).translate(q[0],h*.52,q[1]),COLOR.hoja);
 }
 return {fase:extendido?'1936+':'1889-1911',tumbas:tumba};
}
