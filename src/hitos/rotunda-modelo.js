import * as T from 'three';
import {taller} from './nuevo-circo-geometria.js';
import {construirConcordia} from './concordia-modelo.js';
function rotunda(t,techo,meta){
 const {caja,cilindro,grupo,muro,anillo,tejado,reja,pieza}=t;
 meta.diametroPatio=24;meta.recintos=2;meta.centrosPatios=[[-19,0],[19,0]];
 // Dos recintos: ampliación norte descrita por Polar; separaciones nominales.
 for(const xc of [-19,19]){
 const recinto=grupo(xc,0,0),cubierta=grupo(xc,0,0,0,techo);
 cilindro(12,12,.12,0,.06,0,'camino',recinto);
 // Anillo de celdas, dos pisos; las puertas son huecos geométricos.
 for(let i=0;i<24;i++){
  const a=i*2*Math.PI/24;const g=grupo(14.8*Math.sin(a),0,14.8*Math.cos(a),a+Math.PI,recinto);
  muro(3.96,7.1,.6,[{x:0,w:.9,h:2.1,y:.15,mat:'madera'},{x:0,w:.9,h:2.1,y:3.8,mat:'madera'}],g);
  const wall=grupo(0,0,0,a,recinto);caja(.35,7.1,3.9,0,3.55,16.6,'cal',wall);
 }
 anillo(11.8,14.9,3.5,.2,'madera',recinto);anillo(11.8,12,4.5,.1,'madera',recinto);
 // Pasarela abierta con baranda, no fachada exterior acristalada.
 for(let i=0;i<48;i++){const a=i*Math.PI/24;cilindro(.06,.06,1,11.8*Math.sin(a),4.1,11.8*Math.cos(a),'madera',recinto);}
 for(const x of [-18.5,18.5])caja(.7,7.4,37.7,x,3.7,0,'cal',recinto);
 for(const z of [-18.5,18.5])caja(37.7,7.4,.7,0,3.7,z,'cal',recinto);
 t.techoAnular(14.2,18.5,7.6,8.4,cubierta,'teja');
 }
 const f=grupo(0,0,23);muro(75.7,4.7,.6,[{x:28,w:1.6,h:2.8,y:.08,reja:true,rect:true},...[-33,-27,-21,-15,-9,-3,3,9,15,21,34].map(x=>({x,w:.8,h:1.4,y:2.2,reja:true,rect:true}))],f);
 for(const side of [-1,1])caja(.6,4.7,4.5,side*37.5,2.35,20.7,'cal');tejado(76.2,5.6,4.7,0,20.7);
 // Garita saliente de la fotografía, sobre el cuerpo de acceso.
 cilindro(1.35,.65,1.2,28,4.6,23.5,'cal');cilindro(1.35,1.35,3.2,28,6.8,23.5,'cal');
 for(const dx of [-.7,0,.7])caja(.18,.8,.08,28+dx,7.1,24.7,'sombra');
 const cap=pieza(new T.SphereGeometry(1.4,20,10,0,2*Math.PI,0,Math.PI/2),'teja',28,8.4,23.5,techo);cap.scale.y=.55;
 cilindro(.06,.12,.7,28,9.3,23.5,'hierro',techo);
}
export function crearRotundaConcordia(tipo){
 const edificio=new T.Group(),cubiertas=new T.Group();edificio.add(cubiertas);
 const t=taller(edificio,cubiertas,'ciudad'),meta={};
 if(tipo==='rotunda')rotunda(t,cubiertas,meta);
 else if(tipo==='concordia')construirConcordia(t,cubiertas,meta);
 else if(tipo==='solar')t.caja(44,.08,124,0,.04,0,'verde');
 else throw new RangeError('Estado de Rotunda desconocido');
 t.cerrar();return {edificio,cubiertas};
}
