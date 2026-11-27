import {METRO,rectanguloPx} from './marco.js'
// DCN 1936, recorte 7500,7500–8350,8350. Ruedo y frente hacia calle Este-Oeste.
const marco={x:7909,y:7895,eje:[-.98,-.2]}
const n=Math.hypot(...marco.eje),[ux,uy]=marco.eje.map(v=>v/n)
const punto=(a,b)=>[marco.x+(a*ux-b*uy)/METRO,marco.y+(a*uy+b*ux)/METRO]
const circulo=r=>Array.from({length:64},(_,i)=>punto(r*Math.cos(i*Math.PI/32),r*Math.sin(i*Math.PI/32)))
const exterior=circulo(29),interior=circulo(18)
const corona=exterior.map((p,i)=>[p,exterior[(i+1)%64],interior[(i+1)%64],interior[i]])
const portada=rectanguloPx(marco,44.6,10.6,0,27)
export const metropolitano=Object.freeze({
 id:'circo-metropolitano',nombre:'Circo Metropolitano',...marco,nace:4,muere:6,
 planta:[...corona.filter((_,i)=>i!==15&&i!==16),rectanguloPx(marco,20.3,10.6,-12.15,27),rectanguloPx(marco,20.3,10.6,12.15,27)],suprime:[exterior,portada],sinArboles:[exterior,portada],solarCompleto:true,
 terraza:{ancho:58,fondo:66},partes:[{tipo:'metropolitano'}],
 fuente:'DCN 1936, mosaico 0,5 m/px; fachada y ruedo de 36 m: https://fundaayc.com/category/crono-arquitectura-venezuela/1940-1949/1945/',
 verificar:['El acceso axial al ruedo es una interpretación funcional: se abre la puerta central y un sector del graderío; no se dispone de una planta histórica de circulación interior.','Centro y orientación por lectura visual del plano 1936, error estimado ±3 m; huella nominal exterior 58 m.','Razetti 1911 confirma el símbolo anular en la misma cuadra; su centro esquemático difiere unos 22 m. Se conserva la huella detallada de 1936 sin inferir traslado ni ampliación. Alturas, colores y graderío interpretativos de Miraflores.','Apertura 2-02-1896. Las fuentes discrepan entre demolición en 1942/1945; ambas lo excluyen de 1946. No se reconstruye aquí el teatro posterior.'],
})
