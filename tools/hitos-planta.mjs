// Las plantas y zonas de supresión de los hitos modelados a mano (src/hitos/plantas.js), con su vida, en JSON: las
// leen las puertas de las fases 4 a 7 de 1772 (tools/geo/cierre_fase*.py). Sin efectos.
import { pathToFileURL } from 'node:url'
import { hitosConPlanta } from '../src/hitos/plantas.js'

export { hitosConPlanta }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(hitosConPlanta()))
