import {BufferGeometry,Float32BufferAttribute,Vector3} from 'three'
import {crearHijosDios} from './hijos-dios-modelo.js'
import {MAT} from './lienzo.js'
// Una cara larga solo toma la altura de sus esquinas. Subdividir evita que el
// terreno atraviese los campos y muros entre ellas, sin terraza rectangular.
export function subdividirRecinto(geo,paso=4){
 const original=geo.index?geo.toNonIndexed():geo,ps=[],ns=[]
 const p=original.attributes.position,n=original.attributes.normal
 const mitad=(a,b)=>({p:a.p.clone().add(b.p).multiplyScalar(.5),n:a.n.clone().add(b.n).normalize()})
 function triangulo(a,b,c){
  const lados=[a.p.distanceToSquared(b.p),b.p.distanceToSquared(c.p),c.p.distanceToSquared(a.p)]
  const mayor=Math.max(...lados)
  const limite=paso
  if(mayor>limite*limite){
   if(mayor===lados[0]){const m=mitad(a,b);triangulo(a,m,c);triangulo(m,b,c)}
   else if(mayor===lados[1]){const m=mitad(b,c);triangulo(a,b,m);triangulo(a,m,c)}
   else{const m=mitad(c,a);triangulo(a,b,m);triangulo(m,b,c)}
  }else for(const v of [a,b,c]){ps.push(...v.p.toArray());ns.push(...v.n.toArray())}
 }
 const vertice=i=>({p:new Vector3().fromBufferAttribute(p,i),n:new Vector3().fromBufferAttribute(n,i)})
 for(let i=0;i<p.count;i+=3)triangulo(vertice(i),vertice(i+1),vertice(i+2))
 if(original!==geo)original.dispose()
 return new BufferGeometry().setAttribute('position',new Float32BufferAttribute(ps,3)).setAttribute('normal',new Float32BufferAttribute(ns,3))
}
export function hijosDios(p){
 const edificio=crearHijosDios(),geos=new Set(),mats=new Set();edificio.updateMatrixWorld(true)
 try{edificio.traverse(o=>{if(!o.isMesh)return;geos.add(o.geometry);mats.add(o.material)
  const g=o.geometry.clone().applyMatrix4(o.matrixWorld),sub=subdividirRecinto(g);g.dispose()
  p.sobreTerreno().geo(sub,{color:o.material.color.toArray(),mat:MAT.LISO,flota:true})
 })}finally{geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose())}
}
