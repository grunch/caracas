#!/usr/bin/env node
// Piloto aislado: no ejecuta los integradores de épocas posteriores ni publica datos.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import path from 'node:path'
import {isDeepStrictEqual} from 'node:util'
import {casasDeManzana,integrarManzanas1772} from './manzanas-1772-lib.mjs'
import {espacial,techosDeHitos} from './manzanas-completas.mjs'
import {arbolesParaManzanas} from './manzanas-arboles-lib.mjs'
import {codificarArboles} from './arboles-lib.mjs'
const [entrada,arbolesEntrada,salida,distancia='1']=process.argv.slice(2)
if(!entrada||!arbolesEntrada||!salida)throw Error('Uso: node tools/retiro-manzanas-1772.mjs ciudad-final.json arboles.bin carpeta-salida [metros=1]')
const leer=async p=>JSON.parse(await readFile(p,'utf8'))
const [datos,base,meta]=await Promise.all([leer(entrada),leer('fuentes/derivados/epocas/manzanas-1772-informe.json'),leer('fuentes/derivados/1936/mosaico.json')])
const r=spawnSync(process.env.PY??'.venv/bin/python',['tools/geo/retiro_manzanas.py'],{input:JSON.stringify({manzanas:base.manzanas,metros:Number(distancia),metro:meta.metro}),encoding:'utf8',maxBuffer:128*1024*1024})
if(r.error||r.status!==0)throw Error(r.error?.message??r.stderr)
let manzanas=JSON.parse(r.stdout)
for(const m of manzanas)m.casas=casasDeManzana(m,{metro:meta.metro})
manzanas=espacial('recortar',{manzanas,obstaculosHitos:techosDeHitos(meta,1),metro:meta.metro})
const {ciudad,informe}=integrarManzanas1772(datos,manzanas,{metro:meta.metro,reemplazarTodo:true})
const bytes=await readFile(arbolesEntrada),arboles=[]
for(let o=0;o<bytes.length;o+=8){const vida=bytes.readUInt16LE(o+6);arboles.push({x:bytes.readUInt16LE(o),y:bytes.readUInt16LE(o+2),r:bytes.readUInt16LE(o+4)/10/meta.metro,nace:vida&7,muere:(vida>>3)&7,silvestre:!!(vida&64)})}
const zonas=base.manzanas.map((m,i)=>({...m,arboles:manzanas[i].arboles}))
const nuevos=arbolesParaManzanas(arboles,[],zonas)
await mkdir(salida,{recursive:true})
const versionados=await leer('src/manzanas/retiro-1772-piloto.json'),ids=Object.keys(versionados)
const guardar=(n,d)=>writeFile(path.join(salida,n),JSON.stringify(d))
const contornos=Object.fromEntries(manzanas.filter(m=>ids.includes(m.id)).map(m=>[m.id,[{vida:[1,2],poligono:m.poligono}]]))
await guardar('contornos-piloto.json',contornos)
if(Number(distancia)===1&&!isDeepStrictEqual(contornos,versionados))throw Error('Contornos de balcones desactualizados: revisar y copiar contornos-piloto.json a src/manzanas/retiro-1772-piloto.json antes de publicar.')
await guardar('ciudad.json',ciudad)
await guardar('manzanas-1772-informe.json',{...informe,propuestaVisual:true,retiroSolicitadoM:Number(distancia)})
await writeFile(path.join(salida,'arboles.bin'),codificarArboles(nuevos,meta.metro))
const resumen={retiroM:Number(distancia),ajustadas:manzanas.filter(m=>m.retiroAplicadoM>0).length,excepciones:manzanas.filter(m=>m.limiteRetiro).map(m=>({id:m.id,motivo:m.limiteRetiro})),casas:informe.casasNuevas}
await guardar('resumen.json',resumen);console.log(JSON.stringify(resumen,null,2))
