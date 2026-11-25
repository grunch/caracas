#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {hitosConPlanta} from '../src/hitos/plantas.js'
import {seleccionarManzanas1772,integrarManzanas1772} from './manzanas-1772-lib.mjs'
const [entrada,salida,informeSalida='fuentes/derivados/epocas/manzanas-1772-informe.json']=process.argv.slice(2)
if(!entrada||!salida)throw new Error('Uso: node tools/manzanas-1772.mjs entrada.json salida.json [informe.json]')
if(path.resolve(salida)===path.resolve(informeSalida))throw new Error('La ciudad y el informe no pueden ir a la misma ruta: el informe pisaría la ciudad.')
const leer=async p=>JSON.parse(await readFile(p,'utf8'))
const [datos,red,unidades,meta]=await Promise.all([leer(entrada),leer('tools/geo/referencias/1772-red.json'),leer('tools/geo/referencias/1772-unidades.json'),leer('fuentes/derivados/1936/mosaico.json')])
const seleccion=seleccionarManzanas1772({red,unidades:unidades.unidades,plaza:meta.plaza,metro:meta.metro,hitos:hitosConPlanta()})
const {ciudad,informe}=integrarManzanas1772(datos,seleccion.manzanas,{metro:meta.metro})
await writeFile(salida,JSON.stringify(ciudad));await writeFile(informeSalida,JSON.stringify({...informe,omitidas:seleccion.omitidas},null,2)+'\n')
console.log(JSON.stringify({seleccionadas:seleccion.manzanas.length,integradas:informe.manzanas.filter(m=>m.estado==='integrada').length,casasSustituidas:informe.casasSustituidas,casasNuevas:informe.casasNuevas}))
