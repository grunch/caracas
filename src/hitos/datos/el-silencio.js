import {HUELLAS_SILENCIO} from './el-silencio-huellas.js'
import {EJE_DAMERO, METRO} from './marco.js'
const n=Math.hypot(...EJE_DAMERO),[ux,uy]=EJE_DAMERO.map(v=>v/n)
export const ORIGEN_SILENCIO=[7900,7400]
export const localSilencio=([x,y])=>[((x-7900)*ux+(y-7400)*uy)*METRO,(-(x-7900)*uy+(y-7400)*ux)*METRO]
export const pixelSilencio=([a,b])=>[7900+(a*ux-b*uy)/METRO,7400+(a*uy+b*ux)/METRO]
export function envolvente(puntos){
 const ps=[...puntos].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cruz=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const mitad=lista=>{const out=[];for(const p of lista){while(out.length>1&&cruz(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p)}return out.slice(0,-1)};
 return [...mitad(ps),...mitad([...ps].reverse())]
}
export const fuenteSilencio='Inauguración26-8-1945: https://entrerayas.com/a-66-anos-de-la-inauguracion-de-la-reurbanizacion-el-silencio/; emplazamiento © OpenStreetMap contributors https://www.openstreetmap.org/copyright (ODbL1.0); ajuste geo1936 RMS5.09m.'
const edificiosSilencio=HUELLAS_SILENCIO.filter(h=>!h.id.includes('patio')).map(h=>{
 const pts=h.px.slice(0,-1),x=pts.reduce((s,p)=>s+p[0],0)/pts.length,y=pts.reduce((s,p)=>s+p[1],0)/pts.length;
 const bloque=/^[1-7]$/.test(h.id),poligono=envolvente(pts);
 return {id:bloque?`silencio-bloque-${h.id}`:`silencio-plaza-${h.id.toLowerCase()}`,nombre:bloque?`El Silencio · bloque ${h.id}`:h.id==='Miranda'?'Plaza Miranda':'Plaza General Rafael Urdaneta (hoy O’Leary)',
  x,y,eje:EJE_DAMERO,nace:6,muere:0,planta:bloque?[poligono]:[],suprime:[poligono],sinArboles:[poligono],
  fuente:fuenteSilencio,verificar:['Huellas actuales como control de ubicación; alzados y distribución interna interpretativos. Ajuste cartográfico RMS5.09m; no precisión catastral.'],
  partes:[{tipo:'elSilencio',id:h.id}],
 }
})

// Renovación completa de los solares y sus calles interiores, no sólo las crujías techadas.
export const RECINTO_SILENCIO=envolvente(HUELLAS_SILENCIO.flatMap(h=>h.px));
export const silencio=Object.freeze([...edificiosSilencio,{
 id:'silencio-urbanizacion',nombre:'Reurbanización El Silencio',x:7900,y:7400,eje:EJE_DAMERO,nace:6,muere:0,
 planta:[],suprime:[RECINTO_SILENCIO],solarCompleto:true,sinArboles:[RECINTO_SILENCIO],
 fuente:fuenteSilencio,verificar:['Límite de sustitución: envolvente de las siete parcelas y las dos plazas.'],partes:[{tipo:'elSilencio',id:'suelo'}],
}])
