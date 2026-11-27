// Capturas comparables del Hospital Vargas: node tests/e2e/capturas-hospital-vargas.mjs [url] [carpeta]
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'docs/capturas/hospital-vargas'
const años = [[3, '1889'], [4, '1911'], [5, '1936'], [6, '1946']]
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', e => console.error('pageerror:', e.message))
await mkdir(carpeta, { recursive: true })
await page.goto(`${url}?capture&sinintro&sinsw`)
await page.waitForFunction(() => window.lab?.ready && window.lab?.lineaDeTiempo, null, { timeout: 180000 })
await page.evaluate(() => {
  window.lab.levantar(true)
  window.lab.ciudad.U.uOla.value = 1e5
  window.lab.ciudad.U.uOlaEpoca.value = 8999
  window.lab.alternarColor(true)
  window.lab.cam.jump({ x: 414, z: -1168, dist: 650, yaw: 0.1, pitch: 1.12 })
})
await page.waitForFunction(() => window.lab.ciudad.U.uColor.value === 1, null, { timeout: 60000 })
await page.waitForTimeout(5000)
for (const [epoca, año] of años) {
  await page.evaluate(e => window.lab.lineaDeTiempo.elegir(e), epoca)
  await page.waitForFunction(e => window.lab.ciudad.U.uEpocaA.value === e, epoca, { timeout: 60000 })
  await page.evaluate(() => window.lab.pedirCuadro(4))
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${carpeta}/${año}.png`, timeout: 150000 })
  console.log(`captura ${año}`)
}
await page.evaluate(() => {
  window.lab.lineaDeTiempo.elegir(4)
  window.lab.cam.jump({ x: 414, z: -1168, dist: 490, yaw: 0.75, pitch: 0.72 })
})
await page.waitForFunction(() => window.lab.ciudad.U.uEpocaA.value === 4, null, { timeout: 60000 })
await page.waitForTimeout(1600)
await page.screenshot({ path: `${carpeta}/perspectiva-1911.png`, timeout: 150000 })
console.log('captura 1911 desde fachada')
await browser.close()
