import {crearNuevoCirco} from './nuevo-circo-modelo.js'
import {MAT} from './lienzo.js'
export function nuevoCirco(p){
 const {edificio}=crearNuevoCirco(),geometrias=new Set(),materiales=new Set();edificio.updateMatrixWorld(true)
 try{edificio.traverse(o=>{if(!o.isMesh)return;geometrias.add(o.geometry);materiales.add(o.material);p.geo(o.geometry.clone().applyMatrix4(o.matrixWorld),{color:o.material.color.toArray(),mat:MAT.LISO})})}
 finally{geometrias.forEach(g=>g.dispose());materiales.forEach(m=>m.dispose())}
}
