#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {casasDeManzana} from './manzanas-1772-lib.mjs'
import {integrarManzanasEpoca} from './manzanas-1843-lib.mjs'
import {espacial,techosDeHitos} from './manzanas-completas.mjs'
import {arbolesParaManzanas} from './manzanas-arboles-lib.mjs'
import {codificarArboles} from './arboles-lib.mjs'
const [añoTxt,anterior,salida]=process.argv.slice(2),año=Number(añoTxt),epoca=[1772,1843,1889].indexOf(año)+1
if(![2,3].includes(epoca)||!anterior||!salida)throw Error('Uso: retiro-manzanas-epoca.mjs <1843|1889> carpeta-anterior carpeta-salida')
const leer=async p=>JSON.parse(await readFile(p,'utf8'))
const previo=[1772,1843][epoca-2]
const [datos,heredado,base,meta]=await Promise.all([leer(`${anterior}/ciudad.json`),leer(`${anterior}/manzanas-${previo}-informe.json`),leer(`fuentes/derivados/epocas/manzanas-${año}-informe.json`),leer('fuentes/derivados/1936/mosaico.json')])
const ids=new Set(heredado.manzanas.map(m=>m.id)),nuevas=base.manzanas.filter(m=>!ids.has(m.id))
const r=spawnSync(process.env.PY??'.venv/bin/python',['tools/geo/retiro_manzanas.py'],{input:JSON.stringify({manzanas:nuevas,metros:1,metro:meta.metro}),encoding:'utf8',maxBuffer:128*1024*1024})
if(r.error||r.status!==0)throw Error(r.error?.message??r.stderr)
let manzanas=JSON.parse(r.stdout)
for(const m of manzanas)m.casas=casasDeManzana(m,{metro:meta.metro})
manzanas=espacial('recortar',{manzanas,obstaculosHitos:techosDeHitos(meta,epoca),metro:meta.metro})
const {ciudad,informe}=integrarManzanasEpoca(datos,manzanas,epoca)
const completas=[...heredado.manzanas,...informe.manzanas].map(m=>({...m,arboles:m.arboles.map(a=>({...a,nace:epoca,muere:epoca+1}))}))
const porId=new Map(completas.map(m=>[m.id,m])),bytes=await readFile(`${anterior}/arboles.bin`),arboles=[]
for(let o=0;o<bytes.length;o+=8){const v=bytes.readUInt16LE(o+6);arboles.push({x:bytes.readUInt16LE(o),y:bytes.readUInt16LE(o+2),r:bytes.readUInt16LE(o+4)/10/meta.metro,nace:v&7,muere:(v>>3)&7,silvestre:!!(v&64)})}
const arbolesNuevos=arbolesParaManzanas(arboles,[],base.manzanas.map(m=>({...m,arboles:porId.get(m.id).arboles})),{epoca})
await mkdir(salida,{recursive:true})
const guardar=(nombre,d)=>writeFile(`${salida}/${nombre}`,JSON.stringify(d))
await guardar('ciudad.json',ciudad)
await guardar(`manzanas-${año}-informe.json`,{...informe,manzanas:completas,propuestaVisual:true,retiroSolicitadoM:1})
await writeFile(`${salida}/arboles.bin`,codificarArboles(arbolesNuevos,meta.metro))
const resumen={año,manzanas:completas.length,heredadas:heredado.manzanas.length,nuevas:manzanas.length,excepciones:completas.filter(m=>m.limiteRetiro).map(m=>m.id),casasHeredadas:informe.casasHeredadas,casasNuevas:informe.casasNuevas}
await guardar('resumen.json',resumen);console.log(resumen)
