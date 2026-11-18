// Lógica pura del catálogo de mapas (la usa tools/catalogo.mjs).

export const PERIODOS = [
  { id: 'colonial', hasta: 1810, nombre: 'Colonia (hasta 1810)' },
  { id: 'republica-temprana', hasta: 1869, nombre: 'Independencia y república temprana (1811–1869)' },
  { id: 'guzmancista', hasta: 1899, nombre: 'Guzmán Blanco y fin de siglo (1870–1899)' },
  { id: 'inicios-siglo-xx', hasta: 1935, nombre: 'Castro y Gómez (1900–1935)' },
  { id: 'modernizacion', hasta: 1960, nombre: 'Modernización (1936–1960)' },
  { id: 'contemporaneo', hasta: Infinity, nombre: 'Después de 1960' },
]

/** Mínimo de megapíxeles para que un escaneo sirva de plano base (≈ 10.000 × 8.000 px). */
const MP_MINIMO_BASE = 80

export function periodoDe(año) {
  const n = Number(año)
  if (!Number.isFinite(n) || n <= 0) return 'sin-fecha'
  return PERIODOS.find((p) => n <= p.hasta).id
}

export function armarCatalogo(entradas) {
  return entradas
    .flatMap(({ carpeta, ficha: cruda }) => {
      const ficha = normalizarFicha(cruda)
      if (!ficha) return []
      const año = Number(ficha.año) > 0 ? Number(ficha.año) : null
      const megapixeles = ficha.ancho && ficha.alto ? Math.round((ficha.ancho * ficha.alto) / 1e6) : null
      const candidato_base =
        (megapixeles ?? 0) >= MP_MINIMO_BASE &&
        ficha.dominio_publico === true &&
        ficha.muestra_interior_manzanas === 'si'
      const representado = Number(ficha.año_representado) > 0 ? Number(ficha.año_representado) : null
      return [{ ...ficha, carpeta, año, periodo: periodoDe(año ?? representado), orden: año ?? representado, megapixeles, candidato_base }]
    })
    .sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity) || a.carpeta.localeCompare(b.carpeta))
}

// --- validación y sanitización (las fichas vienen de descargas: datos no confiables) ---

const positivo = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

/** Devuelve una copia saneada de la ficha, o null si no es un objeto. */
export function normalizarFicha(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  return { ...v, ancho: positivo(v.ancho), alto: positivo(v.alto) }
}

/** Texto seguro para una celda de tabla Markdown. */
export function celda(v) {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\\`|[\]()*_]/g, (c) => `\\${c}`)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Link Markdown solo para URLs http(s); si no, el texto solo. `texto` ya debe venir escapado. */
export function enlace(url, texto) {
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return texto
    return `[${texto}](${u.href.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/ /g, '%20')})`
  } catch {
    return texto
  }
}

export const esCarpetaValida = (nombre) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(nombre)

/** Formatos raster que aceptamos como escaneo original (nada de svg/mvg/msl/parciales). */
export const FORMATOS_ORIGINAL = { jpg: 'JPEG', jpeg: 'JPEG', png: 'PNG', tif: 'TIFF', tiff: 'TIFF', jp2: 'JP2', webp: 'WEBP' }
export function esOriginalValido(nombre) {
  const m = /^original\.([a-z0-9]+)$/i.exec(nombre)
  return Boolean(m && FORMATOS_ORIGINAL[m[1].toLowerCase()])
}

export function markdown(catalogo) {
  const filas = ['# Catálogo de mapas de Caracas', '',
    `Generado por \`npm run catalogo\` · ${catalogo.length} mapas · ★ = candidato a plano base (≥ ${MP_MINIMO_BASE} MP, dominio público, dibuja el interior de las manzanas).`, '']
  for (const p of [...PERIODOS, { id: 'sin-fecha', nombre: 'Sin fecha' }]) {
    const grupo = catalogo.filter((m) => m.periodo === p.id)
    if (!grupo.length) continue
    filas.push(`## ${p.nombre}`, '', '| | Año | Título | Autor | Institución | Píxeles | Licencia | Interior manzanas | Carpeta |', '|---|---|---|---|---|---|---|---|---|')
    for (const m of grupo) {
      const px = m.ancho && m.alto ? `${m.ancho}×${m.alto} (${m.megapixeles} MP)` : '—'
      const año = m.año_representado ? `${m.año ?? 's.f.'} (rep. ${m.año_representado})` : m.año
      filas.push(`| ${m.candidato_base ? '★' : ''} | ${celda(año)} | ${enlace(m.url_fuente, celda(m.titulo))} | ${celda(m.autor)} | ${celda(m.institucion)} | ${px} | ${celda(m.licencia)} | ${celda(m.muestra_interior_manzanas)} | ${celda(m.carpeta)} |`)
    }
    filas.push('')
  }
  return filas.join('\n')
}
