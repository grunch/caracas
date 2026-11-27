import {rectanguloPx} from './marco.js'
// Contorno DCN1936: (9735,8710),(9797,8720),(9780,8845),(9714,8833).
// Frente +Z hacia Este14 al sur. Centro del volumen desplazado respecto al recinto por las escaleras.
const marco={x:9757.2,y:8773.1,eje:[.983,.182]}
const recinto=[rectanguloPx(marco,32,63,0,2)]
export const sanAgustin=Object.freeze({
 id:'san-agustin',nombre:'Iglesia de San Agustín',...marco,nace:5,muere:0,
 planta:recinto,suprime:recinto,sinArboles:recinto,solarCompleto:true,
 partes:[{tipo:'san-agustin'}],
 fuente:'IPC, Lo construido, tomo2, pp.216–217: https://albaciudad.org/wp-content/uploads/2017/01/Libertador-Construido2.pdf; contorno DCN1936 y plano de fotos1946; FAC: https://fundaayc.com/2015/01/08/1930%E2%80%A2-iglesia-san-agustin-santa-rosalia/',
 verificar:['1924–1930, Alejandro Chataing; torre32m y cúpula24m segúnIPC. No confundir fecha del hecho con fecha de fotografía.','Envolvente32×63m aproximada del dibujo, no mensura catastral ni certeza de todos los muros. Frente sur inferido de Este14 y eje longitudinal. Colegio norte y casa cural oeste fuera de reserva.','Materiales, vanos, alturas nominales de naves9/18m y detalles interpretativos. Misma geometría1936/1946 sin reforma demostrada; no se añade avenida FuerzasArmadas posterior.'],
})
