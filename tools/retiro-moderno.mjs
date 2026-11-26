#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {techosDeHitos} from './manzanas-completas.mjs'
const [año,entrada,salida]=process.argv.slice(2)
if(!['1911','1936','1946'].includes(año)||!entrada||!salida)throw Error('Uso: retiro-moderno.mjs <1911|1936|1946> carpeta-anterior carpeta-salida')
const meta=JSON.parse(await readFile('fuentes/derivados/1936/mosaico.json','utf8'))
await mkdir(salida,{recursive:true})
const protecciones=`${salida}/hitos-fijos.json`
await writeFile(protecciones,JSON.stringify([4,5,6].flatMap(e=>techosDeHitos(meta,e))))
const r=spawnSync(process.env.PY??'.venv/bin/python',['tools/geo/retiro_moderno.py',año,entrada,salida,protecciones],{stdio:'inherit'})
if(r.error||r.status!==0)throw Error(r.error?.message??`Retiro ${año}: salida ${r.status}`)
