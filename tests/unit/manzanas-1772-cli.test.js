import {describe,it,expect} from 'vitest'
import {execFileSync} from 'node:child_process'
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {codificarPak} from '../../tools/pak.mjs'

const correr=(script,args)=>{
 try{return {codigo:0,salida:execFileSync('node',[script,...args],{encoding:'utf8',stdio:'pipe'})}}
 catch(e){return {codigo:e.status,salida:String(e.stderr)+String(e.stdout)}}
}

describe('tools/manzanas-1772.mjs',()=>{
 it('rechaza un informe que pisaría la ciudad generada, antes de escribir nada',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'manzanas-'))
  const mismo=path.join(dir,'salida.json')
  writeFileSync(mismo,'sin tocar')
  const r=correr('tools/manzanas-1772.mjs',['no-importa.json',mismo,path.join(dir,'.','salida.json')])
  expect(r.codigo).not.toBe(0)
  expect(r.salida).toMatch(/misma ruta/)
  expect(readFileSync(mismo,'utf8')).toBe('sin tocar')
 })
})

describe('tools/auditar-manzanas-1772.mjs',()=>{
 it('audita un paquete sin marcos, historia ni vuelos, que el visor acepta',()=>{
  // Un techo cuadrado y nada más: las partes opcionales faltan, como en un paquete viejo.
  const dir=mkdtempSync(path.join(tmpdir(),'auditar-'))
  for(const lado of ['antes','despues']){
   mkdirSync(path.join(dir,lado))
   writeFileSync(path.join(dir,lado,'ciudad.pak'),codificarPak({
    vertices:{datos:Float32Array.from([0,0,10,0,10,10,0,10]),registro:8},
    techos:{datos:Uint32Array.from([0,4,1,0]),registro:16},
   }))
   writeFileSync(path.join(dir,lado,'arboles.bin'),Buffer.alloc(0))
  }
  const informe=path.join(dir,'informe.json')
  const r=correr('tools/auditar-manzanas-1772.mjs',[path.join(dir,'antes'),path.join(dir,'despues'),informe])
  expect(r.salida).not.toMatch(/TypeError/)
  expect(r.codigo).toBe(0)
  expect(JSON.parse(readFileSync(informe,'utf8')).epocas).toHaveLength(6)
 })
})
