import {crearSanAgustin} from './san-agustin-modelo.js'
import {MAT} from './lienzo.js'
export function sanAgustin(p){
 const edificio=crearSanAgustin(),geos=new Set(),mats=new Set();edificio.updateMatrixWorld(true)
 try{edificio.traverse(o=>{if(!o.isMesh)return;geos.add(o.geometry);mats.add(o.material);p.geo(o.geometry.clone().applyMatrix4(o.matrixWorld),{color:o.material.color.toArray(),mat:MAT.LISO})})}
 finally{geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose())}
}
