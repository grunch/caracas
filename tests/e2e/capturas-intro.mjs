// Capturas de la bienvenida y del «Acerca» (no es un test): [ANGLE=gl] node tests/e2e/capturas-intro.mjs [url] [carpeta]
// La bienvenida en escritorio, en teléfono y en teléfono acostado; cada sección del panel en escritorio y en
// teléfono; y el panel con y sin la lista de fuentes (datos/creditos.json).
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const url = process.argv[2] ?? 'http://localhost:5199/'
const carpeta = process.argv[3] ?? 'test-results/capturas-intro'
const gl = process.env.ANGLE === 'gl' ? ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const PANTALLAS = {
  escritorio: { viewport: { width: 1440, height: 900 } },
  telefono: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  acostado: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true },
}
const SECCIONES = ['viendo', 'moverte', 'epocas', 'fuentes', 'colabora', 'creditos']

const navegador = await chromium.launch({ args: gl })
await mkdir(carpeta, { recursive: true })
for (const [nombre, opciones] of Object.entries(PANTALLAS)) {
  const contexto = await navegador.newContext({ ...opciones, reducedMotion: 'reduce' })
  const pagina = await contexto.newPage()
  pagina.on('pageerror', (e) => console.error('pageerror:', e.message))
  await pagina.goto(`${url}?intro`)
  await pagina.waitForFunction(() => window.lab?.ready && window.lab.acerca.intro, null, { timeout: 120000 })
  await pagina.waitForTimeout(2500) // el plano de fondo
  await pagina.screenshot({ path: `${carpeta}/intro-${nombre}.png` })
  if (nombre !== 'acostado') {
    await pagina.getByRole('button', { name: 'Qué estoy viendo' }).click()
    await pagina.waitForFunction(() => window.lab.acerca.listo)
    for (const seccion of SECCIONES) {
      await pagina.evaluate((s) => window.lab.acerca.irA(s), seccion)
      await pagina.waitForTimeout(150)
      await pagina.screenshot({ path: `${carpeta}/acerca-${nombre}-${seccion}.png` })
    }
    // las fotos, desplegadas
    await pagina.locator('#acerca details summary').click()
    await pagina.locator('#acerca details').scrollIntoViewIfNeeded()
    await pagina.evaluate(() => { const c = document.querySelector('#acerca .cuerpo'); c.scrollTop = document.querySelector('#acerca details').offsetTop - c.offsetTop })
    await pagina.waitForTimeout(150)
    await pagina.screenshot({ path: `${carpeta}/acerca-${nombre}-fotos.png` })
    await pagina.keyboard.press('Escape')
    await pagina.waitForTimeout(300)
    await pagina.screenshot({ path: `${carpeta}/visor-${nombre}.png` })
  }
  await contexto.close()
}
// sin la lista de fuentes ni la línea de tiempo (como la ciudad de demostración de CI)
const contexto = await navegador.newContext({ ...PANTALLAS.escritorio, reducedMotion: 'reduce' })
const pagina = await contexto.newPage()
await pagina.route(/\/datos\/(creditos|crece)\.json$/, (ruta) => ruta.fulfill({ status: 404 }))
await pagina.goto(`${url}?sinintro`)
await pagina.waitForFunction(() => window.lab?.ready, null, { timeout: 120000 })
await pagina.keyboard.press('?')
await pagina.waitForFunction(() => window.lab.acerca.listo)
for (const seccion of ['epocas', 'fuentes']) {
  await pagina.evaluate((s) => window.lab.acerca.irA(s), seccion)
  await pagina.waitForTimeout(150)
  await pagina.screenshot({ path: `${carpeta}/acerca-sin-datos-${seccion}.png` })
}
await navegador.close()
console.log(`capturas en ${carpeta}`)
