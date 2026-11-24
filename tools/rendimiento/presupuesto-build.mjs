// Comprueba el presupuesto del build (specs/10-rendimiento.md): node tools/rendimiento/presupuesto-build.mjs [dist]
// Después de `npx vite build`. Sale con error si el JS que se baja al abrir, los workers o el service worker
// pasan de su tope en tools/rendimiento/presupuesto.json.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, relative } from 'node:path'
import { tamanosDelBuild, compararBuild, informeDelPresupuesto } from './rendimiento-lib.mjs'

const dist = process.argv[2] ?? 'dist'
const js = []
for (const carpeta of [dist, join(dist, 'assets')]) {
  for (const nombre of readdirSync(carpeta)) {
    const ruta = join(carpeta, nombre)
    if (nombre.endsWith('.js') && statSync(ruta).isFile()) js.push({ ruta: relative(dist, ruta).split('\\').join('/'), gzip: gzipSync(readFileSync(ruta)).length })
  }
}
const { build } = JSON.parse(readFileSync(new URL('./presupuesto.json', import.meta.url), 'utf8'))
const filas = compararBuild(tamanosDelBuild(js, readFileSync(join(dist, 'index.html'), 'utf8')), build.topes)
console.log(informeDelPresupuesto(filas))
if (filas.some((f) => !f.pasa)) process.exit(1)
