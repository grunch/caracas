import {EJE_DAMERO, METRO, rectanguloPx} from './marco.js'

// Centro de la sala sobre la silueta rayada del DCN 1936. Frente norte hacia San Pablo.
const marco={x:8350,y:7697,eje:EJE_DAMERO}
const n=Math.hypot(...marco.eje),[ux,uy]=marco.eje.map(v=>v/n)
const elipse=(rx,rz,b)=>Array.from({length:48},(_,i)=>{
  const t=i*Math.PI/24,a=rx*Math.cos(t),z=b+rz*Math.sin(t)
  return [marco.x+(a*ux-z*uy)/METRO,marco.y+(a*uy+z*ux)/METRO]
})
// Huella para colisiones. La supresión incluye el resguardo inmediato del edificio, no toda la plazoleta.
const planta=[elipse(19,24,3),elipse(10.5,10.5,-28.2),rectanguloPx(marco,19.5,14,0,-21.2)]
export const teatroMunicipal=Object.freeze({
  id:'teatro-municipal',nombre:'Teatro Municipal',...marco,nace:3,muere:0,
  planta,sinArboles:planta,suprime:[rectanguloPx(marco,44,72,0,-5)],
  fuente:'DCN 1936, silueta rotulada Teatro Municipal; Fundarte (inauguración 1881): https://fundarte.gob.ve/web/2017/01/02/teatro-municipal-con-136-anos-de-historia/; foto de los años 1880 https://commons.wikimedia.org/wiki/File:Teatro_municipal3.gif; demolición del pórtico en 1949: https://fundaayc.com/2026/05/27/',
  verificar:[
    'Dimensiones nominales (~38 × 65 m, linterna ~24 m), sin levantamiento. Centro y orientación contrastados con la silueta del plano de 1936.',
    '1889, 1911 y 1936 comparten la envolvente anterior a 1949. La reforma de 1930 no justifica inventar un alzado exterior diferente.',
    'Pigmentos, caja escénica y pequeños ornamentos son interpretativos. Las postales coloreadas no certifican el color histórico.',
    'No se incluye la estatua ni se reconstruyen interiores. Referencias y límites en specs/08-teatro-municipal.md.',
  ],
  partes:[{tipo:'teatroMunicipal',anio:1889}],
})
