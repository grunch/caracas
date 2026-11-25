import {spawnSync} from 'node:child_process'
import {crearCoords} from '../src/coords.js'
import {HITOS,construirHitos} from '../src/hitos.js'
import {casasDeManzana,cantidadPorDistancia} from './manzanas-1772-lib.mjs'
import {areaConSigno} from '../src/poligono.js'
const PY=process.env.PY??new URL('../.venv/bin/python',import.meta.url).pathname
const SCRIPT=new URL('./geo/manzanas_completas.py',import.meta.url).pathname
export function espacial(modo,entrada,archivo){
 const r=spawnSync(PY,[SCRIPT,modo,...(archivo?[archivo]:[])],{input:JSON.stringify(entrada),encoding:'utf8',maxBuffer:128*1024*1024})
 if(r.error||r.status!==0)throw new Error(r.error?.message??r.stderr)
 return JSON.parse(r.stdout)
}
export function techosDeHitos(meta,epoca=1){
 const coords=crearCoords(meta),g=construirHitos(HITOS,coords),poligonos=[]
 for(let i=0;i<g.indices.length;i+=3){
  const k=g.indices[i],n=g.vidas[k*2],f=g.vidas[k*2+1]
  if(n>epoca||f&&f<=epoca||g.normales[k*3+1]<.2)continue
  const [r,v,b]=g.colores.slice(k*3,k*3+3)
  if(v>r*1.05&&v>b*1.1)continue // vegetación del propio modelo: no es un tejado
  const ks=Array.from(g.indices.slice(i,i+3));if(ks.every(j=>g.posiciones[j*3+1]<2))continue
  const p=ks.map(j=>{const q=coords.aPixel(g.posiciones[j*3],g.posiciones[j*3+2]);return[q.px,q.py]})
  if(Math.abs(areaConSigno(p))>.01)poligonos.push(p)
 }
 return poligonos
}
export function completarManzanas1772(archivo,seleccion,hitos,meta){
 const r=espacial('completar',{seleccion,hitos,metro:meta.metro},archivo)
 for(const m of r.manzanas){
  const c=[0,1].map(k=>m.poligono.reduce((s,p)=>s+p[k],0)/4)
  m.distancia??=Math.hypot(c[0]-meta.plaza[0],c[1]-meta.plaza[1])*meta.metro
  m.cantidadCasas??=Math.max(1,Math.min(48,Math.round(cantidadPorDistancia(m.distancia,m.id)*Math.sqrt(m.areaM2/9216))))
  m.semilla??=`1772-${m.id}`
  m.casas=casasDeManzana(m,{metro:meta.metro})
 }
 const manzanas=espacial('recortar',{manzanas:r.manzanas,obstaculosHitos:techosDeHitos(meta),metro:meta.metro})
 return {...r,manzanas}
}
