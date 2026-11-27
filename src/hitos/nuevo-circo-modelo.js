import * as T from 'three';
import {taller} from './nuevo-circo-geometria.js';
function nuevoCirco(t,techo,meta){
 const {caja,cilindro,grupo,muro,anillo,techoAnular,pieza,vano,cornisa,reja}=t;
 meta.ruedoAbierto=true;meta.torres=2;
 cilindro(24,24,.14,0,.07,0,'arena');anillo(24,24.3,0,1.4,'ocre');
 for(let i=0;i<21;i++)anillo(24.5+i*.65,25.15+i*.65,.3+i*.36,.3,'piedra');
 anillo(39,39.65,0,9.4,'ocre');anillo(39.1,40,9.3,.4,'claro');
 for(let i=0;i<48;i++){
  const a=i*Math.PI/24;const g=grupo(39.6*Math.sin(a),0,39.6*Math.cos(a),a);vano(1.3,3.2,0,2.5,.08,g,'sombra',true);caja(.45,9.6,.65,1.8,4.8,0,'claro',g);
 }
 // Cubierta solo sobre la grada alta; el proyecto de cubrir el ruedo no se materializó.
 techoAnular(34.5,40,11,12);
 for(let i=0;i<40;i++){const a=i*Math.PI/20;cilindro(.11,.11,3.7,34.5*Math.sin(a),9.2,34.5*Math.cos(a),'hierro');}
 const f=grupo(0,0,40);
 muro(30,13,.7,[{x:-9,w:3.8,h:4.4,y:.12,reja:true,rect:true},{x:0,w:4.6,h:4.4,y:.12,reja:true,rect:true},{x:9,w:3.8,h:4.4,y:.12,reja:true,rect:true},{x:-9,w:3.8,h:4.4,y:7.2},{x:0,w:5.3,h:5.5,y:6.3,rect:true},{x:9,w:3.8,h:4.4,y:7.2}],f,'ocre');
 for(const x of [-14,-5,5,14]){caja(.6,13.8,1.2,x,6.9,.2,'claro',f);caja(1,.4,1.5,x,12.7,.2,'claro',f);}
 cornisa(31,5.3,.25,f);cornisa(31,13.1,.25,f);
 // Portada central arqueada, de dos órdenes, y antepechos calados.
 for(const r of [4.7,5.1])pieza(new T.TorusGeometry(r,.19,8,36,Math.PI),'claro',0,13.3,.25,f);
 caja(1.5,.35,1.2,0,18.6,.25,'claro',f);
 for(const x of [-9,0,9]){caja(5.4,.23,1.5,x,6.4,1,'claro',f);reja(5,1.1,x,6.5,1.6,f);}
 for(const sign of [-1,1]){
  const x=sign*17.8;const tower=grupo(x,0,0,0,f);
  muro(5.8,14.8,1,[{x:0,w:1.8,h:6,y:7}],tower,'ocre');
  for(const xx of [-2.8,2.8])caja(.55,15.2,4,xx,7.6,-1.3,'claro',tower);
  caja(6,.4,5.7,0,14.9,-1.5,'claro',tower);caja(6.6,.3,6.3,0,15.3,-1.5,'claro',tower);
  for(const xx of [-1.6,1.6])for(const zz of [-3.1,.1]){cilindro(.18,.23,4,xx,17.5,zz,'claro',tower);cilindro(.32,.32,.2,xx,19.55,zz,'claro',tower);}
  const roof=grupo(x,0,38.5,0,techo);caja(5.8,.35,5.8,0,19.8,0,'claro',roof);
  // Pequeñas cúpulas estriadas, no torres cónicas inventadas.
  const pts=[new T.Vector2(0,23),new T.Vector2(.2,22.4),new T.Vector2(1.1,21.9),new T.Vector2(1.9,21.3),new T.Vector2(2.1,20.6),new T.Vector2(1.9,20.1)];
  pieza(new T.LatheGeometry(pts.reverse(),32),'claro',0,0,0,roof);cilindro(.06,.1,1,0,23.45,0,'hierro',roof);
  for(const yy of [20.5,21.1])pieza(new T.TorusGeometry(yy===20.5?2:1.95,.09,6,32),'ocre',0,yy,0,roof).rotation.x=Math.PI/2;
  const side=grupo(sign*31,0,0,0,f);muro(17,7.5,.6,[{x:0,w:3.6,h:4.3,y:.1,reja:true}],side,'ocre');cornisa(17,7.7,0,side);
  pieza(new T.TorusGeometry(3.4,.2,8,24,Math.PI),'claro',0,8,.1,side);caja(8,.3,.8,0,8,.1,'claro',side);
 }
 for(const x of [-21,21])caja(.6,12,10,x,6,35,'ocre');caja(42,.35,8,0,13.4,36,'metal',techo);
}

export function crearNuevoCirco(){
 const edificio=new T.Group(),cubiertas=new T.Group(),metadatos={};edificio.add(cubiertas);
 const t=taller(edificio,cubiertas,'ciudad');nuevoCirco(t,cubiertas,metadatos);t.cerrar();
 edificio.scale.set(1.1,1,1.1);return {edificio,cubiertas,metadatos};
}
