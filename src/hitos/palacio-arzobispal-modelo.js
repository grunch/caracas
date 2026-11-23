import * as THREE from 'three';
import {etapaArzobispal} from './palacio-arzobispal-datos.js';

export const ENVOLVENTE = 'Envolvente de la época';
export const CUBIERTAS = 'Cubiertas desmontables';

/** Estudio de miraflores (src/palacio-arzobispal.js), adaptado al lienzo de hitos.
 * Ejes del modelo: +Z frente (la fachada de seis balcones), +X la fachada lateral, +Y arriba; origen al centro.
 * Dimensiones nominales (34 × 36 m), no levantamiento.
 * Cambios respecto del estudio: la fachada lateral va en +X y la medianera ciega en −X (en el plano de 1936 el
 * palacio mira al oeste, a la plaza, y su lateral da a la calle del sur); la medianera y la lateral cubren las
 * esquinas; los aleros y los bordes del patio tocan muros y vigas (sin rendijas); los faldones miran hacia arriba;
 * en 'ciudad' no van la plataforma, el enlosado del patio, las barras de teja ni las volutas de hierro.
 * Lo que cambia con la época (fachadas, muros con su color y cubiertas) cuelga de ENVOLVENTE o CUBIERTAS;
 * los patios, iguales en todas las fechas, quedan fuera.
 */
