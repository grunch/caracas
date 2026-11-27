import {CONTORNO_HIJOS,DIVISIONES_HIJOS} from '../hijos-dios-planta.js'
const marco={"x": 8620, "y": 3670, "eje": [0.9363291775690445, 0.3511234415883917]}
const pixel=([a,b])=>[marco.x+2*(a*marco.eje[0]-b*marco.eje[1]),marco.y+2*(a*marco.eje[1]+b*marco.eje[0])]
const recinto=[CONTORNO_HIJOS.map(pixel)]
const segmentos=CONTORNO_HIJOS.slice(0,-1).map((a,i)=>[a,CONTORNO_HIJOS[i+1]])
segmentos.push([CONTORNO_HIJOS.at(-1),[8,CONTORNO_HIJOS.at(-1)[1]]],[[4,CONTORNO_HIJOS[0][1]],CONTORNO_HIJOS[0]],...DIVISIONES_HIJOS)
const planta=segmentos.map(([a,b])=>{
 const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),nx=-dz/l*.325,nz=dx/l*.325
 return [[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]].map(pixel)
})
export const hijosDios=Object.freeze({id:'hijos-de-dios',nombre:'Cementerio de los Hijos de Dios',...marco,nace:3,muere:0,
 planta,sueloPropio:recinto,suprime:recinto,sinArboles:recinto,solarCompleto:true,partes:[{tipo:'hijos-de-dios'}],
 fuente:'DCN1936, Razetti1889 y plano de fotos1946. https://contexturas.org/el-cementerio-de-los-hijos-de-dios/; https://fundaayc.com/2018/02/09/1951-desaparece-el-cementerio-de-los-hijos-de-dios/',
 verificar:['Abierto1856, clausurado antes de1889; recinto todavía en pie en1946. Las marcas y fichas anteriores ya documentaban esta vida.',
 'Tres campos contiguos y entrante noreste cotejados1936/1946. Contorno1936 aproximado, no mensura catastral. Proporciones1889 difieren: se conserva topología y se declara aproximación, sin inventar reforma.',
 'Cuatro hileras de nichos según fotos; altura5.5m, espesores, entrada4m, sepulturas y vegetación interpretativos. Sin capilla independiente no documentada. Fotografías consultadas, no redistribuidas.'],
})
