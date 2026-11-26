/** Capa experimental, cargada solo con ?detallecasas=1. Geometría fusionada por cuadra y nivel. */
import {BoxGeometry,Group,Mesh} from 'three'
import {lineal} from './hitos/lienzo.js'
import {geometriaHitos} from './hitos.js'
import {crearMaterialHitos,crearMaterialSombraHitos} from './hitos/material.js'
import {PILOTO_COLONIAL,extraerFrentes,piezasDeFrente,nivelDetalle} from './detalle-colonial-plan.js'

export function materialDeDetalles(U){
 const m=crearMaterialHitos({U})
 // Una casa toma el suelo de su centro, no la terraza ni el levante de 12 cm de un hito.
 m.vertexShader=m.vertexShader.replace('pisoDeHito(aAncla.xy, aAncla.zw, position.xz)','sueloEn(aAncla.xy)').replace('piso + 0.12 + position.y','piso + position.y')
 return m
}
export function geometriaDeDetalles(frentes,fino=false){
 const unidad=new BoxGeometry(1,1,1),p=unidad.attributes.position,n=unidad.attributes.normal,uv=unidad.attributes.uv
 const piezas=frentes.flatMap(f=>piezasDeFrente(f).filter(p=>p.fino===fino).map(p=>({f,p})))
 const cuantos=piezas.length*24,datos={posiciones:new Float32Array(cuantos*3),normales:new Float32Array(cuantos*3),colores:new Float32Array(cuantos*3),hitos:new Float32Array(cuantos*4),vidas:new Float32Array(cuantos*2),anclas:new Float32Array(cuantos*4),uvs:new Float32Array(cuantos*2),indices:new Uint32Array(piezas.length*36)}
 // Escribir las cajas directamente evita clonar y transformar miles de BufferGeometry al acercarse.
 piezas.forEach(({f,p:c},j)=>{
  const color=lineal(c.color),dist=Math.round(Math.hypot(...f.ancla))
  for(let i=0;i<24;i++){
   const k=j*24+i,x=c.x+p.getX(i)*c.w,z=c.z+p.getZ(i)*c.d
   datos.posiciones.set([f.origen[0]+f.eje[0]*x+f.normal[0]*z,c.y+p.getY(i)*c.h,f.origen[1]+f.eje[1]*x+f.normal[1]*z],k*3)
   datos.normales.set([f.eje[0]*n.getX(i)+f.normal[0]*n.getZ(i),n.getY(i),f.eje[1]*n.getX(i)+f.normal[1]*n.getZ(i)],k*3)
   datos.colores.set(color,k*3);datos.hitos.set([dist,f.semilla,0,0],k*4);datos.vidas.set(f.vida,k*2)
   datos.anclas.set([...f.ancla,...f.ancla],k*4);datos.uvs.set([uv.getX(i),uv.getY(i)],k*2)
  }
  for(let i=0;i<36;i++)datos.indices[j*36+i]=j*24+unidad.index.array[i]
 })
 unidad.dispose()
 return geometriaHitos(datos)
}
export function crearDetalleColonial({coords,U,liviano=false,manzanas=PILOTO_COLONIAL}){
 const grupo=new Group();grupo.name='Piloto de detalle colonial'
 const unidades=manzanas.map(m=>{
  const poligono=m.poligono.map(([x,y])=>{const p=coords.aMundo(x,y);return[p.x,p.z]})
  const centro=[0,1].map(k=>poligono.reduce((s,p)=>s+p[k],0)/4)
  const contornos=(m.contornos??[]).map(c=>({...c,poligono:c.poligono.map(([x,y])=>{const p=coords.aMundo(x,y);return[p.x,p.z]})}))
  return {...m,poligono,contornos,centro,radio:Math.max(...poligono.map(p=>Math.hypot(p[0]-centro[0],p[1]-centro[1]))),frentes:[],nivel:0,mallas:null}
 })
 const material=materialDeDetalles(U),sombra=crearMaterialSombraHitos(material);sombra.vertexShader=material.vertexShader
 let listo=false,creacionMs=0
 function construir(m){
  const inicio=performance.now()
  m.mallas=(liviano?[false]:[false,true]).map(fino=>{
   const mesh=new Mesh(geometriaDeDetalles(m.frentes,fino),material);mesh.name=`${m.id} · ${fino?'barrotes':'balcones y cornisas'}`
   mesh.castShadow=true;mesh.customDepthMaterial=sombra;mesh.frustumCulled=false;mesh.visible=false;grupo.add(mesh);return mesh
  })
  creacionMs+=performance.now()-inicio
 }
 return {
  grupo,
  agregar(paquete){
   const cercanas=unidades.filter(m=>!paquete.esfera||Math.hypot(paquete.esfera.centro[0]-m.centro[0],paquete.esfera.centro[2]-m.centro[1])<paquete.esfera.radio+m.radio+1)
   if(!cercanas.length)return
   for(const f of extraerFrentes(paquete,cercanas))unidades.find(m=>m.id===f.manzana).frentes.push(f)
  },
  finalizar(){listo=true},
  actualizar(camera,epocas,alturaEn=()=>0){
   if(!listo)return false
   let cambio=false
   for(const m of unidades){
    const y=alturaEn(...m.centro)+5,d=Math.max(0,Math.hypot(camera.position.x-m.centro[0],camera.position.y-y,camera.position.z-m.centro[1])-m.radio)
    const nivel=m.frentes.some(f=>epocas.some(e=>e>=f.vida[0]&&e<f.vida[1]))?nivelDetalle(d,m.nivel,liviano):0
    if(nivel===m.nivel)continue
    if(nivel&&!m.mallas)construir(m)
    m.nivel=nivel;cambio=true
    if(m.mallas){m.mallas[0].visible=nivel>0;if(m.mallas[1])m.mallas[1].visible=nivel===2}
   }
   return cambio
  },
  get vista(){
   const f=unidades.flatMap(m=>m.frentes).find(f=>f.pisos>1&&f.hasta-f.desde>8)
   if(!f)return null
   const u=(f.desde+f.hasta)/2
   return {x:f.origen[0]+f.eje[0]*u-f.normal[0]*5,z:f.origen[1]+f.eje[1]*u-f.normal[1]*5,dist:60,yaw:Math.atan2(f.normal[0],f.normal[1])+.25,pitch:.48}
  },
  get cuenta(){return {creacionMs,liviano,unidades:unidades.map(m=>({id:m.id,centro:m.centro,radio:m.radio,nivel:m.nivel,frentes:m.frentes.length,balcones:m.frentes.reduce((s,f)=>s+piezasDeFrente(f).filter(p=>p.tipo==='losa').length,0),triangulos:m.mallas?.reduce((s,o)=>s+(o.visible?o.geometry.index.count/3:0),0)??0})),mallas:grupo.children.filter(m=>m.visible).length}},
  liberar(){grupo.children.forEach(m=>m.geometry.dispose());grupo.clear();material.dispose();sombra.dispose()},
 }
}
