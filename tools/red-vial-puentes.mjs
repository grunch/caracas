/**
 * Los cruces del Guaire como tramos del registro vial (#269, con el calce de #272): cada plano que el calce leyó
 * (docs/puentes-guaire-calce.json) da una etapa con lo que ESE plano dibuja: nombre, cabezas, ancho y su error.
 * No usa las posiciones «adoptadas» para instalar los modelos: esas son una decisión, no una lectura.
 * Lógica pura: no lee archivos ni toca el calce de entrada.
 */
import { ANIOS_RED, SISTEMA_RED, VERSION_RED, etapaDePlano, validarRedVial } from './red-vial-lib.mjs'

/** Lectura a ojo sobre el plano base, que no tiene error de calce: ±2 px = ±1 m (metodo.lectura del calce). */
export const LECTURA_M = 1
const PREFIJO = 'puente-'
const metros = (n) => `${String(n).replace('.', ',')} m`

/** «I Sucre (S. 7), II de Hierro (S. 5)» → { I: 'Sucre', II: 'de Hierro' }. */
function leyendaNumerada(leyenda) {
  const nombres = {}
  if (typeof leyenda !== 'string') return nombres
  const lista = leyenda.includes(':') ? leyenda.slice(leyenda.indexOf(':') + 1) : leyenda
  for (const parte of lista.split(',')) {
    const m = /^\s*([IVXLC]+)\s+([^(]+?)\s*(?:\(.*)?$/.exec(parte)
    if (m) nombres[m[1]] = m[2]
  }
  return nombres
}

/**
 * El nombre del cruce según el plano: su rótulo, o el nombre que la leyenda da a su número romano.
 * null si el plano no lo rotula o si su leyenda no está transcrita en el calce (los números arábigos de 1889).
 */
export function nombreEnElPlano(lectura, plano) {
  const dibuja = lectura?.dibuja ?? ''
  if (/rotulad|rótulo/.test(dibuja)) return /«([^»]+)»/.exec(dibuja)?.[1] ?? null
  const numero = /numerad[ao]\s+([IVXLC]+)\b/.exec(dibuja)?.[1]
  return numero ? (leyendaNumerada(plano?.leyenda)[numero] ?? null) : null
}

/** El mayor desvío (m) que el calce anotó entre este plano y el de 1936, o null si no anotó ninguno. */
function desvioMaximo(lectura) {
  const d = lectura.desvio_del_centro_de_1936_m ?? lectura.desvio_del_eje_de_1936_m
  if (typeof d === 'number') return d
  if (!d || typeof d !== 'object') return null
  const valores = Object.values(d).filter((v) => typeof v === 'number')
  return valores.length ? Math.max(...valores) : null
}

/** Si el plano dibuja el cruce más lejos del de 1936 que el error máximo de su propio calce, las dos lecturas chocan. */
function contradiccionDePosicion(lectura, plano, anio) {
  const desvio = desvioMaximo(lectura), maximo = plano?.calce?.max_m
  if (desvio === null || typeof maximo !== 'number' || desvio <= maximo) return []
  return [{
    asunto: 'posición del cruce', estado: 'pendiente',
    afirmaciones: [
      { dice: `El plano de ${anio} lo dibuja a ${metros(desvio)} de donde lo dibuja el de 1936; el error máximo de su calce es de ${metros(maximo)}.`, fuente: `plano${anio}` },
      { dice: 'El plano de 1936 es la base del sitio: ahí está la posición con la que se compara.', fuente: 'plano1936' },
    ],
  }]
}

const cabeza = (c) => (Array.isArray(c?.mosaico) && c.mosaico.length === 2 ? [...c.mosaico] : null)

/** Un punto del eje de la calzada cuando el plano no marca las cabezas: sirve para ubicar el cruce, no para medirlo. */
function puntoDelEje(lectura) {
  if (Array.isArray(lectura.eje?.punto)) return [...lectura.eje.punto]
  const e = lectura.eje_en_y
  return typeof e?.x === 'number' && typeof e?.y === 'number' ? [e.x, e.y] : null
}

/** La etapa que da un plano: ausente si dice que no hay puente; medible si deja leer las dos cabezas. */
function etapaDeLectura(lectura, plano, anio, fuentes) {
  const error_m = typeof plano?.calce?.p90_m === 'number' ? plano.calce.p90_m : LECTURA_M
  const base = { error_m, nombre: nombreEnElPlano(lectura, plano), nota: lectura.dibuja ?? null }
  if (/^no hay puente/.test(lectura.dibuja ?? '')) return etapaDePlano(fuentes, anio, { ...base, estado: 'ausente' })
  const contradicciones = contradiccionDePosicion(lectura, plano, anio)
  const comun = { ...base, contradicciones, certeza: contradicciones.length ? 'dudosa' : 'documentada', ancho_m: lectura.ancho_de_calzada_m ?? null }
  const norte = cabeza(lectura.cabeza_norte), sur = cabeza(lectura.cabeza_sur)
  if (norte && sur) return etapaDePlano(fuentes, anio, { ...comun, puntos: [norte, sur] })
  return etapaDePlano(fuentes, anio, { ...comun, medible: false, punto_del_eje: puntoDelEje(lectura) })
}

/**
 * calce (docs/puentes-guaire-calce.json) → registro con un tramo por cruce (`puente:<nombre>`).
 * `fuentes` trae plano<año> de cada plano leído (fuenteDeFicha); solo se copian las que se usan.
 */
export function importarPuentes(calce, fuentes) {
  const usadas = {}, tramos = []
  const usar = (id) => {
    if (!fuentes?.[id]) throw new Error(`falta la fuente ${id}`)
    usadas[id] = structuredClone(fuentes[id])
  }
  for (const [clave, puente] of Object.entries(calce ?? {})) {
    if (!clave.startsWith(PREFIJO) || !puente || typeof puente !== 'object') continue
    const etapas = []
    for (const anio of ANIOS_RED) {
      const lectura = puente[anio]
      if (!lectura) continue
      usar(`plano${anio}`)
      const etapa = etapaDeLectura(lectura, calce.planos?.[anio], anio, fuentes)
      if (etapa.contradicciones.length) usar('plano1936')
      etapas.push(etapa)
    }
    tramos.push({
      id: `puente:${clave.slice(PREFIJO.length)}`, tipo: 'puente', nota: puente.cruce ?? null,
      procedencia: { archivo: 'docs/puentes-guaire-calce.json', clave }, etapas,
    })
  }
  return validarRedVial({ version: VERSION_RED, sistema: SISTEMA_RED, fuentes: usadas, tramos })
}
