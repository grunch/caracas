#!/usr/bin/env node
// Sustituye solo la época pedida; hereda el modelo anterior sin volver a sortearlo ni encogerlo.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {hitosConPlanta} from '../src/hitos/plantas.js'
import {casasDeManzana,cantidadPorDistancia} from './manzanas-1772-lib.mjs'
import {integrarManzanasEpoca} from './manzanas-1843-lib.mjs'
import {espacial,techosDeHitos} from './manzanas-completas.mjs'
import {arbolesParaManzanas} from './manzanas-arboles-lib.mjs'
import {codificarArboles} from './arboles-lib.mjs'

const [añoTxt,anterior,salida]=process.argv.slice(2),año=Number(añoTxt)
const años=[1772,1843,1889,1911,1936,1946],epoca=años.indexOf(año)+1,previo=años[epoca-2]
if(![4,5,6].includes(epoca)||!anterior||!salida)throw Error('Uso: manzanas-modernas.mjs <1911|1936|1946> carpeta-anterior carpeta-salida')
const leer=async p=>JSON.parse(await readFile(p,'utf8'))
const [datos,heredado,meta]=await Promise.all([leer(`${anterior}/ciudad.json`),leer(`${anterior}/manzanas-${previo}-informe.json`),leer('fuentes/derivados/1936/mosaico.json')])
const r=spawnSync(process.env.PY??'.venv/bin/python',['tools/geo/manzanas_modernas.py'],{input:JSON.stringify({entrada:`${anterior}/ciudad.json`,heredadas:heredado.manzanas,hitos:hitosConPlanta(),epoca,metro:meta.metro}),encoding:'utf8',maxBuffer:128*1024*1024})
if(r.error||r.status!==0)throw Error(r.error?.message??r.stderr)
const seleccion=JSON.parse(r.stdout)
for(const m of seleccion.manzanas){
 const c=[0,1].map(k=>m.poligono.reduce((s,p)=>s+p[k],0)/4)
 m.distancia=Math.hypot(c[0]-meta.plaza[0],c[1]-meta.plaza[1])*meta.metro
 m.cantidadCasas=Math.max(1,Math.min(48,Math.round(cantidadPorDistancia(m.distancia,m.id)*Math.sqrt(m.areaM2/9216))))
 m.semilla=`${año}-${m.id}`;m.casas=casasDeManzana(m,{metro:meta.metro})
}
const nuevas=espacial('recortar',{manzanas:seleccion.manzanas,obstaculosHitos:techosDeHitos(meta,epoca),metro:meta.metro})
const {ciudad,informe}=integrarManzanasEpoca(datos,nuevas,epoca)
const completas=[...heredado.manzanas,...informe.manzanas].map(m=>({...m,arboles:m.arboles.map(a=>({...a,nace:epoca,muere:epoca===6?0:epoca+1}))}))
// Mantener también la vegetación de expansión de 1946 que queda fuera de los nuevos solares.
const archivosArboles=[`${anterior}/arboles.bin`,...(epoca===6?['fuentes/derivados/1946/arboles-base.bin']:[])],arboles=[]
for(const bytes of await Promise.all(archivosArboles.map(p=>readFile(p))))for(let o=0;o<bytes.length;o+=8){const v=bytes.readUInt16LE(o+6);arboles.push({x:bytes.readUInt16LE(o),y:bytes.readUInt16LE(o+2),r:bytes.readUInt16LE(o+4)/10/meta.metro,nace:v&7,muere:(v>>3)&7,silvestre:!!(v&64)})}
const arbolado=arbolesParaManzanas(arboles,[],completas,{epoca})
await mkdir(salida,{recursive:true})
const guardar=(n,d)=>writeFile(`${salida}/${n}`,JSON.stringify(d))
await guardar('ciudad.json',ciudad)
await guardar(`manzanas-${año}-informe.json`,{...informe,manzanas:completas,cobertura:seleccion.cobertura,descartadasTrasRetiro:seleccion.descartadasTrasRetiro??[],propuestaVisual:true,retiroSolicitadoM:1})
await writeFile(`${salida}/arboles.bin`,codificarArboles(arbolado,meta.metro))
if(epoca===6)await writeFile(`${salida}/arboles-1946.bin`,Buffer.alloc(0)) // incluidos una sola vez en arboles.bin
const resumen={año,manzanas:completas.length,heredadas:heredado.manzanas.length,nuevas:nuevas.length,casasHeredadas:informe.casasHeredadas,casasNuevas:informe.casasNuevas,casasSustituidas:informe.casasSustituidas}
await guardar('resumen.json',resumen);console.log(resumen)
