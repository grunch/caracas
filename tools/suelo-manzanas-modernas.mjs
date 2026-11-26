#!/usr/bin/env node
// Segundo campo RGB: no modifica ni remuestrea los tres canales históricos.
import {readFile,writeFile} from 'node:fs/promises'
import sharp from 'sharp'
import epocas from '../src/manzanas/epocas-completas.json' with {type:'json'}
import {MARCAS} from '../src/marcas-datos.js'
import {HITOS} from '../src/hitos.js'
import {poligonosDeInforme,cajaDeManzanas,distanciaFirmada,plazasDeEpoca,despejarPlazas,codificar,metaSueloManzanas} from './suelo-manzanas-lib.mjs'
const leer=async p=>JSON.parse(await readFile(p,'utf8'))
const {metro}=await leer('fuentes/derivados/1936/mosaico.json')
const poligonos=await Promise.all(epocas.map(async a=>poligonosDeInforme(await leer(`fuentes/derivados/retiro${a}/manzanas-${a}-informe.json`))))
const caja=cajaDeManzanas(poligonos,metro)
const campos=poligonos.map((p,k)=>despejarPlazas(distanciaFirmada(p,caja,{metro}),caja,plazasDeEpoca(MARCAS,HITOS,4+k),{metro}))
const {ancho,alto}=campos[0]
const vacio={ancho,alto,distancias:new Float32Array(ancho*alto)}
const {datos}=codificar([0,1,2].map(k=>campos[k]??vacio))
const meta={...metaSueloManzanas({caja,ancho,alto,manzanas:Object.fromEntries(epocas.map((a,k)=>[a,poligonos[k].length]))}),imagen:'plano/suelo-manzanas-modernas.png',canales:epocas}
await sharp(Buffer.from(datos),{raw:{width:ancho,height:alto,channels:3}}).png().toFile(`public/${meta.imagen}`)
await writeFile('public/datos/suelo-manzanas-modernas.json',JSON.stringify(meta,null,2)+'\n')
console.log({epocas,ancho,alto,manzanas:meta.manzanas})
