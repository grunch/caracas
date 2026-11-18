// Vistas de control de las casas de patio (no es un test): node tests/e2e/capturas-patios.mjs [url] [carpeta]
// Las mismas vistas que la referencia aérea del pueblo colonial (fuentes/imagenes/0000-usuario-aerea-pueblo-colonial):
// el centro desde arriba a su escala (~0,5 m por píxel, manzanas de ~100 m), de más cerca, en oblicuo, y la
// vista desde El Calvario hacia el noreste (litografía de 1839, grabado de 1812), en 1772 y 1843, en color.
// Al final imprime los triángulos de la ciudad y el tiempo por cuadro. Usa la GPU del equipo.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'test-results/capturas-patios'
const VISTAS = [
  { nombre: 'cenital', vista: { x: 0, z: 40, dist: 1000, yaw: 0, pitch: 1.5 } },
  { nombre: 'cenital-cerca', vista: { x: -60, z: 170, dist: 420, yaw: 0, pitch: 1.5 } },
  { nombre: 'oblicua', vista: { x: -40, z: 150, dist: 380, yaw: 0.5, pitch: 0.75 } },
  { nombre: 'calvario', vista: { x: -350, z: 150, dist: 620, yaw: -1.05, pitch: 0.2 } },
]
const EPOCAS = [[1, 1772], [2, 1843]]

mkdirSync(carpeta, { recursive: true })
const navegador = await chromium.launch({
  args: ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'],
})
const pagina = await navegador.newPage({ viewport: { width: 1260, height: 1276 } })
pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
pagina.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('consola:', m.text().slice(0, 1500)) })
await pagina.goto(`${url}?capture&sinintro`)
await pagina.waitForFunction(() => window.lab?.ready && window.lab.relieve && window.lab.lineaDeTiempo && window.lab.arboles, null, { timeout: 120000 })
await pagina.evaluate(() => { window.lab.levantar(true); window.lab.ciudad.U.uOla.value = 1e5; window.lab.alternarColor(true); window.lab.ciudad.U.uColor.value = 1 })
await pagina.addStyleTag({ content: '#epocas, #botones, #leyenda { visibility: hidden !important; }' })
await pagina.waitForTimeout(1500)
const dosCuadros = () => pagina.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

for (const [epoca, año] of EPOCAS) {
  await pagina.evaluate((k) => window.lab.lineaDeTiempo.elegir(k), epoca)
  await pagina.waitForTimeout(600)
  await pagina.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 8999 })
  await pagina.waitForTimeout(3500)
  for (const { nombre, vista } of VISTAS) {
    await pagina.evaluate((v) => { window.lab.cam.jump(v); window.lab.pedirCuadro(4) }, vista)
    await dosCuadros()
    await pagina.waitForTimeout(1500) // las teselas finas de cerca
    await pagina.evaluate(() => window.lab.pedirCuadro(4))
    await dosCuadros()
    await pagina.screenshot({ path: `${carpeta}/${nombre}-${año}.png`, timeout: 150000 })
    console.log('toma', `${nombre}-${año}`)
  }
}

const medida = await pagina.evaluate(() => {
  const { renderer, scene, camera, cam } = window.lab
  cam.jump({ x: 0, z: 0, dist: 1500, yaw: 0, pitch: 0.8 })
  const gl = renderer.getContext()
  const t = []
  for (let i = 0; i < 60; i++) {
    const t0 = performance.now()
    renderer.render(scene, camera)
    gl.finish()
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
    t.push(performance.now() - t0)
  }
  t.sort((a, b) => a - b)
  let geometria = null
  scene.traverse((o) => { if (o.geometry?.getAttribute?.('aTecho')) geometria = o.geometry })
  return {
    mediana: t[30], p90: t[54], dibujados: renderer.info.render.triangles, llamadas: renderer.info.render.calls,
    ciudad: geometria ? geometria.index.count / 3 : null,
  }
})
console.log(`centro a 1500 m: ${medida.mediana.toFixed(2)} ms/cuadro (p90 ${medida.p90.toFixed(2)}) · ${medida.dibujados} triángulos dibujados · ${medida.llamadas} llamadas · ciudad: ${medida.ciudad} triángulos`)
await navegador.close()
