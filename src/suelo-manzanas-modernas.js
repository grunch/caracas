import {Vector3,Vector4} from 'three'
import epocas from './manzanas/epocas-completas.json'
import {SIN_MANZANAS,DIST_MAX_M,BANDA_CALLE_M} from './shader/suelo-manzanas.js'
import {rectDeCalles} from './calles-epoca.js'

export const uniformsManzanasModernas=()=>({
 uManzanasModernas:{value:SIN_MANZANAS},uManzanasModernasRect:{value:new Vector4(0,0,1,1)},uManzanasModernasCanales:{value:new Vector3()},
})
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
export const GLSL_MANZANAS_MODERNAS=/* glsl */`
 uniform sampler2D uManzanasModernas;
 uniform vec4 uManzanasModernasRect;
 uniform vec3 uManzanasModernasCanales;
 vec3 modernasRigen(float epoca) {
   return uManzanasModernasCanales * (1.0 - smoothstep(0.25, 0.5, abs(vec3(epoca) - vec3(4.0,5.0,6.0))));
 }
 float modernasActivas(float epoca) { return dot(modernasRigen(epoca),vec3(1.0)); }
 float verdeModernoEn(vec2 hoja,float epoca,float px) {
   vec3 canales=modernasRigen(epoca);
   if(dot(canales,vec3(1.0))<0.001)return 0.0;
   vec2 local=(hoja-uManzanasModernasRect.xy)/(uManzanasModernasRect.zw-uManzanasModernasRect.xy);
   float adentro=step(0.0,local.x)*step(local.x,1.0)*step(0.0,local.y)*step(local.y,1.0);
   vec3 d=(texture2D(uManzanasModernas,vec2(local.x,1.0-local.y)).rgb-0.5)*${(2*DIST_MAX_M).toFixed(1)};
   float filo=clamp(px,0.25,4.0);
   vec3 verde=max(smoothstep(-filo,filo,d),smoothstep(${BANDA_CALLE_M.toFixed(1)}-filo,${BANDA_CALLE_M.toFixed(1)}+filo,-d));
   return dot(canales,mix(vec3(1.0),verde,adentro));
 }`
