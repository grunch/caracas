import * as THREE from 'three'
import {optimizarPanteon} from './optimizar-panteon.js'

/** El lenguaje del estudio de Miraflores sobre plantas georreferenciadas.
 * Las cubiertas siguen el contorno real, con patios abiertos, no una caja escalada.
 */
export function crearBloqueSilencio({plantas,comercio,alta}){
 const grupo=new THREE.Group(),fachada=new THREE.MeshStandardMaterial({color:0xe7ce92}),piedra=new THREE.MeshStandardMaterial({color:0xaaa38d}),marco=new THREE.MeshStandardMaterial({color:0xf0e4c6}),vidrio=new THREE.MeshStandardMaterial({color:0x425955}),hierro=new THREE.MeshStandardMaterial({color:0x394842}),techo=new THREE.MeshStandardMaterial({color:0xbbb7a5});
 const cubo=new THREE.BoxGeometry(1,1,1),columna=new THREE.LatheGeometry([[.38,0],[.48,.15],[.43,.35],[.56,1.2],[.49,2.15],[.35,2.65],[.43,2.72],[.43,2.91]].map(p=>new THREE.Vector2(...p)),8);
 function mesh(g,geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m}
 function caja(g,w,h,d,x,y,z,mat){const m=mesh(g,cubo,mat,x,y,z);m.scale.set(w,h,d)}
 function forma(p){const s=new THREE.Shape(p.exterior.map(([x,z])=>new THREE.Vector2(x,-z)));for(const a of p.patios)s.holes.push(new THREE.Path(a.map(([x,z])=>new THREE.Vector2(x,-z))));return s}
 function volumen(ps,y,h,mat){for(const p of ps){const geo=new THREE.ExtrudeGeometry(forma(p),{depth:h,bevelEnabled:false});geo.rotateX(-Math.PI/2);geo.translate(0,y,0);mesh(grupo,geo,mat)}}
 function fachadas(ps,inicio,pisos,galeria){
  for(const p of ps)for(const ring of [p.exterior,...p.patios])for(let j=0;j<ring.length;j++){
   const a=ring[j],b=ring[(j+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);if(l<.4)continue;
   const g=new THREE.Group();g.position.set((a[0]+b[0])/2,0,(a[1]+b[1])/2);g.rotation.y=-Math.atan2(dz,dx);grupo.add(g);
   const n=Math.max(1,Math.round(l/4.8)),paso=l/n;
   if(galeria){for(let k=0;k<=n;k++)mesh(g,columna,piedra,-l/2+k*paso,.22,.45);}
   for(let k=0;k<n;k++){
    const x=-l/2+(k+.5)*paso;
    if(galeria&&paso>2){const r=paso/2-.35,s=new THREE.Shape();s.moveTo(-paso/2,4.3);s.lineTo(paso/2,4.3);s.lineTo(paso/2,2.96);s.lineTo(r,2.96);s.absellipse(0,2.96,r,1.08,0,Math.PI,false);s.lineTo(-paso/2,2.96);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:.55,bevelEnabled:false,curveSegments:6});mesh(g,geo,fachada,x,0,.15);
     caja(g,paso-.8,2.4,.12,x,1.65,2.55,vidrio);
    }
    if(paso<2.4)continue;
    for(let f=0;f<pisos;f++){
     const y=inicio+1.35+f*3.15,balcon=n>3&&k%3===1,w=Math.min(balcon?2.3:1.8,paso-.6);
     caja(g,w,balcon?2.2:1.65,.16,x,y,-.04,marco);caja(g,w-.3,balcon?1.95:1.38,.18,x,y,-.14,vidrio);caja(g,.065,balcon?1.95:1.38,.2,x,y,-.24,marco);
     caja(g,w+.15,.14,.35,x,y-(balcon?1.15:.9),-.1,piedra);
     if(balcon){const bw=Math.min(paso*.85,4),by=y-1.15;caja(g,bw,.2,1.3,x,by,-.65,marco);caja(g,bw,.08,.09,x,by+1.08,-1.25,hierro);for(let t=0;t<=5;t++)caja(g,.05,.91,.05,x-bw/2+t*bw/5,by+.58,-1.25,hierro);for(const lado of [-1,1])caja(g,.1,1,1.2,x+lado*bw/2,by+.6,-.6,marco);}
    }
   }
   const alto=inicio+pisos*3.15;caja(g,l,.55,.2,0,alto+.35,.1,marco);
  }
 }
 volumen(comercio,.2,4.1,piedra);volumen(plantas,4.3,9.45,fachada);volumen(plantas,13.75,.22,techo);fachadas(plantas,4.3,3,true);
 if(alta.length){volumen(alta,13.75,9.45,fachada);volumen(alta,23.2,.22,techo);fachadas(alta,13.75,3,false)}
 optimizarPanteon(grupo);return grupo
}