export function crearPalacioArzobispal({anio=1889,nivelDetalle='ciudad'}={}){
 const etapa=etapaArzobispal(anio),historico=!etapa.colonial,ciudad=nivelDetalle==='ciudad';
 const edificio=new THREE.Group(),envolvente=new THREE.Group(),cubiertas=new THREE.Group();
 edificio.name=etapa.nombre;envolvente.name=ENVOLVENTE;cubiertas.name=CUBIERTAS;edificio.add(envolvente,cubiertas);
 edificio.userData={id:'palacio-arzobispal',anio,huella:[34,36],frente:'+Z',medidasVerificadas:false,vanosFachada:6,accesos:2,patiosHipoteticos:2};
 const colores={muro:historico?0xc7b78e:0xe2d9bd,cal:0xf0e8d4,zocalo:0x777869,madera:0x634732,maderaClara:0x816044,hierro:0x303b36,sombra:0x282e29,teja:0xa4694d,tejaClara:0xb37b58,piso:0xc2b49b,piedra:0xa6a18f};
 const mats=Object.fromEntries(Object.entries(colores).map(([k,color])=>[k,new THREE.MeshStandardMaterial({name:k,color,roughness:.92})]));
 const curva=ciudad?4:12,puntosArco=ciudad?6:24;
 const unidad=new THREE.BoxGeometry(1,1,1);
 function mesh(geo,mat,x=0,y=0,z=0,g=edificio){const m=new THREE.Mesh(geo,mats[mat]);m.position.set(x,y,z);g.add(m);return m;}
 function caja(x,y,z,w,h,d,mat='muro',g=edificio){const m=mesh(unidad,mat,x,y,z,g);m.scale.set(w,h,d);return m;}
 function grupo(x,z,rot,nombre,padre=edificio){const g=new THREE.Group();g.name=nombre;g.position.set(x,0,z);g.rotation.y=rot;padre.add(g);return g;}
 function barra(a,b,r=.025,mat='hierro',g=edificio){const u=new THREE.Vector3(...a),v=new THREE.Vector3(...b),d=v.clone().sub(u);const m=mesh(new THREE.CylinderGeometry(r,r,d.length(),ciudad?4:6,1,ciudad),mat,...u.add(v).multiplyScalar(.5).toArray(),g);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
 function extruir(s,d,mat,x,y,z,g){return mesh(new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:curva}),mat,x,y,z,g);}
 function arco(w,h,f=.3){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h-f);s.quadraticCurveTo(0,h+f,-w/2,h-f);s.closePath();return s;}
 function contorno(w,h,f=.3){return arco(w,h,f).getPoints(puntosArco);}
 function marco(x,y,w,h,g,segmento=true){
  const f=segmento?.3:0;
  const s=arco(w+.38,h+.23,f);const hueco=new THREE.Path();hueco.setFromPoints(contorno(w,h,f));s.holes.push(hueco);
  extruir(s,.16,'cal',x,y-.05,.31,g);
  if(historico){caja(x,y+h+.24,.4,w+.48,.12,.3,'cal',g);caja(x,y+h+.4,.34,w+.12,.11,.18,'cal',g);}
 }
 function hoja(x,y,w,h,g,segmento=true){
  extruir(arco(w,h,segmento?.3:0),.09,'madera',x,y,.22,g);
  // Dos hojas con cuarterones (solo en el estudio); la parte curva se conserva libre.
  if(!ciudad)for(const dx of [-w/4,w/4]){
   caja(x+dx,y+(h-.4)/2,.34,.065,h-.4,.07,'maderaClara',g);
   for(let j=0;j<3;j++){
    const py=y+.25+j*(h-.55)/3;
    caja(x+dx,py+.35,.335,w*.35,.62,.035,'maderaClara',g);
    caja(x+dx,py+.35,.36,w*.28,.49,.03,'madera',g);
   }
  }
  caja(x,y+(h-.3)/2,.38,.055,h-.3,.07,'maderaClara',g);
 }
 function hierro(x,y,w,g,balcon=false){
  const z=balcon?1.03:.5,h=balcon?1.03:2.05,n=Math.round(w/(ciudad?.3:.17));
  for(let i=0;i<=n;i++){const dx=-w/2+i*w/n;barra([x+dx,y,z],[x+dx,y+h,z],.021,'hierro',g);}
  for(const dy of [0,.18,h-.15,h])caja(x,y+dy,z,w,.045,.055,'hierro',g);
  if(balcon){
   for(const dx of [-w/2,w/2]){barra([x+dx,y,.4],[x+dx,y,z],.028,'hierro',g);barra([x+dx,y+h,.4],[x+dx,y+h,z],.03,'hierro',g);}
   if(!ciudad)for(let i=0;i<Math.floor(w/.4);i++){
    const cx=x-w/2+.22+i*.4;
    const puntos=[];for(let j=0;j<=20;j++){const a=j/20*Math.PI*2;puntos.push(new THREE.Vector3(cx+Math.sin(a)*.12,y+.55+Math.cos(a)*.22,z));}
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos),20,.015,4,false),'hierro',0,0,0,g);
   }
  }
 }
 function balcon(x,g){
  caja(x,4.69,.64,2.15,.17,1.02,'piedra',g);caja(x,4.57,.62,1.94,.12,.89,'cal',g);
  for(const dx of [-.66,.66]){caja(x+dx,4.35,.5,.17,.42,.65,'cal',g);}
  hierro(x,4.79,1.96,g,true);
 }
 function fachada(g,largo,ejes,principal=false,muro=largo){
  const s=new THREE.Shape();s.moveTo(-muro/2,0);s.lineTo(muro/2,0);s.lineTo(muro/2,9.5);s.lineTo(-muro/2,9.5);s.closePath();
  const vanos=[];
  for(let i=0;i<ejes.length;i++){
   const x=ejes[i],puerta=principal&&(i===0||i===ejes.length-1);
   for(const alto of [false,true]){
    const w=puerta&&!alto?2.05:1.48,y=alto?4.85:puerta?.18:1.05,h=alto?3.03:puerta?3.52:2.65;
    const f=etapa.colonial?0:.3;
    const hole=new THREE.Path();hole.setFromPoints(contorno(w,h,f).map(p=>new THREE.Vector2(p.x+x,p.y+y)));s.holes.push(hole);
    vanos.push({x,y,w,h,alto,puerta});
   }
  }
  extruir(s,.58,'muro',0,0,-.27,g);
  // Zócalo segmentado para no bloquear accesos reales.
  let inicio=-largo/2;
  for(const v of vanos.filter(v=>v.puerta&&!v.alto)){
   const fin=v.x-v.w/2;if(fin>inicio)caja((inicio+fin)/2,.32,.34,fin-inicio,.64,.1,'zocalo',g);inicio=v.x+v.w/2;
  }
  if(inicio<largo/2)caja((inicio+largo/2)/2,.32,.34,largo/2-inicio,.64,.1,'zocalo',g);
  for(const v of vanos){
   marco(v.x,v.y,v.w,v.h,g,!etapa.colonial);hoja(v.x,v.y,v.w,v.h,g,!etapa.colonial);
   if(v.alto)balcon(v.x,g);else if(!v.puerta)hierro(v.x,v.y+.06,v.w-.12,g);
  }
  if(historico){
   for(const y of [4.48,4.65,9.1,9.35,9.56])caja(0,y,.39,largo+.12,y>9?.16:.09,y>9?.5:.2,'cal',g);
   if(!ciudad)for(let x=-largo/2+.2;x<largo/2;x+=.45)caja(x,9.18,.42,.18,.22,.36,'cal',g);
   caja(0,10.05,0,largo,1,.55,'muro',g);
   for(const x of ejes){caja(x,10.05,.31,4.45,.68,.07,'cal',g);caja(x,10.05,.365,4.2,.45,.06,'muro',g);}
   caja(0,10.6,.05,largo+.3,.22,.8,'cal',g);
  }else{
   caja(0,9.43,.25,largo+.3,.16,.5,'madera',g);
   for(let x=-largo/2;x<=largo/2;x+=ciudad?.84:.42)caja(x,9.45,.45,.1,.17,.85,'madera',g);
  }
 }
 if(!ciudad)caja(0,-.15,0,35.3,.3,37.3,'piedra');
 const norte=grupo(0,18,0,'Fachada principal · seis balcones',envolvente);
 fachada(norte,34,[-13.75,-8.25,-2.75,2.75,8.25,13.75],true);
 // La lateral (distribución hipotética) se alarga hasta cubrir la esquina con la principal.
 const lateral=grupo(17,0,Math.PI/2,'Fachada lateral · distribución hipotética',envolvente);
 fachada(lateral,36,[-14.4,-9.6,-4.8,0,4.8,9.6,14.4],false,36.62);
 caja(-17,4.75,0,.6,9.5,36.62,'muro',envolvente);caja(0,4.75,-18,34,9.5,.6,'muro',envolvente);
 // Dos patios interpretativos, no una copia de los patios municipales o de Casa Amarilla.
 for(const cx of [-8.5,8.5]){
  const patio=grupo(cx,0,0,'Patio interpretativo',edificio);
  caja(0,.02,0,12,.12,23,'piso',patio);
  if(!ciudad)for(let x=-5.6;x<=5.6;x+=.8)for(let z=-10.8;z<=10.8;z+=.8)caja(x,.09,z,.76,.015,.76,(Math.round((x+5.6)/.8)+Math.round((z+10.8)/.8))%2?'piso':'piedra',patio);
  for(const [px,pz,rot,largo,n] of [[0,12,Math.PI,12,4],[0,-12,0,12,4],[-6,0,Math.PI/2,24,8],[6,0,-Math.PI/2,24,8]]){
   const gal=grupo(px,pz,rot,'Galería de patio',patio);
   caja(0,4.55,0,largo,.25,2.5,'piso',gal);caja(0,9.32,0,largo,.2,2.5,'madera',gal);
   const paso=largo/n,balaustres=ciudad?4:10;
   for(let i=0;i<=n;i++){
    const x=-largo/2+i*paso;
    caja(x,2.2,1.15,.32,4.4,.32,'cal',gal);caja(x,.2,1.15,.48,.35,.48,'piedra',gal);caja(x,3.2,1.15,.48,.2,.48,'cal',gal);
    caja(x,6.95,1.15,.18,4.6,.18,'madera',gal);caja(x,9.05,1.15,.65,.2,.25,'madera',gal);
    if(i<n){
     const s=new THREE.Shape();s.moveTo(x,3.1);s.lineTo(x,4.4);s.lineTo(x+paso,4.4);s.lineTo(x+paso,3.1);s.quadraticCurveTo(x+paso/2,5.05,x,3.1);
     extruir(s,.28,'cal',0,0,1,gal);
     caja(x+paso/2,5.65,1.15,paso,.12,.14,'madera',gal);caja(x+paso/2,4.85,1.15,paso,.12,.14,'madera',gal);
     for(let j=1;j<balaustres;j++)caja(x+j*paso/balaustres,5.25,1.15,.065,.75,.065,'madera',gal);
    }
   }
   // El muro del fondo de la galería lleva el color de la época: pasa a la envolvente (abajo). Se alarga hasta
   // el muro de la galería vecina (1,4 + 0,225 m por lado) para cerrar las esquinas del patio.
   caja(0,4.6,-1.4,largo+3.25,9.2,.45,'muro',gal);
  }
 }
 // Tejados a cuatro faldones alrededor de cada patio. Pendientes y cumbreras nominales.
 // Orden a, c, b: la normal sale hacia arriba. uv en metros (u a lo largo del borde a–b, v pendiente abajo),
 // para las tejas que dibuja el lienzo (userData.mat).
 function faldon(a,b,c,d){
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...c,...b,...a,...d,...c],3));geo.computeVertexNormals();
  const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),vd=new THREE.Vector3(...d),vc=new THREE.Vector3(...c),eje=vb.clone().sub(va).normalize();
  const uv=[a,c,b,a,d,c].flatMap(p=>{const r=new THREE.Vector3(...p).sub(va),u=r.dot(eje);return [u,r.addScaledVector(eje,-u).length()];});
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  mesh(geo,'teja',0,0,0,cubiertas).userData.mat='teja';
  if(ciudad)return;
  const n=Math.max(2,Math.round(va.distanceTo(vb)/.3));
  for(let i=0;i<=n;i++){
   const p=va.clone().lerp(vb,i/n),q=vd.clone().lerp(vc,i/n);p.y+=.035;q.y+=.035;barra(p.toArray(),q.toArray(),.055,i%3?'teja':'tejaClara',cubiertas);
  }
 }
 // El alero entra en los muros (y = 9,45, bajo su coronación de 9,5) y el borde del patio apoya en la viga de la galería.
 const ALERO=9.45,PATIO=9.3,CUMBRE=11.05;
 for(const cx of [-8.5,8.5]){
  const ox=historico?8.55:8.8,oz=historico?17.9:18.6;
  const outer=[[-ox,-oz],[ox,-oz],[ox,oz],[-ox,oz]],ridge=[[-7.2,-15.3],[7.2,-15.3],[7.2,15.3],[-7.2,15.3]],inner=[[-4.6,-10.6],[4.6,-10.6],[4.6,10.6],[-4.6,10.6]];
  for(let i=0;i<4;i++){const j=(i+1)%4,point=(p,y)=>[p[0]+cx,y,p[1]];faldon(point(outer[i],ALERO),point(outer[j],ALERO),point(ridge[j],CUMBRE),point(ridge[i],CUMBRE));faldon(point(ridge[i],CUMBRE),point(ridge[j],CUMBRE),point(inner[j],PATIO),point(inner[i],PATIO));barra(point(ridge[i],CUMBRE+.05),point(ridge[j],CUMBRE+.05),.14,'tejaClara',cubiertas);}
 }
 edificio.updateMatrixWorld(true);
 const muros=[];
 edificio.traverse(o=>{if(o.isMesh&&o.material===mats.muro&&!dentro(o,envolvente))muros.push(o);});
 for(const m of muros)envolvente.attach(m);
 return {edificio,cubiertas,envolvente,etapa};
}

function dentro(objeto,grupo){for(let p=objeto;p;p=p.parent)if(p===grupo)return true;return false;}
