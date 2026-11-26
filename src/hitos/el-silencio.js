import {Shape,ShapeGeometry,CylinderGeometry,IcosahedronGeometry,BoxGeometry,Vector2} from 'three'
import {crearBloqueSilencio} from './el-silencio-modelo.js'
import {HUELLAS_SILENCIO} from './datos/el-silencio-huellas.js'
import {PLANTAS_SILENCIO} from './datos/el-silencio-plantas.js'
import {localSilencio,RECINTO_SILENCIO} from './datos/el-silencio.js'
import {recortarConvexo} from '../poligono.js'
import {puntoEnPoligono} from './suprimir.js'
import {MAT} from './lienzo.js'

function forma(ps){return new Shape(ps.map(([x,z])=>new Vector2(x,-z)))}
/** Teselas pequeñas para seguir el relieve sin una plataforma plana sobre las plazas. */
function pavimento(p,pts,color,y){
 const xs=pts.map(v=>v[0]),zs=pts.map(v=>v[1]);
 for(let x=Math.min(...xs);x<Math.max(...xs);x+=4)for(let z=Math.min(...zs);z<Math.max(...zs);z+=4){
  const corte=recortarConvexo([[x,z],[x+4,z],[x+4,z+4],[x,z+4]],pts);if(corte.length<3)continue;
  const geo=new ShapeGeometry(forma(corte));geo.rotateX(-Math.PI/2);geo.translate(0,y,0);p.sobreTerreno().geo(geo,{color,mat:MAT.LISO});
 }
}
function arbol(p,x,z,palma=false){
 const q=p.en(x,0,z).sobreTerreno(),alto=palma?9:5;
 q.geo(new CylinderGeometry(.16,.27,alto,6).translate(0,alto/2+.5,0),{color:0x8a7653});
 if(palma){for(let i=0;i<8;i++){const s=new Shape();s.moveTo(0,0);s.quadraticCurveTo(1.8,.8,3.8,0);s.quadraticCurveTo(1.8,-.7,0,0);const geo=new ShapeGeometry(s);geo.rotateX(-Math.PI/2);geo.rotateZ(.2);geo.rotateY(i*Math.PI/4);geo.translate(0,alto+.5,0);q.geo(geo,{color:0x53794d})}}
 else q.geo(new IcosahedronGeometry(1,1).scale(2.7,3,2.7).translate(0,alto+.5,0),{color:0x66884f});
}
function jardines(p,plantas){
 for(const j of plantas.jardines){
  const s=forma(j.exterior);for(const h of j.patios)s.holes.push(forma(h));const g=new ShapeGeometry(s);g.rotateX(-Math.PI/2);g.translate(0,.85,0);p.sobreTerreno().geo(g,{color:0x87996b});
  const xs=j.exterior.map(v=>v[0]),zs=j.exterior.map(v=>v[1]);
  for(let x=Math.min(...xs)+5;x<Math.max(...xs)-3;x+=13)for(let z=Math.min(...zs)+5;z<Math.max(...zs)-3;z+=14){
   if(!puntoEnPoligono([x,z],j.exterior)||j.patios.some(h=>puntoEnPoligono([x,z],h)))continue;
   // La copa completa debe quedar dentro del jardín, sin invadir fachadas.
   if([[3,0],[-3,0],[0,3],[0,-3]].every(([a,b])=>puntoEnPoligono([x+a,z+b],j.exterior)&&!j.patios.some(h=>puntoEnPoligono([x+a,z+b],h))))arbol(p,x,z);
  }
 }
}
function fuente(p,x,z){
 const q=p.en(x,0,z).sobreTerreno();
 q.geo(new CylinderGeometry(7,7,.5,24).scale(1,1,.72).translate(0,.75,0),{color:0xaaa38d});
 q.geo(new CylinderGeometry(6.5,6.5,.08,24).scale(1,1,.72).translate(0,1.03,0),{color:0x6eaaa3});
 q.geo(new BoxGeometry(2.8,.8,2.2).translate(0,1.4,0),{color:0xbeb799});
 for(const lado of [-1,1]){
  q.geo(new IcosahedronGeometry(1,1).scale(.65,1.05,.48).rotateZ(lado*.38).translate(lado*.8,2.4,0),{color:0xbeb799});
  q.geo(new IcosahedronGeometry(1,1).scale(.34,.43,.34).translate(lado*1.1,3.4,0),{color:0xbeb799});
  q.geo(new IcosahedronGeometry(1,1).scale(1.5,.5,.5).rotateZ(lado*.4).translate(lado*2,1.75,0),{color:0xbeb799});
 }
}
/** Modelo al lienzo de la ciudad: una sola geometría, mismas vidas y tinta/color. */
export function elSilencio(p,{id}){
 if(id==='suelo'){
  const recinto=RECINTO_SILENCIO.map(localSilencio);pavimento(p,recinto,0xc9c4b0,.65);
  // Pasos entre las parcelas documentadas; anchuras interpretativas, sin ocupar edificios.
  for(const [a,b,w] of [[[22,-3],[150,-3],17],[[-25,-65],[-25,50],8],[[-8,64],[-132,170],9],[[18,76],[7,196],7],[[25,67],[148,67],7]]){
   const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),nx=-dz/l*w/2,nz=dx/l*w/2;
   const rect=[[a[0]+nx,a[1]+nz],[a[0]-nx,a[1]-nz],[b[0]-nx,b[1]-nz],[b[0]+nx,b[1]+nz]];
   const corte=recortarConvexo(rect,recinto);if(corte.length>2)pavimento(p,corte,0x969b91,.7);
  }return
 }
 const h=HUELLAS_SILENCIO.find(h=>h.id===id),pts=h.px.map(localSilencio),unicos=pts.slice(0,-1);
 const cx=unicos.reduce((s,v)=>s+v[0],0)/unicos.length,cz=unicos.reduce((s,v)=>s+v[1],0)/unicos.length,q=p.en(-cx,0,-cz);
 if(/^[1-7]$/.test(id)){
  const planta=PLANTAS_SILENCIO[id],g=crearBloqueSilencio(planta),geos=new Set(),mats=new Set();g.updateMatrixWorld(true);
  try{g.traverse(o=>{if(o.isMesh){geos.add(o.geometry);mats.add(o.material);q.geo(o.geometry.clone().applyMatrix4(o.matrixWorld),{color:o.material.color.toArray(),mat:MAT.LISO})}})}finally{geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose())}
  jardines(q,planta);
 }else{
  // O’Leary es ligeramente cóncava: el contorno se triangula sin recortarlo como convexo.
  const geo=new ShapeGeometry(forma(pts));geo.rotateX(-Math.PI/2);geo.translate(0,.9,0);q.sobreTerreno().geo(geo,{color:0xd6c8ad});
  if(id==='OLeary'){
   for(const z of [-29,20]){fuente(q,1,z);for(const x of [-11,13])for(const dz of [-13,13])arbol(q,x,z+dz,true)}
  }else{
   for(const x of [110,133])for(const z of [95,130,170])arbol(q,x,z);
  }
 }
}
