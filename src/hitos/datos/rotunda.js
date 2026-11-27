import {rectanguloPx} from './marco.js'
// Cárcel 39 y Cuartel 40 separados en Razetti 1911. Frente occidental hacia Sur 2.
const carcel={x:8588,y:8504,eje:[-.2,.98]}
const plaza={x:8595,y:8478,eje:[.98,.2]}
const pCarcel=[rectanguloPx(carcel,77,46,0,3)],pPlaza=[rectanguloPx(plaza,44,124)]
const fuente='Razetti 1911 y DCN 1936; plano DCN basado en fotos 1946 (edición catalogada 1950?). https://bibliofep.fundacionempresaspolar.org/dhv/entradas/l/la-rotunda/; https://mariafsigillo.blogspot.com/2012/02/la-rotunda-y-plaza-de-la-concordia.html'
export const rotundaYConcordia=Object.freeze([
 {id:'rotunda',nombre:'La Rotunda',...carcel,nace:3,muere:5,planta:pCarcel,suprime:pCarcel,sinArboles:pCarcel,solarCompleto:true,
 partes:[{tipo:'conjunto-rotunda',estado:'rotunda'}],fuente,
 verificar:['Dos recintos norte/sur; patio nominal 24m según Polar. Ampliación proyectada 1881, fecha exacta de terminación no verificada; presencia 1889 interpretativa.','Huella y orientación aproximadas del solar de cárcel 39 en 1911; no ocupa Cuartel 40 al norte ni inmueble oriental. Alturas, guardia y pigmentos interpretativos.']},
 {id:'solar-rotunda',nombre:'Solar de La Rotunda',...plaza,nace:5,muere:6,planta:pPlaza,suprime:pPlaza,transitable:true,solarCompleto:true,
 partes:[{tipo:'conjunto-rotunda',estado:'solar'}],fuente,
 verificar:['El plano DCN 1936 representa la franja occidental libre. Se conserva ese estado cartográfico, sin reconstruir escombros ni adelantar el templete.','Decreto atribuido a 2enero 1936 y resoluciónMOPabril 1936 son actos distintos; no se infiere un día de demolición. Suelo verde convencional del visor, no evidencia botánica.']},
 {id:'concordia',nombre:'Plaza La Concordia',...plaza,nace:6,muere:0,
 planta:[rectanguloPx(plaza,16.6,16.6,2,-7)],suprime:pPlaza,sinArboles:pPlaza,solarCompleto:true,
 terraza:{ancho:44,fondo:124},partes:[{tipo:'conjunto-rotunda',estado:'concordia'}],fuente,
 verificar:['Jardín y posición del templete cotejados en el plano de fotos 1946; fuente catalogada 1950?. Pilares exteriores y columnas interiores según fotos históricas.','Plaza de Villanueva fechada 1940 por Polar. Dimensiones, ocho soportes de cada orden, bancos y vegetación interpretativos. No se usa la remodelación 1961 ni la plaza actual.']},
])
