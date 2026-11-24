// Medición de rendimiento del sitio (no es un test; specs/10-rendimiento.md):
//   node tests/e2e/medir-rendimiento.mjs [url] [--gpu] [--liviano] [--salida archivo.json] [--estricto]
// Mide el arranque (hitos, tareas largas del hilo principal), lo que se baja antes de tocar nada, la memoria
// (heap de JS y arreglos de geometría) y lo que se dibuja por cuadro en tres vistas. Imprime un JSON y la
// comparación con tools/rendimiento/presupuesto.json. Conviene medir el sitio construido (`npm run build` y
// `npx vite preview`) con los datos completos: el servidor de desarrollo sirve los módulos sin empaquetar.
// --gpu usa la GPU del equipo, sin tope de vsync: solo así el tiempo por cuadro dice algo (con SwiftShader,
// que es lo que hay en el CI, no se mide). --estricto sale con error si algún tope medido no pasa.
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { mediana, percentil, resumirPedidos, resumirTareas, compararConPresupuesto, informeDelPresupuesto } from '../../tools/rendimiento/rendimiento-lib.mjs'

const args = process.argv.slice(2)
const bandera = (n) => args.includes(n)
const valorDe = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null)
const conValor = new Set(['--salida'])
const url = args.find((a, k) => !a.startsWith('--') && !conValor.has(args[k - 1])) ?? 'http://localhost:4173/'
const GPU = bandera('--gpu')
const ESPERA_MS = 300_000
const QUIETO_MS = 4000 // después del último hito: lo que se pide solo, sin tocar nada
const CUADROS = 40
const VISTAS = { // las de tests/e2e/capturas-valle.mjs
  centro: { x: 0, z: 0, dist: 1500, yaw: 0, pitch: 0.8 },
  valle: { x: 0, z: 0, dist: 7000, yaw: 0, pitch: 0.8 },
  cerca: { x: -150, z: 450, dist: 420, yaw: 0.5, pitch: 0.55 },
}

const navegador = await chromium.launch({
  args: GPU ? ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 } })
const pagina = await contexto.newPage()
pagina.on('pageerror', (e) => console.error('pageerror:', e.message))

// los pedidos, con los bytes que viajaron de verdad (comprimidos), por el protocolo de DevTools
const cdp = await contexto.newCDPSession(pagina)
await cdp.send('Network.enable')
const pedidos = new Map()
cdp.on('Network.requestWillBeSent', (e) => pedidos.set(e.requestId, { url: e.request.url }))
cdp.on('Network.loadingFinished', (e) => { const p = pedidos.get(e.requestId); if (p) p.bytes = e.encodedDataLength })

await pagina.addInitScript(() => {
  window.__largas = []
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__largas.push([Math.round(e.startTime), Math.round(e.duration)]) })
    .observe({ entryTypes: ['longtask'] })
})

const t0 = Date.now()
await pagina.goto(`${url}?sinintro${bandera('--liviano') ? '&liviano' : ''}`)
const hitos = {}
const hito = async (nombre, condicion) => {
  await pagina.waitForFunction(condicion, null, { timeout: ESPERA_MS, polling: 50 })
  hitos[nombre] = Date.now() - t0
}
await hito('listo', () => window.lab?.ready === true)
// las casas: la señal nueva (window.lab.casasListas) o, antes de ella, la malla con el atributo de los techos
await hito('casas', () => window.lab.casasListas ?? window.lab.scene.children.some((m) => m.isMesh && m.geometry.hasAttribute('aTecho')))
await hito('lineaDeTiempo', () => Boolean(window.lab.lineaDeTiempo))
await hito('arboles', () => Boolean(window.lab.arboles))
await pagina.waitForTimeout(QUIETO_MS)

const alAbrir = resumirPedidos([...pedidos.values()], url)
const tareas = resumirTareas(await pagina.evaluate(() => window.__largas))
const gpu = await pagina.evaluate(() => {
  const gl = window.lab.renderer.getContext()
  return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER)
})

