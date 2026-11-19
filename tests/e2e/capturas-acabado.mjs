// Vistas de control de la luz y el acabado (no es un test):
//   node tests/e2e/capturas-acabado.mjs [url] [carpeta] [medir] [parámetros de la página]
// Las mismas tomas que las capturas de baires.mormon.garden (fuentes/derivados/capturas/baires): cenital
// sobre unas manzanas, oblicua, de cerca, a nivel de calle y el barrio; en tinta y en color, 1843 y 1936.
// Usa la GPU del equipo. Con `medir`, el tiempo por cuadro (valle, centro, de cerca, calle) en tinta y color.
// El cuarto argumento se agrega a la URL: p. ej. 'sombras=0&contorno=0' para comparar con el acabado apagado.
// FILTRO=expresión deja solo las tomas cuyo nombre la cumple (p. ej. FILTRO='cerca|calle').
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'test-results/capturas-acabado'
const MEDIR = process.argv[4] === 'medir'
const extra = process.argv[5] ? `&${process.argv[5]}` : ''
const VISTAS = {
  cenital: { x: 150, z: 250, dist: 380, yaw: 0, pitch: 1.45 },
  oblicua: { x: 100, z: 200, dist: 450, yaw: 0.6, pitch: 0.75 },
  cerca: { x: 80, z: 180, dist: 170, yaw: 0.5, pitch: 0.55 },
  barrio: { x: 0, z: 0, dist: 1500, yaw: 0.3, pitch: 0.7 },
  // `ojo` y `mira` = [x, metros sobre el suelo, z]: la cámara a mano (la del visor no baja de 12 m)
  calle: { ojo: [-175, 7, -81], mira: [-45, 3.5, -63] },
}
const CONTROL = [2, 5].flatMap((epoca) => ['tinta', 'color'].flatMap((modo) =>
  Object.entries(VISTAS).map(([vista, v]) => ({ nombre: `${vista}-${epoca === 2 ? 1843 : 1936}-${modo}`, epoca, modo, ...(v.ojo ? v : { vista: v }) }))))
const MEDIDAS = ['tinta', 'color'].flatMap((modo) => [
  { nombre: `valle-${modo}`, epoca: 5, modo, vista: { x: 0, z: 0, dist: 7000, yaw: 0, pitch: 0.8 } },
  { nombre: `centro-${modo}`, epoca: 5, modo, vista: { x: 0, z: 0, dist: 1500, yaw: 0, pitch: 0.8 } },
  { nombre: `cerca-${modo}`, epoca: 5, modo, vista: { x: -150, z: 450, dist: 420, yaw: 0.5, pitch: 0.55 } },
  { nombre: `calle-${modo}`, epoca: 5, modo, vista: { x: 60, z: -200, dist: 60, yaw: 0.05, pitch: 0.2 } },
])
const CUADROS_MEDIDOS = 60

mkdirSync(carpeta, { recursive: true })
const navegador = await chromium.launch({
  args: ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'],
})
const pagina = await navegador.newPage({ viewport: { width: 1600, height: 1000 } })
pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
pagina.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('consola:', m.text().slice(0, 1500)) })
const t0 = Date.now()
await pagina.goto(`${url}?capture&sinintro${extra}`)
await pagina.waitForFunction(() => window.lab?.ready && window.lab.relieve && window.lab.lineaDeTiempo && window.lab.arboles, null, { timeout: 120000 })
console.log('listo en', Date.now() - t0, 'ms · GPU:', await pagina.evaluate(() => {
  const gl = window.lab.renderer.getContext()
  return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER)
}), '· acabado:', JSON.stringify(await pagina.evaluate(() => window.lab.acabado?.estado ?? null)))
// la ciudad levantada de una vez (sin esperar la ola) y sin la interfaz encima
await pagina.evaluate(() => {
  window.lab.levantar(true)
  window.lab.ciudad.U.uOla.value = 1e5
  // un cuadro entero, con sombras y acabado si los hay (sin ellos, el render de siempre)
  window.dibujarCuadro = () => (window.lab.acabado ? window.lab.acabado.dibujar() : window.lab.renderer.render(window.lab.scene, window.lab.camera))
})
await pagina.addStyleTag({ content: '#epocas, #botones, #leyenda { visibility: hidden !important; }' })
await pagina.waitForTimeout(1500)
const dosCuadros = () => pagina.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

