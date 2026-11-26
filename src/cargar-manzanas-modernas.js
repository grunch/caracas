import epocas from './manzanas/epocas-completas.json'
import {DIST_MAX_M,BANDA_CALLE_M} from './manzanas/medidas-suelo.js'
import {rectDeCalles} from './rect-de-calles.js'

export function ponerManzanasModernas(U,meta,textura,plano){
 if(meta.dist_max_m!==DIST_MAX_M||meta.banda_calle_m!==BANDA_CALLE_M)throw Error('suelo moderno: medidas incompatibles')
 if(!Array.isArray(meta.canales)||meta.canales.some((a,k)=>a!==[1911,1936,1946][k]))throw Error('suelo moderno: canales incompatibles')
 const rect=rectDeCalles(meta,plano)
 U.uManzanasModernas.value=textura
 U.uManzanasModernasRect.value.fromArray(rect)
 U.uManzanasModernasCanales.value.fromArray([1911,1936,1946].map(a=>Number(epocas.includes(a)&&meta.canales.includes(a))))
}
export async function cargarManzanasModernas({U,plano,cargar}){
 const r=await fetch('datos/suelo-manzanas-modernas.json')
 if(!r.ok||(r.headers.get('content-type')??'').includes('html'))throw Error('falta suelo-manzanas-modernas.json')
 const meta=await r.json();rectDeCalles(meta,plano)
 ponerManzanasModernas(U,meta,await cargar(meta.imagen),plano)
}
