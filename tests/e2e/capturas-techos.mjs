// Vistas de control de los techos (no es un test): node tests/e2e/capturas-techos.mjs [url] [carpeta] [medir]
// Las mismas vistas que las referencias de fuentes/imagenes/ (README.md), para comparar lado a lado:
//  a · vuelo de pájaro sobre el centro (1772 y 1843; grabado de 1812), en color y en tinta
//  b · desde El Calvario hacia el noreste (1843: litografía de 1839; 1889 y 1911: foto de ~1903)
//  c · a nivel de calle (1843: litografía de la calle; La Pastora, 1889: foto de 1892)
//  d · sobre los techos en 1936 (foto de los años 30)
// Usa la GPU del equipo. Con `medir`, además, el tiempo por cuadro en el valle, el centro y de cerca.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'test-results/capturas-techos'
const MEDIR = process.argv[4] === 'medir'
const CALVARIO = { x: -350, z: 150, dist: 620, yaw: -1.05, pitch: 0.2 }
const VUELO = { x: 20, z: 60, dist: 420, yaw: 0.12, pitch: 0.5 }
// `ojo` y `mira` = [x, metros sobre el suelo, z]: la cámara a mano (la del visor no baja de 12 m)
const CONTROL = [
  { nombre: 'a-vuelo-1772', epoca: 1, vista: VUELO },
  { nombre: 'a-vuelo-1843', epoca: 2, vista: VUELO },
  { nombre: 'a-vuelo-1843-tinta', epoca: 2, modo: 'tinta', vista: VUELO },
  { nombre: 'b-calvario-1843', epoca: 2, vista: CALVARIO },
  { nombre: 'c-calle-1843', epoca: 2, ojo: [-175, 7, -81], mira: [-45, 3.5, -63] },
  { nombre: 'b-calvario-1889', epoca: 3, vista: CALVARIO },
  { nombre: 'c-pastora-1889', epoca: 3, ojo: [-30, 1.8, -935], mira: [-130, 3, -1035] },
  { nombre: 'b-calvario-1911', epoca: 4, vista: CALVARIO },
  { nombre: 'd-techos-1936', epoca: 5, vista: { x: 100, z: 300, dist: 300, yaw: 3.3, pitch: 0.35 } },
]
const MEDIDAS = [
  { nombre: 'valle-1936', epoca: 5, vista: { x: 0, z: 0, dist: 7000, yaw: 0, pitch: 0.8 } },
  { nombre: 'centro-1936', epoca: 5, vista: { x: 0, z: 0, dist: 1500, yaw: 0, pitch: 0.8 } },
  { nombre: 'cerca-1936', epoca: 5, vista: { x: -150, z: 450, dist: 420, yaw: 0.5, pitch: 0.55 } },
  { nombre: 'calle-1936', epoca: 5, vista: { x: 60, z: -200, dist: 60, yaw: 0.05, pitch: 0.2 } },
]
const CUADROS_MEDIDOS = 60

mkdirSync(carpeta, { recursive: true })
const navegador = await chromium.launch({
  args: ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'],
})
const pagina = await navegador.newPage({ viewport: { width: 1600, height: 1000 } })
pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
pagina.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('consola:', m.text().slice(0, 1500)) })
const t0 = Date.now()
await pagina.goto(`${url}?capture&sinintro`)
await pagina.waitForFunction(() => window.lab?.ready && window.lab.relieve && window.lab.lineaDeTiempo && window.lab.arboles, null, { timeout: 120000 })
console.log('listo en', Date.now() - t0, 'ms · GPU:', await pagina.evaluate(() => {
  const gl = window.lab.renderer.getContext()
  return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER)
}))
// la ciudad levantada de una vez (sin esperar la ola) y sin la interfaz encima
await pagina.evaluate(() => { window.lab.levantar(true); window.lab.ciudad.U.uOla.value = 1e5 })
await pagina.addStyleTag({ content: '#epocas, #botones, #leyenda { visibility: hidden !important; }' })
await pagina.waitForTimeout(1500)
const dosCuadros = () => pagina.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

/** Milisegundos por cuadro dibujando sin parar (gl.finish después de cada uno): la mediana. */
const medir = (n) => pagina.evaluate((n) => {
  const { renderer, scene, camera } = window.lab
  const gl = renderer.getContext()
  const t = []
  for (let i = 0; i < n; i++) {
    const t0 = performance.now()
    renderer.render(scene, camera)
    gl.finish()
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
    t.push(performance.now() - t0)
  }
  t.sort((a, b) => a - b)
  return { mediana: t[n >> 1], p90: t[Math.floor(n * 0.9)], triangulos: renderer.info.render.triangles, llamadas: renderer.info.render.calls }
}, n)

let epocaActual = null
let modoActual = null
for (const { nombre, epoca, modo = 'color', vista, ojo, mira } of MEDIR ? MEDIDAS : CONTROL) {
  if (modo !== modoActual) {
    await pagina.evaluate((c) => { window.lab.alternarColor(c); window.lab.ciudad.U.uColor.value = c ? 1 : 0 }, modo !== 'tinta')
    modoActual = modo
  }
  if (epoca !== epocaActual) {
    await pagina.evaluate((k) => window.lab.lineaDeTiempo.elegir(k), epoca)
    await pagina.waitForTimeout(600)
    await pagina.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 8999 })
    await pagina.waitForTimeout(3500)
    epocaActual = epoca
  }
  await pagina.evaluate((v) => { window.lab.cam.jump(v); window.lab.pedirCuadro(4) }, vista ?? { x: mira[0], z: mira[2], dist: 60, yaw: 0, pitch: 0.3 })
  await dosCuadros()
  await pagina.waitForTimeout(1500) // las teselas finas de cerca
  await pagina.evaluate(() => window.lab.pedirCuadro(4))
  await dosCuadros()
  if (ojo) {
    await pagina.waitForTimeout(400)
    await pagina.evaluate(([o, m]) => {
      const { camera, renderer, scene, sueloEn } = window.lab
      camera.position.set(o[0], sueloEn(o[0], o[2]) + o[1], o[2])
      camera.lookAt(m[0], sueloEn(m[0], m[2]) + m[1], m[2])
      camera.updateMatrixWorld()
      renderer.render(scene, camera)
    }, [ojo, mira])
  }
  await pagina.screenshot({ path: `${carpeta}/${nombre}.png`, timeout: 150000 })
  const t = MEDIR ? await medir(CUADROS_MEDIDOS) : null
  console.log('toma', nombre, t ? `${t.mediana.toFixed(2)} ms/cuadro (p90 ${t.p90.toFixed(2)}) · ${t.triangulos} triángulos · ${t.llamadas} llamadas` : '')
}
await navegador.close()