/**
 * Milisegundos por cuadro dibujando sin parar (gl.finish después de cada uno): la mediana. La cámara va y
 * viene más de un texel del mapa de sombras en cada cuadro: como al arrastrar, las sombras se rehacen siempre.
 */
const medir = (n) => pagina.evaluate((n) => {
  const { renderer, cam, acabado } = window.lab
  const gl = renderer.getContext()
  const x0 = cam.goal.x
  window.dibujarCuadro() // el texel del mapa de sombras es el de esta vista
  const paso = 1.5 * (acabado?.estado.texel ?? 0.01)
  const antes = acabado?.estado.cuadrosDeSombra ?? 0
  const t = []
  for (let i = 0; i < n; i++) {
    cam.jump({ x: x0 + (i % 2) * paso })
    const t0 = performance.now()
    window.dibujarCuadro()
    gl.finish()
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
    t.push(performance.now() - t0)
  }
  t.sort((a, b) => a - b)
  return { mediana: t[n >> 1], p90: t[Math.floor(n * 0.9)], sombras: (acabado?.estado.cuadrosDeSombra ?? 0) - antes }
}, n)

let epocaActual = null
let modoActual = null
const filtro = new RegExp(process.env.FILTRO ?? '')
for (const { nombre, epoca, modo, vista, ojo, mira } of (MEDIR ? MEDIDAS : CONTROL).filter((t) => filtro.test(t.nombre))) {
  if (modo !== modoActual) {
    await pagina.evaluate((c) => { window.lab.alternarColor(c); window.lab.ciudad.U.uColor.value = c ? 1 : 0 }, modo !== 'tinta')
    await pagina.waitForTimeout(modoActual === null ? 2500 : 300) // la primera vez, la máscara de suelo
    modoActual = modo
  }
  if (epoca !== epocaActual) {
    await pagina.evaluate((k) => window.lab.lineaDeTiempo.elegir(k), epoca)
    await pagina.waitForTimeout(600)
    await pagina.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 8999 })
    await pagina.waitForTimeout(3500)
    epocaActual = epoca
  }
  await pagina.evaluate((v) => {
    if (window.camaraDelVisor) { window.lab.cam.update = window.camaraDelVisor; window.camaraDelVisor = null }
    window.lab.cam.jump(v)
    window.lab.pedirCuadro(4)
  }, vista ?? { x: mira[0], z: mira[2], dist: 60, yaw: 0, pitch: 0.3 })
  await dosCuadros()
  await pagina.waitForTimeout(1500) // las teselas finas de cerca
  await pagina.evaluate(() => window.lab.pedirCuadro(4))
  await dosCuadros()
  if (ojo) {
    await pagina.waitForTimeout(400)
    await pagina.evaluate(([o, m]) => {
      const { camera, sueloEn, cam } = window.lab
      // la cámara del visor se queda quieta: si no, el próximo cuadro (la ola sigue pidiendo) pisaría la de mano
      window.camaraDelVisor = cam.update
      cam.update = () => false
      camera.position.set(o[0], sueloEn(o[0], o[2]) + o[1], o[2])
      camera.lookAt(m[0], sueloEn(m[0], m[2]) + m[1], m[2])
      camera.updateMatrixWorld()
      window.dibujarCuadro()
    }, [ojo, mira])
  }
  if (!MEDIR) await pagina.screenshot({ path: `${carpeta}/${nombre}.png`, timeout: 150000 })
  const t = MEDIR ? await medir(CUADROS_MEDIDOS) : null
  console.log('toma', nombre, t ? `${t.mediana.toFixed(2)} ms/cuadro (p90 ${t.p90.toFixed(2)}) · ${t.sombras} mapas de sombras` : '')
}
await navegador.close()
