// Capturas para calibrar los estilos por época contra las referencias de fuentes/imagenes (no es un test):
//   node tests/e2e/capturas-estilos.mjs [url] [carpeta] [épocas, p. ej. 2,3,4,5]
// Chromium headless con SwiftShader (lento: minutos por época) o, con GPU=1, con la placa de video;
// la ciudad levantada y en color, las mismas vistas en cada época.
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'test-results/capturas-estilos'
const EPOCAS = (process.argv[4] ?? '2,3,4,5').split(',').map(Number)
// vistas: `ojo` y `mira` en metros desde la Plaza Bolívar (x al este, z al sur), `alto` sobre el suelo
const VISTAS = {
  // desde El Calvario hacia el noreste: la litografía de 1839 y la panorámica de ~1903
  calvario: { ojo: [-830, 10], alto: 30, mira: [200, -800], baja: 110 },
  // sobre el centro, hacia el norte: el núcleo comercial entre el Teatro Municipal y la plaza
  centro: { ojo: [-150, 1150], alto: 420, mira: [-60, 150], baja: 420 },
  nucleo: { ojo: [260, 620], alto: 150, mira: [-60, 130], baja: 150 },
  // La Pastora a la altura de la gente: calle abajo, hacia la iglesia (foto de ~1892), y calle arriba,
  // hacia el Ávila (calle Real, 1930)
  'pastora-sur': { ojo: [-512, -1142], alto: 2.5, mira: [-452, -1000], baja: 4 },
  'pastora-norte': { ojo: [-467, -1033], alto: 2.5, mira: [-600, -1387], baja: -6 },
}

const conPlaca = ['--use-angle=gl-egl', '--ignore-gpu-blocklist', '--enable-gpu']
const navegador = await chromium.launch({ args: process.env.GPU ? conPlaca : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const pagina = await navegador.newPage({ viewport: { width: 1600, height: 900 } })
pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
await mkdir(carpeta, { recursive: true })
await pagina.goto(`${url}?capture&sinintro`)
await pagina.waitForFunction(() => window.lab?.ready && window.lab.relieve && window.lab.lineaDeTiempo && window.lab.arboles, null, { timeout: 180000 })
await pagina.evaluate(() => { window.lab.levantar(true); window.lab.alternarColor(true) })
// la ola termina cuando el suelo de la esquina más lejana de la hoja ya se hinchó entero (como capturas.mjs)
await pagina.waitForFunction(() => {
  const { relieve, relieveU, sueloEn, coords: { hoja } } = window.lab
  const [x, z] = [hoja.x0 + hoja.ancho, hoja.z0 + hoja.alto]
  return Math.abs(sueloEn(x, z) - relieve.alturaEn(x, z) * relieveU.uExageracion.value) < 1e-6
}, null, { polling: 2000, timeout: 900000 })
await pagina.waitForFunction(() => window.lab.ciudad.U.uColor.value > 0.999, null, { polling: 1000, timeout: 300000 })

/** Pone la cámara a mano (la del visor no baja de 12 m), dibuja un cuadro y lo devuelve como PNG: en el
 *  mismo turno, antes de que el visor vuelva a dibujar con su cámara. */
const mirar = (v) => pagina.evaluate(({ ojo, alto, mira, baja }) => {
  const { camera, renderer, scene, sueloEn } = window.lab
  const antes = [camera.position.clone(), camera.quaternion.clone()]
  camera.position.set(ojo[0], sueloEn(ojo[0], ojo[1]) + alto, ojo[1])
  camera.lookAt(mira[0], sueloEn(ojo[0], ojo[1]) + alto - baja, mira[1])
  camera.updateMatrixWorld()
  renderer.render(scene, camera)
  const png = renderer.domElement.toDataURL('image/png')
  camera.position.copy(antes[0])
  camera.quaternion.copy(antes[1])
  camera.updateMatrixWorld()
  return png.slice(png.indexOf(',') + 1)
}, v)

for (const e of EPOCAS) {
  const año = await pagina.evaluate((k) => {
    window.lab.lineaDeTiempo.elegir(k)
    return document.querySelector(`#epocas .años button[data-indice="${k}"]`).textContent
  }, e)
  await pagina.waitForFunction((k) => window.lab.ciudad.U.uEpocaA.value === k, e, { timeout: 60000 })
  // con SwiftShader cada cuadro tarda: se adelanta la ola hasta casi el final y se la deja terminar
  await pagina.evaluate(() => { window.lab.ciudad.U.uOlaEpoca.value = 8999 })
  await pagina.waitForFunction(() => window.lab.ciudad.U.uOlaEpoca.value >= 9000, null, { polling: 500, timeout: 120000 })
  for (const [nombre, v] of Object.entries(VISTAS)) {
    await writeFile(`${carpeta}/${año}-${nombre}.png`, Buffer.from(await mirar(v), 'base64'))
    console.log('captura', año, nombre)
  }
}
await navegador.close()
