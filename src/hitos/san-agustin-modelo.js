import {Group} from 'three'
import {taller} from './nuevo-circo-geometria.js'
import {construirSanAgustin} from './san-agustin-constructor.js'
/** Estudio Miraflores: alturas IPC; planta aproximada del contorno DCN1936. */
export function crearSanAgustin(){
 const edificio=new Group(),cubiertas=new Group();edificio.add(cubiertas)
 const t=taller(edificio,cubiertas,'ciudad');construirSanAgustin(t,cubiertas,edificio.userData);t.cerrar();return edificio
}
