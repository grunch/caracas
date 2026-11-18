// Capturas del valle en cada época (no es un test): node tests/e2e/capturas-valle.mjs [url] [carpeta] [épocas] [modo]
// La ciudad levantada, en color (o `tinta`, o `hoy`: color con lo de hoy estampado), todo el valle y el
// centro. Con CAPTURAS_GPU=1 usa la GPU del equipo en vez de SwiftShader y mide el tiempo por cuadro.
import { chromium } from '@playwright/test'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'test-results/capturas-valle'
const epocas = (process.argv[4] ?? '0,1,2,5').split(',').map(Number)
const modo = process.argv[5] ?? 'color'
const GPU = Boolean(process.env.CAPTURAS_GPU)
const VISTAS = {
  valle: { x: 0, z: 0, dist: 7000, yaw: 0, pitch: 0.8 },
  centro: { x: 0, z: 0, dist: 1500, yaw: 0, pitch: 0.8 },
  cerca: { x: -150, z: 450, dist: 420, yaw: 0.5, pitch: 0.55 },
}
const CUADROS_MEDIDOS = 60

const navegador = await chromium.launch({
  args: GPU ? ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 800 } })
pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
pagina.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('consola:', m.text()) })
await pagina.goto(`${url}?capture&sinintro`)
await pagina.waitForFunction(() => window.lab?.ready && window.lab.relieve && window.lab.lineaDeTiempo && window.lab.arboles, null, { timeout: 120000 })
if (GPU) console.log('GPU:', await pagina.evaluate(() => { const gl = window.lab.renderer.getContext(); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER) }))
await pagina.evaluate((m) => {
  window.lab.levantar(true)
  if (m !== 'tinta') window.lab.alternarColor(true)
  if (m === 'hoy') window.lab.alternarHoy(true)
}, modo)
// la ola termina cuando el suelo de la esquina más lejana de la hoja ya se hinchó entero (como capturas.mjs)
await pagina.waitForFunction(() => {
  const { relieve, relieveU, sueloEn, coords: { hoja } } = window.lab
  const [x, z] = [hoja.x0 + hoja.ancho, hoja.z0 + hoja.alto]
  return Math.abs(sueloEn(x, z) - relieve.alturaEn(x, z) * relieveU.uExageracion.value) < 1e-6
}, null, { polling: 2000, timeout: 900000 })
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

const años = await pagina.evaluate(() => [...document.querySelectorAll('#epocas .años button:not(.andar)')].map((b) => b.textContent))
for (const i of epocas) {
  const año = años[i]
  if (i !== 0) {
    await pagina.evaluate((k) => window.lab.lineaDeTiempo.elegir(k), i)
    await pagina.waitForFunction((k) => window.lab.ciudad.U.uEpocaA.value === k, i, { timeout: 60000 })
    const conPlano = await pagina.evaluate((a) => fetch(`plano/${a}/chico.webp`).then((r) => (r.headers.get('content-type') ?? '').includes('webp')), año)
    if (conPlano) await pagina.waitForFunction((a) => window.lab.ciudad.U.uPlanoA.value.image?.src?.includes(`plano/${a}/`), año, { timeout: 120000 })
    // se adelanta la ola hasta casi el final y se la deja terminar (con SwiftShader cada cuadro tarda)
    await pagina.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 8999 })
  }
  await pagina.waitForTimeout(GPU ? 2500 : 6000)
  for (const [nombre, v] of Object.entries(VISTAS)) {
    await pagina.evaluate((v) => { window.lab.cam.jump(v); window.lab.pedirCuadro(4) }, v)
    await dosCuadros()
    await pagina.waitForTimeout(GPU ? 1200 : 0) // las teselas finas de cerca
    await pagina.screenshot({ path: `${carpeta}/${modo}-${año}-${nombre}.png`, timeout: 150000 })
    const tiempo = GPU ? await medir(CUADROS_MEDIDOS) : null
    console.log('captura', modo, año, nombre, tiempo ? `${tiempo.mediana.toFixed(2)} ms/cuadro (p90 ${tiempo.p90.toFixed(2)}) · ${tiempo.triangulos} triángulos · ${tiempo.llamadas} llamadas` : '')
  }
}
await navegador.close()
