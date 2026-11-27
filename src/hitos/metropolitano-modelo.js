import * as T from 'three';
import {taller} from './nuevo-circo-geometria.js';
// Estudio original en Miraflores; primitivas compartidas con el Nuevo Circo.
function metropolitano(t,techo){
 const {caja,cilindro,grupo,muro,anillo,techoAnular,cornisa,reja,pieza}=t;
 cilindro(18,18,.12,0,.13,0,'arena');anillo(18,18.2,0,1.2,'madera');
 for(let i=0;i<14;i++)anillo(18.5+i*.64,19.14+i*.64,.2+i*.39,.3,'madera');
 anillo(28.3,28.7,0,7.2,'cal');
 for(let i=0;i<48;i++){const a=i*Math.PI/24,x=27.8*Math.sin(a),z=27.8*Math.cos(a);cilindro(.12,.12,8.4,x,4.2,z,'hierro');}
 techoAnular(23.6,29,8.6,9.7);
 for(let i=0;i<48;i++){const a=i*Math.PI/24;const g=grupo(0,0,0,a,techo);caja(.075,.1,5.5,0,9.15,26.2,'hierro',g).rotation.x=-.2;}
 const frente=grupo(0,0,32);
 muro(44,6.1,.55,[-18,-9,0,9,18].map(x=>({x,w:x===0?4:2.7,h:4.7,y:.1,reja:true,rect:true})),frente);
 for(const x of [-21,-12,-4,4,12,21]){caja(.6,6.3,.9,x,3.15,.12,'claro',frente);caja(.95,.3,1.1,x,5.9,.12,'claro',frente);}
 for(const x of [-4,4])for(const y of [1.3,2.2,3.1,4,4.9])caja(.72,.18,1,x,y,.18,'zocalo',frente);
 cornisa(44,6.15,0,frente);reja(43,.75,0,6.65,0,frente);
 // Frontones curvos: central alto y dos remates laterales, como en las fotos de 1906.
 for(const [x,w,y] of [[0,8,6.7],[-19,5,6.5],[19,5,6.5]]){
  // Banda de mampostería con molduras: la fotografía muestra un remate macizo, no un tubo.
  const r=w/2,s=new T.Shape();s.absarc(0,0,r,0,Math.PI,false);
  s.lineTo(-r+.55,0);s.absarc(0,0,r-.55,Math.PI,0,true);s.closePath();
  pieza(new T.ExtrudeGeometry(s,{depth:.35,bevelEnabled:false,curveSegments:16}),'claro',x,y,0,frente);
  for(const rr of [r-.08,r-.45])pieza(new T.TorusGeometry(rr,.065,4,24,Math.PI),'ocre',x,y,.39,frente);
  caja(.65,1.6,.7,x-w/2,y-.6,0,'claro',frente);caja(.65,1.6,.7,x+w/2,y-.6,0,'claro',frente);
  cilindro(.25,.4,.6,x,y+w/2+.3,0,'ocre',frente);cilindro(.12,.28,.6,x,y+w/2+.9,0,'claro',frente);
 }
 for(const side of [-1,1]){caja(.55,5.8,10,side*22,2.9,27,'cal');caja(16,5.5,.5,side*14,2.75,22,'cal');}
 caja(44,.3,10,0,5.8,27,'metal',techo);
}

export function crearMetropolitano(){
 const edificio=new T.Group(),cubiertas=new T.Group();edificio.add(cubiertas);
 const t=taller(edificio,cubiertas,'ciudad');
 t.caja(58,.12,66,0,.06,0,'camino');metropolitano(t,cubiertas);t.cerrar();
 return {edificio,cubiertas};
}