// la ciudad en pie y en color, que es como se mira
await pagina.evaluate(() => {
  const { levantar, alternarColor, ciudad } = window.lab
  levantar(true)
  alternarColor(true)
  ciudad.U.uOla.value = 1e5
  ciudad.U.uColor.value = 1
})
await pagina.waitForTimeout(QUIETO_MS)

const memoria = await pagina.evaluate(() => {
  const { scene, renderer } = window.lab
  let bytes = 0, vertices = 0, mallas = 0
  scene.traverse((m) => {
    if (!m.geometry) return
    mallas++
    vertices += m.geometry.attributes.position?.count ?? 0
    // los arreglos que siguen vivos en JS (una geometría que ya soltó los suyos no suma)
    for (const a of Object.values(m.geometry.attributes)) bytes += a.array?.byteLength ?? 0
    bytes += m.geometry.index?.array?.byteLength ?? 0
  })
  return {
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    geometriaEnJsMB: +(bytes / 1048576).toFixed(1), vertices, mallas,
    geometrias: renderer.info.memory.geometries, texturas: renderer.info.memory.textures,
  }
})

async function medirVista(vista) {
  const r = await pagina.evaluate(async ([v, cuadros, conTiempos]) => {
    const { renderer, cam, pedirCuadro } = window.lab
    const cuadro = () => new Promise((ok) => requestAnimationFrame(ok))
    const gl = renderer.getContext()
    const px = new Uint8Array(4)
    cam.jump(v)
    pedirCuadro(3); await cuadro(); await cuadro(); await cuadro()
    const tiempos = []
    for (let i = 0; conTiempos && i < cuadros; i++) {
      // la cámara gira un poco: el mapa de sombras se rehace, como cuando alguien mueve la vista
      cam.jump({ ...v, yaw: v.yaw + i * 0.002 })
      pedirCuadro(1)
      const a = performance.now()
      await cuadro()
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px) // espera a la GPU (gl.finish no espera en Chrome)
      tiempos.push(performance.now() - a)
    }
    // lo que dibuja un cuadro entero (three.js reinicia la cuenta en cada render: se suman los pases a mano)
    renderer.info.autoReset = false
    renderer.info.reset()
    cam.jump({ ...v, yaw: v.yaw + 0.1 })
    pedirCuadro(1)
    await cuadro() // el del sitio se pidió antes que este: cuando este corre, ya se dibujó exactamente uno
    const { calls, triangles } = renderer.info.render
    renderer.info.autoReset = true
    return { tiempos, llamadas: calls, triangulos: triangles }
  }, [vista, CUADROS, GPU])
  return {
    llamadas: r.llamadas, triangulos: r.triangulos,
    medianaMs: GPU ? +mediana(r.tiempos).toFixed(1) : null, p90Ms: GPU ? +percentil(r.tiempos, 0.9).toFixed(1) : null,
  }
}
const cuadro = {}
for (const [nombre, vista] of Object.entries(VISTAS)) cuadro[nombre] = await medirVista(vista)
await navegador.close()

const medicion = {
  url, gpu, conGpu: GPU, liviano: bandera('--liviano'), ventana: [1280, 800],
  hitos, tareas, pedidos: alAbrir, memoria, cuadro,
}
const presupuesto = JSON.parse(readFileSync(new URL('../../tools/rendimiento/presupuesto.json', import.meta.url), 'utf8'))
const filas = compararConPresupuesto(medicion, presupuesto)
const salida = JSON.stringify({ ...medicion, presupuesto: filas }, null, 2)
if (valorDe('--salida')) writeFileSync(valorDe('--salida'), `${salida}\n`)
console.log(salida)
console.error(`\n${informeDelPresupuesto(filas)}`)
if (bandera('--estricto') && filas.some((f) => f.pasa === false)) process.exit(1)
