// Arma la muestra de datos (T12; la lógica está en tools/muestra-lib.mjs): de los datos del sitio en public/,
// el recorte de 1 km² alrededor de la plaza, en `destino` (con la misma estructura public/…) y su manifiesto.
// La usa tools/paquete-datos.mjs al publicar; los E2E del CI la bajan con npm run datos:bajar -- --muestra.
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { decodificarPak } from '../src/pak.js'
import { codificarPak } from './pak.mjs'
import { cajaDeMuestra, nivelesDeMuestra, planDeMuestra, recortarArboles, recortarCiudad, teselasEnCaja } from './muestra-lib.mjs'

const TIPOS = { vertices: Float32Array, techos: Uint32Array, vida: Uint32Array, historia: Uint8Array, marcos: Float32Array, alas: Float32Array }
const REGISTROS = { vertices: 8, techos: 16, vida: 4, historia: 6, marcos: 44, alas: 20 }
const MANIFIESTO = 'public/datos/manifiesto.json'

function ciudadRecortada(bytes, caja) {
  const crudo = gunzipSync(bytes)
  const partes = recortarCiudad(decodificarPak(crudo.buffer.slice(crudo.byteOffset, crudo.byteOffset + crudo.byteLength), TIPOS), caja)
  const techos = partes.techos.length / 4
  const pak = codificarPak(Object.fromEntries(Object.entries(partes).map(([n, datos]) => [n, { datos, registro: REGISTROS[n] }])))
  return { pak, techos }
}

/** Arma la muestra en `destino` y devuelve su manifiesto ({ conteos, archivos: { ruta: sha256 } }). */
export async function armarMuestra(raiz, destino) {
  const leer = (r) => readFile(path.join(raiz, r))
  const { plano } = JSON.parse(await leer('public/datos/ciudad.json'))
  const laminas = JSON.parse(await leer('public/plano/laminas.json'))
  const completo = JSON.parse(await leer(MANIFIESTO))
  const caja = cajaDeMuestra(plano)
  const plan = planDeMuestra(Object.keys(completo.archivos), teselasEnCaja(laminas, caja))
  const archivos = {}
  const conteos = {}
  for (const { destino: ruta, hacer, origen } of plan) {
    const salida = path.join(destino, ruta)
    await mkdir(path.dirname(salida), { recursive: true })
    if (hacer === 'copiar') {
      await copyFile(path.join(raiz, origen), salida)
    } else if (hacer === 'recortar-ciudad') {
      const { pak, techos } = ciudadRecortada(await leer(origen), caja)
      await writeFile(salida, pak)
      conteos.techos = techos
    } else if (hacer === 'recortar-arboles') {
      const arboles = recortarArboles(new Uint8Array(await leer(origen)), caja)
      await writeFile(salida, arboles)
      conteos.arboles = arboles.length / 8
    } else {
      await writeFile(salida, JSON.stringify(nivelesDeMuestra(JSON.parse(await leer(origen)))))
    }
    archivos[ruta] = createHash('sha256').update(await readFile(salida)).digest('hex')
  }
  const manifiesto = { conteos, caja, archivos }
  await mkdir(path.dirname(path.join(destino, MANIFIESTO)), { recursive: true })
  await writeFile(path.join(destino, MANIFIESTO), JSON.stringify(manifiesto, null, 2) + '\n')
  return manifiesto
}
