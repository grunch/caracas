// Capturas del papel antes de la ciudad (no es un test): [ANGLE=gl] node tests/e2e/capturas-papel.mjs [url] [carpeta] [épocas] [vistas-json]
// En tinta, con la ciudad levantada, la misma cámara en cada época: antes (la hoja de 1936 entera, como
// era: se apagan crece.png y la máscara de rótulos) y después. Además, la ola a medio camino, la ciudad
// acostada en 1772 y el visor del plano de la época. Con ANGLE=gl mide el tiempo por cuadro.
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'test-results/capturas-papel'
const epocas = (process.argv[4] ?? '1,2,3,4,5').split(',').map(Number)
const VISTAS = process.argv[5] ? JSON.parse(process.argv[5]) : {
  lejos: { x: 0, z: 300, dist: 6500, yaw: 0, pitch: 0.95 },
  medio: { x: 0, z: 150, dist: 2600, yaw: 0, pitch: 0.85 },
  borde: { x: -560, z: 380, dist: 620, yaw: 0.6, pitch: 0.62 },
  plaza: { x: 0, z: 60, dist: 900, yaw: 0.25, pitch: 0.7 },
}
const GPU = process.env.ANGLE === 'gl'
const CUADROS_MEDIDOS = 60

const navegador = await chromium.launch({
  args: GPU ? ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } })
pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
pagina.on('console', (m) => { if (m.type() === 'error') console.log('consola:', m.text()) })
await mkdir(carpeta, { recursive: true })
await pagina.goto(`${url}?capture&sinintro`)
await pagina.waitForFunction(() => window.lab?.ready && window.lab.relieve && window.lab.lineaDeTiempo && window.lab.arboles, null, { timeout: 120000 })
await pagina.evaluate(() => window.lab.levantar(true))
await pagina.waitForFunction(() => {
  const { relieve, relieveU, sueloEn, coords: { hoja } } = window.lab
  const [x, z] = [hoja.x0 + hoja.ancho, hoja.z0 + hoja.alto]
  return Math.abs(sueloEn(x, z) - relieve.alturaEn(x, z) * relieveU.uExageracion.value) < 1e-6
}, null, { polling: 2000, timeout: 900000 })
// las máscaras que usa la hoja en tinta: crece.png (1163 px de ancho), el suelo y los rótulos
await pagina.waitForFunction(() => {
  const { uCrece, uSuelo, uRotulos } = window.lab.ciudad.U
  return uCrece.value.image.width > 1 && uSuelo.value && uRotulos.value.image.width > 1
}, null, { timeout: 120000 })
const cuadros = () => pagina.evaluate(() => new Promise((r) => { window.lab.pedirCuadro(4); requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))) }))

/** "Antes": todo urbanizado desde siempre y sin máscara de rótulos; la hoja queda como la de 1936. */
const antes = (si) => pagina.evaluate((si) => {
  const { U } = window.lab.ciudad
  window.papelGuardado ??= { crece: U.uCrece.value, rotulos: U.uRotulos.value }
  const uno = (color) => {
    const lienzo = Object.assign(document.createElement('canvas'), { width: 1, height: 1 })
    const g = lienzo.getContext('2d')
    g.fillStyle = color
    g.fillRect(0, 0, 1, 1)
    const t = U.uCrece.value.clone()
    t.source = new t.source.constructor(lienzo)
    t.needsUpdate = true
    return t
  }
  window.papelDeAntes ??= { crece: uno('#fff'), rotulos: uno('#000') }
  const de = si ? window.papelDeAntes : window.papelGuardado
  U.uCrece.value = de.crece
  U.uRotulos.value = de.rotulos
}, si)

/** Milisegundos por cuadro dibujando sin parar, con el acabado (la mediana). */
const medir = () => pagina.evaluate((n) => {
  const { renderer, acabado } = window.lab
  const gl = renderer.getContext()
  const t = []
  for (let i = 0; i < n; i++) {
    const t0 = performance.now()
    acabado.dibujar()
    gl.finish()
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
    t.push(performance.now() - t0)
  }
  t.sort((a, b) => a - b)
  return t[n >> 1]
}, CUADROS_MEDIDOS)

async function elegir(i) {
  await pagina.evaluate((k) => window.lab.lineaDeTiempo.elegir(k), i)
  await pagina.waitForFunction((k) => window.lab.ciudad.U.uEpocaA.value === k, i, { timeout: 60000 })
  await pagina.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 8999 })
  await pagina.waitForTimeout(1500)
}
const foto = async (nombre) => {
  await cuadros()
  await pagina.waitForTimeout(700) // el fundido de los carteles
  await pagina.screenshot({ path: `${carpeta}/${nombre}.png`, timeout: 150000 })
}

const años = await pagina.evaluate(() => Object.fromEntries([...document.querySelectorAll('#epocas .años button:not(.andar)')].map((b) => [b.dataset.indice, b.textContent])))
for (const i of epocas) {
  await elegir(i)
  for (const [vista, v] of Object.entries(VISTAS)) {
    await pagina.evaluate((v) => window.lab.cam.jump(v), v)
    const ms = {}
    for (const cual of ['antes', 'despues']) {
      await antes(cual === 'antes')
      await foto(`${años[i]}-${vista}-${cual}`)
      if (GPU) ms[cual] = await medir()
    }
    console.log(años[i], vista, GPU ? `antes ${ms.antes.toFixed(2)} ms · después ${ms.despues.toFixed(2)} ms` : '')
  }
}

// la ola a medio camino: de 1772 a 1911, con el frente a 900 m de la plaza
await elegir(1)
await pagina.evaluate((v) => window.lab.cam.jump(v), { x: 0, z: 200, dist: 4200, yaw: 0, pitch: 0.9 })
await pagina.evaluate(() => {
  // el frente se congela: el bucle de dibujo no puede avanzarlo
  const { U } = window.lab.ciudad
  U.uEpocaDe.value = 1
  U.uEpocaA.value = 4
  Object.defineProperty(U.uOlaEpoca, 'value', { get: () => 900, set: () => {}, configurable: true })
})
await foto('ola-1772-a-1911')
await pagina.evaluate(() => {
  const { U } = window.lab.ciudad
  Object.defineProperty(U.uOlaEpoca, 'value', { value: 9000, writable: true, configurable: true })
  U.uEpocaDe.value = U.uEpocaA.value = 1
})

// la ciudad acostada en 1772
await pagina.evaluate(() => { window.lab.levantar(false); window.lab.ciudad.U.uOla.value = 0 })
for (const vista of ['medio', 'plaza']) {
  if (!VISTAS[vista]) continue
  await pagina.evaluate((v) => window.lab.cam.jump(v), VISTAS[vista])
  await foto(`1772-acostada-${vista}`)
}

// el visor del plano de la época
if (await pagina.locator('#ver-plano').count()) {
  await pagina.click('#ver-plano')
  await pagina.waitForFunction(() => document.querySelector('#visor-plano img')?.complete, null, { timeout: 60000 })
  await pagina.waitForTimeout(800)
  await pagina.screenshot({ path: `${carpeta}/visor-1772.png` })
  await pagina.mouse.move(720, 450)
  await pagina.mouse.wheel(0, -900)
  await pagina.waitForTimeout(2500)
  await pagina.screenshot({ path: `${carpeta}/visor-1772-cerca.png` })
  await pagina.keyboard.press('Escape')
}
await navegador.close()
