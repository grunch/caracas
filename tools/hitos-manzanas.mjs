#!/usr/bin/env node
// La regla «ningún hito sobre una manzana» (specs/13, R13) para los pasos de retiro, y la tabla que la mide.
// Uso: node tools/hitos-manzanas.mjs   → docs/manzanas-hitos.json (la tabla hito × época × manzana completa), desde los
//   informes de fuentes/derivados/retiro<año>/ (las manzanas que quedaron y las que cada época retiró); por la salida
//   estándar, en Markdown, las filas que no son «chico, se conserva» (las de docs/manzanas-hitos.md).
import {readFile,writeFile} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {hitosConPlanta} from '../src/hitos/plantas.js'
import EPOCAS_RETIRO from '../src/manzanas/epocas-retiro.json' with {type:'json'}
import {paraMedir,separarRetiradas,tablaMd} from './hitos-manzanas-lib.mjs'

const PY=process.env.PY??new URL('../.venv/bin/python',import.meta.url).pathname
const SCRIPT=new URL('./geo/hitos_manzanas.py',import.meta.url).pathname

/** { filas, decisiones } de tools/geo/hitos_manzanas.py para las manzanas candidatas de una época. */
export function medirHitos(manzanas,epoca,metro,hitos=hitosConPlanta()){
 const r=spawnSync(PY,[SCRIPT],{input:JSON.stringify({manzanas:paraMedir(manzanas),hitos,epoca,metro}),encoding:'utf8',maxBuffer:256*1024*1024})
 if(r.error||r.status!==0)throw new Error(r.error?.message??r.stderr)
 return JSON.parse(r.stdout)
}

/** Las manzanas que quedan en la época y el registro de las que un hito retira enteras. */
export function retirarPorHitos(manzanas,epoca,metro){
 return separarRetiradas(manzanas,medirHitos(manzanas,epoca,metro).decisiones,epoca)
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const leer=async p=>JSON.parse(await readFile(p,'utf8'))
 const {metro}=await leer('fuentes/derivados/1936/mosaico.json')
 const epocas=[]
 for(const [k,año] of EPOCAS_RETIRO.entries()){
  const informe=await leer(`fuentes/derivados/retiro${año}/manzanas-${año}-informe.json`)
  const retiradas=informe.retiradasPorHito??[]
  const {filas}=medirHitos([...informe.manzanas,...retiradas],k+1,metro)
  epocas.push({año,epoca:k+1,manzanas:informe.manzanas.length,retiradas:retiradas.map(({id,hitos,ocupacion,motivo,areaM2})=>({id,hitos,ocupacion,motivo,areaM2})),filas})
  console.error(`  ${año}: ${filas.length} cruces, ${retiradas.length} manzanas retiradas`)
 }
 const filas=epocas.flatMap(e=>e.filas)
 const redondear=v=>typeof v==='number'?Math.round(v*1e4)/1e4:v
 const salida={regla:'specs/13-reglas-de-construccion.md, R13',umbrales:{ocupaBuenaParte:.5,cabe:.75,roce:.1},
  epocas:epocas.map(e=>({...e,retiradas:e.retiradas.map(r=>Object.fromEntries(Object.entries(r).map(([c,v])=>[c,redondear(v)]))),filas:e.filas.map(f=>Object.fromEntries(Object.entries(f).map(([c,v])=>[c,redondear(v)])))}))}
 await writeFile('docs/manzanas-hitos.json',JSON.stringify(salida,null,1)+'\n')
 console.log(tablaMd(filas.filter(f=>f.clase!=='chico'||f.decision==='retirar')))
}
