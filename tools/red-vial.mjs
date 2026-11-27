#!/usr/bin/env node
// Herramienta offline: no toca public/, reservas, casas ni la red moderna del sitio.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {ANIOS_RED,importarReferencias,redDeEpoca,validarRedVial} from './red-vial-lib.mjs'
const raiz=fileURLToPath(new URL('../',import.meta.url))
const leer=async ruta=>JSON.parse(await readFile(resolve(raiz,ruta),'utf8'))
export async function registroDelProyecto(){
 const red=importarReferencias(await leer('tools/geo/referencias/1772-calles-1936.json'),await leer('tools/geo/calles-historicas.json'))
 const modernos=await leer('tools/geo/referencias/vialidad-posterior-1946.json')
 for(const id of Object.keys(modernos.fuentes))if(Object.hasOwn(red.fuentes,id))throw new Error(`fuente duplicada ${id}`)
 return validarRedVial({...red,fuentes:{...red.fuentes,...modernos.fuentes},tramos:[...red.tramos,...modernos.tramos]})
}
export async function ejecutar(args){
 const [accion,salida]=args
 if(!['auditar','exportar'].includes(accion)||args.length>2||accion==='exportar'&&!salida)throw new Error('uso: node tools/red-vial.mjs auditar | exportar <directorio>')
 const red=await registroDelProyecto(), resultados=ANIOS_RED.map(a=>redDeEpoca(red,a))
 if(accion==='exportar'){
  const destino=resolve(salida),publico=resolve(raiz,'public')
  if(destino===publico||destino.startsWith(publico+'/'))throw new Error('Exportar primero fuera de public/: revisar cobertura antes de publicar')
  await mkdir(destino,{recursive:true})
  for(const r of resultados)await writeFile(join(destino,`red-${r.año}.json`),JSON.stringify(r,null,2)+'\n')
 }
 const resumen=resultados.map(r=>({año:r.año,tramos:r.tramos.length,pendientes:r.pendientes.length,ausentes:r.ausentes.length,proyectos:r.proyectos.length,obras:r.obras.length}))
 console.table(resumen);return resumen
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))ejecutar(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1})
