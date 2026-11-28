#!/usr/bin/env node
// La tabla hito × época × manzana de la regla «ningún hito sobre una manzana» (specs/13, R13).
// Uso: node tools/hitos-manzanas-tabla.mjs   → docs/manzanas-hitos.json (una fila por cruce, con las áreas, las fracciones
//   en los dos sentidos, la clase y la decisión), desde los informes de fuentes/derivados/retiro<año>/ (las manzanas
//   que quedaron y las que cada época retiró); por la salida estándar, en Markdown, las filas que no son «chico, se conserva».
import {readFile,writeFile} from 'node:fs/promises'
import EPOCAS_RETIRO from '../src/manzanas/epocas-retiro.json' with {type:'json'}
import {medirHitos} from './hitos-manzanas.mjs'
import {tablaMd} from './hitos-manzanas-lib.mjs'

const leer=async p=>JSON.parse(await readFile(p,'utf8'))
const redondear=o=>Object.fromEntries(Object.entries(o).map(([c,v])=>[c,typeof v==='number'?Math.round(v*1e4)/1e4:v]))
const {metro}=await leer('fuentes/derivados/1936/mosaico.json')
const epocas=[]
for(const [k,año] of EPOCAS_RETIRO.entries()){
 const informe=await leer(`fuentes/derivados/retiro${año}/manzanas-${año}-informe.json`)
 const retiradas=informe.retiradasPorHito??[]
 const {filas}=medirHitos([...informe.manzanas,...retiradas],k+1,metro)
 epocas.push({año,epoca:k+1,manzanas:informe.manzanas.length,retiradas:retiradas.map(({id,hitos,ocupacion,motivo,areaM2})=>redondear({id,hitos,ocupacion,motivo,areaM2})),filas:filas.map(redondear)})
 console.error(`  ${año}: ${filas.length} cruces, ${retiradas.length} manzanas retiradas`)
}
// una fila por línea: el archivo se lee y se compara sin abrir miles de líneas
const lineas=xs=>xs.length?`[\n${xs.map(x=>`   ${JSON.stringify(x)}`).join(',\n')}\n  ]`:'[]'
const cuerpo=epocas.map(e=>`  {"año":${e.año},"epoca":${e.epoca},"manzanas":${e.manzanas},\n  "retiradas":${lineas(e.retiradas)},\n  "filas":${lineas(e.filas)}}`).join(',\n')
await writeFile('docs/manzanas-hitos.json',`{"regla":"specs/13-reglas-de-construccion.md, R13","umbrales":{"ocupaBuenaParte":0.5,"cabe":0.75,"roce":0.1,"mayor":1.25},"epocas":[\n${cuerpo}\n]}\n`)
console.log(tablaMd(epocas.flatMap(e=>e.filas).filter(f=>f.clase!=='chico'||f.decision==='retirar')))
