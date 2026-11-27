import {Group} from 'three'
import {taller} from './nuevo-circo-geometria.js'
import {construirHijosDios} from './hijos-dios-constructor.js'
/** Estudio Miraflores: tres campos y contorno aproximado DCN1936. */
export function crearHijosDios(){
 const edificio=new Group(),cubiertas=new Group();edificio.add(cubiertas)
 const t=taller(edificio,cubiertas,'ciudad');construirHijosDios(t,cubiertas,edificio.userData);t.cerrar();return edificio
}
