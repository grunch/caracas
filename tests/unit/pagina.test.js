import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// La página que ven los lectores de pantalla y los buscadores (T72): index.html, robots.txt y sitemap.xml.
const leer = (ruta) => readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8')
const html = leer('index.html')
const SITIO = 'https://caracas.city/'
const meta = (nombre) => html.match(new RegExp(`<meta (?:name|property)="${nombre}" content="([^"]*)"`))?.[1]

describe('index.html: accesibilidad', () => {
  it('deja ampliar la página (WCAG 1.4.4): el viewport no bloquea el zoom', () => {
    const viewport = meta('viewport')
    expect(viewport).toBeTruthy()
    expect(viewport).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/)
  })

  it('tiene un solo h1, con el título, y una descripción para quien no ve la vista', () => {
    const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)]
    expect(h1).toHaveLength(1)
    expect(h1[0][1].trim()).toBe('Caracas, de 1772 a 1936')
    expect(html).toMatch(/<div id="sobre" class="solo-lector">[\s\S]*<h1>[\s\S]*<p>[^<]{80,}/)
  })

  it('el aviso de carga se anuncia y sin JavaScript se explica qué falta', () => {
    expect(html).toMatch(/<div id="loading" role="status"[^>]*>/)
    expect(html).toMatch(/<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/)
  })

  it('la clase solo-lector oculta a la vista sin ocultar a los lectores de pantalla', () => {
    const regla = html.match(/\.solo-lector\{([^}]*)\}/)?.[1] ?? ''
    expect(regla).toMatch(/position:absolute/)
    expect(regla).toMatch(/clip/)
    expect(regla).not.toMatch(/display:\s*none|visibility:\s*hidden/)
  })
})

describe('index.html: buscadores y redes', () => {
  it('declara la dirección canónica del sitio', () => {
    expect(html).toContain(`<link rel="canonical" href="${SITIO}">`)
    expect(meta('og:url')).toBe(SITIO)
  })

  it('la descripción tiene un largo que los buscadores muestran entera', () => {
    const d = meta('description')
    expect(d.length).toBeGreaterThanOrEqual(50)
    expect(d.length).toBeLessThanOrEqual(200)
  })

  it('trae datos estructurados (JSON-LD) válidos: el sitio, en español, sobre Caracas', () => {
    const bloque = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
    const datos = JSON.parse(bloque)
    expect(datos).toMatchObject({ '@context': 'https://schema.org', '@type': 'WebSite', url: SITIO, inLanguage: 'es' })
    expect(datos.name).toBe('Caracas, de 1772 a 1936')
    expect(datos.about).toMatchObject({ '@type': 'City', name: 'Caracas' })
    expect(datos.creator).toMatchObject({ '@type': 'Person', url: 'https://x.com/negrunch' })
    expect(datos.license).toBe('https://www.gnu.org/licenses/agpl-3.0.html')
  })
})

describe('robots.txt y sitemap.xml', () => {
  it('robots.txt deja pasar y apunta al sitemap', () => {
    const robots = leer('public/robots.txt')
    expect(robots).toMatch(/^User-agent: \*$/m)
    expect(robots).toMatch(/^Allow: \/$/m)
    expect(robots).toContain(`Sitemap: ${SITIO}sitemap.xml`)
  })

  it('el sitemap lista la página', () => {
    const sitemap = leer('public/sitemap.xml')
    expect(sitemap).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/)
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(sitemap).toContain(`<loc>${SITIO}</loc>`)
    expect(sitemap).toContain(`<loc>${SITIO}edificios.html</loc>`)
  })
})
