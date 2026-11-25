#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import path from 'node:path'
import {hitosConPlanta} from '../src/hitos/plantas.js'
import {espacial,techosDeHitos} from './manzanas-completas.mjs'
import {casasDeManzana,cantidadPorDistancia} from './manzanas-1772-lib.mjs'
import {integrarManzanas1843} from './manzanas-1843-lib.mjs'
const [entrada,salida,informeSalida='fuentes/derivados/epocas/manzanas-1843-informe.json']=process.argv.slice(2)
if(!entrada||!salida)throw new Error('Uso: node tools/manzanas-1843.mjs ciudad-manzanas.json salida.json [informe.json]')
if(path.resolve(salida)===path.resolve(informeSalida))throw new Error('La ciudad y el informe no pueden ir a la misma ruta')
const leer=async p=>JSON.parse(await readFile(p,'utf8'))
const [datos,anterior,referencia,meta]=await Promise.all([leer(entrada),leer('fuentes/derivados/epocas/manzanas-1772-informe.json'),leer('tools/geo/referencias/1843-manzanas.json'),leer('fuentes/derivados/1936/mosaico.json')])
const heredadas=anterior.manzanas.filter(m=>m.estado==='integrada'),hitos=hitosConPlanta()
const r=spawnSync(process.env.PY??'.venv/bin/python',['tools/geo/ampliacion_manzanas.py'],{input:JSON.stringify({referencias:referencia.unidades,heredadas,hitos,metro:meta.metro}),encoding:'utf8',maxBuffer:32*1024*1024})
if(r.error||r.status!==0)throw new Error(r.error?.message??r.stderr)
const seleccion=JSON.parse(r.stdout)
for(const m of seleccion.manzanas){
 const c=[0,1].map(k=>m.poligono.reduce((s,p)=>s+p[k],0)/4)
 m.distancia=Math.hypot(c[0]-meta.plaza[0],c[1]-meta.plaza[1])*meta.metro
 m.cantidadCasas=Math.max(1,Math.min(48,Math.round(cantidadPorDistancia(m.distancia,m.id)*Math.sqrt(m.areaM2/9216))))
 m.semilla=`1843-${m.id}`;m.casas=casasDeManzana(m,{metro:meta.metro})
}
const nuevas=espacial('recortar',{manzanas:seleccion.manzanas,obstaculosHitos:techosDeHitos(meta,2),metro:meta.metro})
for(const m of nuevas)for(const a of m.arboles){a.nace=2;a.muere=3}
const {ciudad,informe}=integrarManzanas1843(datos,nuevas)
const mantenidas=heredadas.map(m=>({...m,origen:1772,arboles:m.arboles.map(a=>({...a,nace:2,muere:3}))}))
const completo={...informe,manzanas:[...mantenidas,...informe.manzanas],manzanasHeredadas:heredadas.length,manzanasNuevas:nuevas.length,cobertura:seleccion.cobertura}
await writeFile(salida,JSON.stringify(ciudad));await writeFile(informeSalida,JSON.stringify(completo,null,2)+'\n')
console.log(JSON.stringify({heredadas:heredadas.length,nuevas:nuevas.length,casasHeredadas:informe.casasHeredadas,casasNuevas:informe.casasNuevas,casasSustituidas:informe.casasSustituidas}))
