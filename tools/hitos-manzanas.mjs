#!/usr/bin/env node
// La regla «ningún hito sobre una manzana» (specs/13, R13) para los pasos de retiro. La tabla que la mide la escribe
// tools/hitos-manzanas-tabla.mjs.
import {spawnSync} from 'node:child_process'
import {hitosConPlanta} from '../src/hitos/plantas.js'
import {paraMedir,separarRetiradas,devolverManzanas} from './hitos-manzanas-lib.mjs'

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

/** Las retiradas de la época anterior, medidas otra vez: las que un hito sigue retirando y las que vuelven como manzanas. */
export function devolverPorHitos(registros,epoca,metro){
 return devolverManzanas(registros,medirHitos(registros,epoca,metro).decisiones,epoca)
}
