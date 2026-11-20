/**
 * La vitrina (T71, specs/05): el visor embebido en un <iframe> que se controla con postMessage({ vitrina: … }):
 * ir a un hito, elegir época, levantar la ciudad y girar alrededor. La usa edificios.html. Lógica pura: qué
 * órdenes se aceptan y qué secciones tiene la página.
 */
import { AÑOS_DE_EPOCA } from './fichas.js'

const ID = /^[a-z0-9-]{1,60}$/
const MAX_EPOCA = AÑOS_DE_EPOCA.length - 1

/**
 * La orden de un MessageEvent, o null. Solo del mismo origen (`origen`, location.origin) y solo las conocidas:
 * { vitrina: { ir: 'id' } } · { vitrina: { epoca: n } } · { vitrina: { levantar: true } } · { vitrina: { girar: bool } },
 * y la pregunta { vitrina: '¿lista?' } de la página que empezó a escuchar después del aviso «lista».
 */
export function ordenDeVitrina(evento, origen) {
  if (evento?.origin !== origen) return null
  const v = evento.data?.vitrina
  if (v === '¿lista?') return { tipo: 'pregunta' }
  if (!v || typeof v !== 'object') return null
  if ('ir' in v) return typeof v.ir === 'string' && ID.test(v.ir) ? { tipo: 'ir', id: v.ir } : null
  if ('epoca' in v) return Number.isInteger(v.epoca) && v.epoca >= 0 && v.epoca <= MAX_EPOCA ? { tipo: 'epoca', indice: v.epoca } : null
  if (v.levantar === true) return { tipo: 'levantar' }
  if (typeof v.girar === 'boolean') return { tipo: 'girar', si: v.girar }
  return null
}

/**
 * Los artículos de edificios.html: uno por edificio modelado (las marcas con `hito`), por época de aparición y
 * luego en el orden de los datos. { id, año, epoca, nombre (el último), antes (el primero, si cambió), texto }.
 */
export function seccionesDeEdificios(marcas, fichas) {
  return marcas
    .map((m, orden) => ({ m, orden }))
    .filter(({ m }) => m.hito)
    .sort((a, b) => a.m.nace - b.m.nace || a.orden - b.orden)
    .map(({ m }) => {
      const primero = m.nombres[0].nombre
      const ultimo = m.nombres.at(-1).nombre
      const texto = fichas[m.id]?.textos?.[0]?.[1] ?? m.nombres.find((n) => n.nota)?.nota ?? ''
      return { id: m.id, año: AÑOS_DE_EPOCA[m.nace], epoca: m.nace, nombre: ultimo, antes: primero === ultimo ? null : primero, texto }
    })
}

const FRANJA_DEL_MEDIO = 0.1 // la parte de la ventana, en el medio, donde se «lee» un edificio

/**
 * El rootMargin del IntersectionObserver de edificios.html para quedarse con la franja del medio de la ventana,
 * en píxeles de `alto`: la especificación resuelve los porcentajes de rootMargin contra el ANCHO de la raíz,
 * también los de arriba y abajo, así que '-45%' no sirve en una ventana apaisada. Sin alto, sin margen.
 */
export function margenDelMedio(alto) {
  const m = Math.floor((alto * (1 - FRANJA_DEL_MEDIO)) / 2)
  return m > 0 ? `-${m}px 0px -${m}px 0px` : '0px 0px 0px 0px'
}
