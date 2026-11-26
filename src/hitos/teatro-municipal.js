import {crearTeatroMunicipal} from './teatro-municipal-modelo.js'
import {MAT} from './lienzo.js'

/** +X este y +Z sur, en el mismo marco del damero que su planta. */
export function teatroMunicipal(p,{anio=1889}={}){
  const {edificio}=crearTeatroMunicipal({anio,nivelDetalle:'ciudad'})
  const geometrias=new Set(),materiales=new Set()
  edificio.updateMatrixWorld(true)
  try{
    edificio.traverse(o=>{
      if(!o.isMesh)return
      geometrias.add(o.geometry);materiales.add(o.material)
      p.geo(o.geometry.clone().applyMatrix4(o.matrixWorld),{color:o.material.color.toArray(),mat:MAT.LISO})
    })
  }finally{
    geometrias.forEach(g=>g.dispose());materiales.forEach(m=>m.dispose())
  }
}
