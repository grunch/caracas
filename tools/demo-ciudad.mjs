#!/usr/bin/env node
// Ciudad de DEMOSTRACIÓN (no es Caracas): un damero de manzanas alrededor de la plaza, para probar
// la extrusión y la ola mientras el pipeline real (tools/geo) no produce datos. Escribe public/datos/ciudad.pak.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { codificarPak } from './pak.mjs'
import { empacarTecho } from '../src/ciudad.js'

const RAIZ = path.resolve(import.meta.dirname, '..')
const { plano } = JSON.parse(await readFile(path.join(RAIZ, 'public/datos/ciudad.json'), 'utf8'))
const LADO_MANZANA_M = 110
const CALLE_M = 12
const FRENTE_M = 11
const MANZANAS_POR_LADO = 9

let semilla = 7
const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647
const vertices = []
const techos = []
const aPx = (m) => m / plano.metro
const [px0, py0] = plano.plaza
const paso = LADO_MANZANA_M + CALLE_M
const mitad = (MANZANAS_POR_LADO * paso) / 2

for (let i = 0; i < MANZANAS_POR_LADO; i++) {
  for (let j = 0; j < MANZANAS_POR_LADO; j++) {
    if (i === 4 && j === 4) continue // la plaza
    const x0 = i * paso - mitad
    const z0 = j * paso - mitad
    // casas a lo largo de los cuatro frentes, con fondo variable (el patio queda al medio)
    for (let k = 0; k * FRENTE_M < LADO_MANZANA_M; k++) {
      for (const lado of [0, 1, 2, 3]) {
        const fondo = 14 + azar() * 22
        const a = k * FRENTE_M
        const b = Math.min(LADO_MANZANA_M, a + FRENTE_M - 0.4)
        const r = lado === 0 ? [a, 0, b, fondo] : lado === 1 ? [a, LADO_MANZANA_M - fondo, b, LADO_MANZANA_M]
          : lado === 2 ? [0, a, fondo, b] : [LADO_MANZANA_M - fondo, a, LADO_MANZANA_M, b]
        const inicio = vertices.length / 2
        for (const [x, z] of [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]]) {
          vertices.push(px0 + aPx(x0 + x), py0 + aPx(z0 + z))
        }
        const pisos = azar() < 0.85 ? 1 : 2
        techos.push(inicio, 4, empacarTecho({ pisos, estilo: 0 }), Math.floor(azar() * 65535))
      }
    }
  }
}

const pak = codificarPak({
  vertices: { datos: new Float32Array(vertices), registro: 8 },
  techos: { datos: new Uint32Array(techos), registro: 16 },
})
await writeFile(path.join(RAIZ, 'public/datos/ciudad.pak'), pak)
console.log(`demo: ${techos.length / 4} casas, ${(pak.length / 1024).toFixed(0)} KB → public/datos/ciudad.pak`)
