import {PLATAFORMA_NUEVO_CIRCO} from '../nuevo-circo-medidas.js'
import {METRO,rectanguloPx} from './marco.js'
// Mosaico DCN 1936: ruedo (10316,8234), portada al NO. Error visual estimado ±3 m.
const marco={x:10316,y:8234,eje:[-.83,.56]}
const n=Math.hypot(...marco.eje),[ux,uy]=marco.eje.map(v=>v/n)
const punto=(a,b)=>[marco.x+(a*ux-b*uy)/METRO,marco.y+(a*uy+b*ux)/METRO]
const circulo=r=>Array.from({length:64},(_,i)=>punto(r*Math.cos(i*Math.PI/32),r*Math.sin(i*Math.PI/32)))
// Corona construida: el ruedo queda abierto también para las colisiones.
const exterior=circulo(44),interior=circulo(26.4)
const corona=exterior.map((p,i)=>[p,exterior[(i+1)%64],interior[(i+1)%64],interior[i]])
const portada=rectanguloPx(marco,88,13,0,40)
export const nuevoCirco=Object.freeze({
 id:'nuevo-circo',nombre:'Nuevo Circo',...marco,nace:5,muere:0,
 planta:[...corona,portada],suprime:[exterior,portada],sinArboles:[exterior,portada],
 fuente:'DCN 1936, mosaico (0,5 m/px), recorte 9900,7900–10700,8500; inauguración 26-01-1919: https://camaradecaracas.com/la-camara-caracas-y-sus-historias/cronicas-de-la-ciudad/el-nuevo-circo-de-caracas/; fachada histórica: https://fundaayc.com/category/crono-arquitectura-venezuela/1910-1919/1919/',
 verificar:['Centro, diámetro exterior (~88–94 m) y portada NO contrastados con DCN 1936; lectura visual ±3 m, no levantamiento.','Alturas, gradas, pigmentos y ornamentos interpretativos del estudio Miraflores. Se conserva el ruedo abierto.','1936/1946 comparten modelo sin inventar reformas. Solar contrastado a ojo con el plano de 1946: centro a unos 4 m, dentro del error del calce (máximo 5 m); diámetro leído de 91 a 98 m frente a 88–94 m en 1936, que solapan solo en parte, con un trazo de unos 3 m de grueso. No se infiere traslado ni reforma (docs/nuevo-circo-integracion.md).'],
 // Plataforma dentro del solar: incluye la portada para no enterrar los accesos.
 terraza:PLATAFORMA_NUEVO_CIRCO,
 solarCompleto:true,
 partes:[{tipo:'nuevoCirco'}],
})
