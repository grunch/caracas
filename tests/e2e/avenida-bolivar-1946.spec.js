// El corredor de la futura avenida Bolívar (#276) sigue edificado en 1946: el paquete no vacía la franja que
// abrió el 31-12-1949. Mide sobre los mismos datos que carga el visor (completos o la muestra del CI).
import { test, expect } from '@playwright/test'
import { gunzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { decodificarPak } from '../../src/pak.js'
import { puntoEnPoligono } from '../../src/hitos/suprimir.js'

const BOLIVAR = JSON.parse(readFileSync(new URL('../../tools/geo/referencias/1946-avenida-bolivar.json', import.meta.url), 'utf8'))
const [EPOCA_1936, EPOCA_1946] = [5, 6]
const viva = (vida, e) => vida % 8 <= e && (!(vida >> 3) || e < vida >> 3)

test('las casas del corredor Este 6–Este 8 de 1936 siguen en 1946', async ({ page }) => {
  const r = await page.request.get('/datos/ciudad.pak')
  test.skip(!r.ok() || (r.headers()['content-type'] ?? '').includes('html'), 'Sin datos generados (npm run datos:bajar)')
  const bytes = await r.body()
  const b = bytes[0] === 31 ? gunzipSync(bytes) : bytes
  const d = decodificarPak(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), { vertices: Float32Array, techos: Uint32Array, vida: Uint32Array }, () => {})
  const enElCorredor = []
  for (let i = 0; i < d.techos.length / 4; i++) {
    const [desde, n] = [d.techos[i * 4], d.techos[i * 4 + 1]]
    let [x, y] = [0, 0]
    for (let k = desde; k < desde + n; k++) { x += d.vertices[k * 2]; y += d.vertices[k * 2 + 1] }
    if (puntoEnPoligono([x / n, y / n], BOLIVAR.corredor.poligono_mosaico)) enElCorredor.push(d.vida[i])
  }
  const de1936 = enElCorredor.filter((v) => viva(v, EPOCA_1936))

  expect(de1936.length).toBeGreaterThan(20)
  expect(de1936.filter((v) => !viva(v, EPOCA_1946))).toEqual([])
})
