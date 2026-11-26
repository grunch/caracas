// Medición de rendimiento del sitio (no es un test; specs/10-rendimiento.md):
//   node tests/e2e/medir-rendimiento.mjs [url] [--gpu] [--liviano] [--salida archivo.json] [--estricto]
// --detalle-casas activa el piloto; --vistas archivo.json añade cámaras fijas para comparar el detalle.
// Mide el arranque (hitos, tareas largas del hilo principal), lo que se baja antes de tocar nada (y en una
// segunda visita, si hay service worker), la memoria
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
const conValor = new Set(['--salida', '--vistas', '--epoca'])
const url = args.find((a, k) => !a.startsWith('--') && !conValor.has(args[k - 1])) ?? 'http://localhost:4173/'
const años=[1772,1843,1889,1911,1936,1945],epoca=valorDe('--epoca')?años.indexOf(Number(valorDe('--epoca')))+1:1
if(epoca<1)throw new Error('--epoca debe ser un año de la línea de tiempo')
const GPU = bandera('--gpu')
const ESPERA_MS = 300_000
const QUIETO_MS = 4000 // después del último hito: lo que se pide solo, sin tocar nada
const CUADROS = 40
const VISTAS = { // las de tests/e2e/capturas-valle.mjs
  centro: { x: 0, z: 0, dist: 1500, yaw: 0, pitch: 0.8 },
  valle: { x: 0, z: 0, dist: 7000, yaw: 0, pitch: 0.8 },
  cerca: { x: -150, z: 450, dist: 420, yaw: 0.5, pitch: 0.55 },
}

if(valorDe('--vistas'))Object.assign(VISTAS,JSON.parse(readFileSync(valorDe('--vistas'),'utf8')))

// para ver también lo que pide el service worker por su cuenta (Playwright lo trae detrás de esta variable)
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ??= '1'
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
// lo que va llegando se suma: una descarga todavía en curso cuando se corta la medición cuenta lo que ya viajó
cdp.on('Network.dataReceived', (e) => { const p = pedidos.get(e.requestId); if (p) p.bytes = (p.bytes ?? 0) + e.encodedDataLength })
// al terminar, el total exacto (con las cabeceras) reemplaza a la suma
cdp.on('Network.loadingFinished', (e) => { const p = pedidos.get(e.requestId); if (p) p.bytes = e.encodedDataLength })

await pagina.addInitScript(() => {
  window.__largas = []
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__largas.push([Math.round(e.startTime), Math.round(e.duration)]) })
    .observe({ entryTypes: ['longtask'] })
})

const t0 = Date.now()
// la primera visita, sin service worker (?sinsw): si tomara la página a mitad de la carga, parte de los
// pedidos pasarían por él y no se contarían acá
const extra = (bandera('--liviano') ? '&liviano' : '') + (bandera('--detalle-casas') ? '&detallecasas=1' : '')
// (`commit`: sin esperar a `load`, para que un hito que llegue antes no quede fechado en `load`)
await pagina.goto(`${url}?sinintro&sinsw${extra}`, { waitUntil: 'commit' })
const hitos = {}
const hito = async (nombre, condicion) => {
  await pagina.waitForFunction(condicion, null, { timeout: ESPERA_MS, polling: 50 })
  hitos[nombre] = Date.now() - t0
}
// todos a la vez: cada hito anota cuándo llegó él, no cuándo terminó de esperarse al anterior
await Promise.all([
  hito('listo', () => window.lab?.ready === true),
  // las casas: la señal nueva (window.lab.casasListas) o, antes de ella, la malla con el atributo de los techos
  hito('casas', () => window.lab?.ready && (window.lab.casasListas ?? window.lab.scene.children.some((m) => m.isMesh && m.geometry.hasAttribute('aTecho')))),
  // las primeras casas que se ven (src/casas.js); antes de las baldosas llegaban todas juntas
  hito('primerasCasas', () => window.lab?.ready && (window.lab.casas ? window.lab.casas.baldosas.length > 0 : window.lab.casasListas)),
  hito('lineaDeTiempo', () => Boolean(window.lab?.lineaDeTiempo)),
  hito('arboles', () => Boolean(window.lab?.arboles)),
])
await pagina.waitForTimeout(QUIETO_MS)

const alAbrir = resumirPedidos([...pedidos.values()], url)
const tareas = resumirTareas(await pagina.evaluate(() => window.__largas))
const gpu = await pagina.evaluate(() => {
  const gl = window.lab.renderer.getContext()
  return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER)
})

// la época que se mide (--epoca), después de las medidas del arranque: esa ventana sigue sin tocar nada
await pagina.evaluate(e=>window.lab.lineaDeTiempo.elegir(e),epoca)
await pagina.waitForFunction(e=>window.lab.ciudad.U.uEpocaA.value===e&&window.lab.ciudad.U.uOlaEpoca.value>=9000,epoca,{timeout:ESPERA_MS})
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

const detalleCasas=await pagina.evaluate(()=>window.lab.detalleColonial?.cuenta??null)

// la segunda visita: la misma página abierta de nuevo, con lo que el service worker guardó (src/sw.js);
// null si el sitio no registró ninguno (el servidor de desarrollo)
let segundaVisita = null
const abrir = async () => {
  await pagina.goto(`${url}?sinintro${extra}`)
  await pagina.waitForFunction(() => window.lab?.ready && window.lab.arboles && (window.lab.casasListas ?? true), null, { timeout: ESPERA_MS })
  await pagina.waitForTimeout(QUIETO_MS)
}
await abrir() // esta visita registra el service worker y le llena la caché
const conServicio = await pagina.evaluate(async () => (await window.lab.servicio?.catch(() => null)) === 'registrado' && Boolean(await navigator.serviceWorker.ready))
if (conServicio) {
  // lo que de verdad viaja en la visita siguiente: lo que la página pide a la red (nada, si todo sale del
  // service worker) más lo que el service worker pide por su cuenta (la página y el manifiesto, para revalidar)
  const delServicio = []
  const anotar = async (pedido) => {
    if (!pedido.serviceWorker()) return
    const tamaños = await pedido.sizes().catch(() => null)
    delServicio.push({ url: pedido.url(), bytes: tamaños ? tamaños.responseHeadersSize + tamaños.responseBodySize : 0 })
  }
  contexto.on('requestfinished', anotar)
  pedidos.clear()
  await abrir()
  contexto.off('requestfinished', anotar)
  segundaVisita = { pagina: resumirPedidos([...pedidos.values()], url), servicio: resumirPedidos(delServicio, url) }
}
await navegador.close()

const medicion = {
  url, gpu, conGpu: GPU, liviano: bandera('--liviano'), ventana: [1280, 800],
  año: años[epoca-1], hitos, tareas, pedidos: alAbrir, segundaVisita, memoria, cuadro, detalleCasas,
}
const presupuesto = JSON.parse(readFileSync(new URL('../../tools/rendimiento/presupuesto.json', import.meta.url), 'utf8'))
const filas = compararConPresupuesto(medicion, presupuesto)
const salida = JSON.stringify({ ...medicion, presupuesto: filas }, null, 2)
if (valorDe('--salida')) writeFileSync(valorDe('--salida'), `${salida}\n`)
console.log(salida)
console.error(`\n${informeDelPresupuesto(filas)}`)
if (bandera('--estricto') && filas.some((f) => f.pasa === false)) process.exit(1)
