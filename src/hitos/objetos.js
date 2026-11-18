/**
 * Objetos de plaza armados con las piezas: faroles de hierro, la estatua ecuestre sobre su pedestal, los
 * puestos del mercado y las portadas y arquerías de sus galerías. Siluetas sencillas pero reconocibles,
 * sacadas de las fotos y grabados (fuentes/imagenes/README.md).
 */
import { Matrix4 } from 'three'
import { MAT } from './lienzo.js'
import { TONO, caja, tronco, barra, bulto, tejado, arqueria, fronton, columna, cornisa, vano } from './piezas.js'

/** La linterna de un farol: vidrio más ancho arriba, sombrerete y perilla. El pintor está en su base. */
function linterna(p, { escala = 1 } = {}) {
  const e = escala
  tronco(p, { radio: 0.07 * e, radioArriba: 0.13 * e, alto: 0.12 * e, lados: 6, color: TONO.HIERRO, flota: true })
  tronco(p.en(0, 0.12 * e, 0), { radio: 0.13 * e, radioArriba: 0.24 * e, alto: 0.5 * e, lados: 6, color: TONO.VIDRIO, mat: MAT.LUZ, flota: true })
  tronco(p.en(0, 0.62 * e, 0), { radio: 0.29 * e, radioArriba: 0.05 * e, alto: 0.24 * e, lados: 6, color: TONO.HIERRO, flota: true })
  barra(p, [0, 0.86 * e, 0], [0, 1.08 * e, 0], { radio: 0.03 * e, radioFin: 0.005, lados: 4 })
}

/**
 * Farol de hierro fundido. Sin brazos: de pie, de una linterna (los de los caminos, fotos de 1880). Con
 * brazos: columna ornamentada con pedestal, roleos y una linterna por brazo más la del remate (los de las
 * entradas, fotos de 1880 y ~1930).
 */
export function farol(p, { brazos = 0, alto = brazos ? 4.3 : 3.3 }) {
  if (!brazos) {
    tronco(p, { radio: 0.2, radioArriba: 0.1, alto: 0.9, lados: 6, color: TONO.HIERRO })
    barra(p, [0, 0.9, 0], [0, alto, 0], { radio: 0.07, radioFin: 0.05, lados: 6 })
    bulto(p, [0, 1.25, 0], [0.11, 0.09, 0.11], { color: TONO.HIERRO, lados: 6 })
    linterna(p.en(0, alto, 0))
    return
  }
  caja(p, { ancho: 0.8, alto: 0.5, fondo: 0.8, color: TONO.HIERRO })
  tronco(p.en(0, 0.5, 0), { radio: 0.3, radioArriba: 0.2, alto: 0.7, lados: 8, color: TONO.HIERRO, flota: true })
  bulto(p, [0, 1.4, 0], [0.24, 0.28, 0.24], { color: TONO.HIERRO, lados: 8 })
  barra(p, [0, 1.6, 0], [0, alto + 0.5, 0], { radio: 0.11, radioFin: 0.06, lados: 6 })
  bulto(p, [0, alto - 0.9, 0], [0.15, 0.12, 0.15], { color: TONO.HIERRO, lados: 6 })
  for (let k = 0; k < brazos; k++) {
    const q = p.en(0, 0, 0, (k / brazos) * Math.PI * 2 + Math.PI / 4)
    // el brazo: sale, baja en roleo y sube a la linterna
    barra(q, [0, alto - 0.7, 0], [0.5, alto - 0.95, 0], { radio: 0.035, lados: 4 })
    barra(q, [0.5, alto - 0.95, 0], [0.95, alto - 0.55, 0], { radio: 0.035, lados: 4 })
    barra(q, [0, alto - 0.2, 0], [0.62, alto - 0.75, 0], { radio: 0.025, lados: 4 })
    bulto(q, [0.5, alto - 0.82, 0], [0.16, 0.16, 0.03], { color: TONO.HIERRO, lados: 6 }) // el roleo calado
    linterna(q.en(0.95, alto - 0.55, 0), { escala: 1.1 })
  }
  linterna(p.en(0, alto + 0.5, 0), { escala: 1.25 })
}

/**
 * Estatua ecuestre con el caballo encabritado, sobre pedestal alto de piedra oscura con gradas claras
 * (la de Bolívar: fotos de 1874, ~1880 y 1910). El caballo mira hacia +x del pintor.
 */
export function estatuaEcuestre(p, { bronce = TONO.BRONCE, piedra = TONO.PIEDRA_OSCURA, gradas = TONO.PIEDRA_CLARA, bolardos = true }) {
  // gradas y pedestal: 0,6 m de gradas, zócalo, dado con placas y cornisa volada
  caja(p, { ancho: 7.4, alto: 0.3, fondo: 4.8, color: gradas })
  caja(p.en(0, 0.3, 0), { ancho: 6.4, alto: 0.3, fondo: 3.8, color: gradas, flota: true })
  caja(p.en(0, 0.6, 0), { ancho: 5.2, alto: 0.55, fondo: 2.8, color: piedra, flota: true })
  caja(p.en(0, 1.15, 0), { ancho: 4.5, alto: 2.5, fondo: 2.1, color: piedra, flota: true })
  for (const s of [-1, 1]) tronco(p.en(s * 2.25, 1.15, 0), { radio: 1.05, alto: 2.5, lados: 8, color: piedra, flota: true })
  cornisa(p.en(0, 3.65, 0), { largo: 5.6, ancho: 2.2, alto: 0.3, vuelo: 0.25, color: piedra })
  caja(p.en(0, 3.95, 0), { ancho: 5.4, alto: 0.2, fondo: 2.2, color: piedra, flota: true })
  for (const s of [-1, 1]) vano(p.mirando(0, 1.75, s * 1.05, 0, s), { ancho: 2.6, alto: 1.3, arco: false, color: bronce })
  if (bolardos) {
    for (const [x, z] of [[-3.9, -2.6], [0, -2.6], [3.9, -2.6], [-3.9, 2.6], [0, 2.6], [3.9, 2.6]]) {
      tronco(p.en(x, 0, z), { radio: 0.13, radioArriba: 0.09, alto: 0.8, lados: 6, color: TONO.HIERRO })
      bulto(p, [x, 0.86, z], [0.12, 0.12, 0.12], { color: TONO.HIERRO, lados: 6 })
    }
  }

  const e = p.en(0, 4.15, 0).escalado(1.3) // sobre el pedestal; con el jinete, tan alta como él (fotos de ~1880)
  const b = (desde, hasta, radio, radioFin = radio) => barra(e, desde, hasta, { radio, radioFin, color: bronce, lados: 6 })
  const giroZ = (r) => new Matrix4().makeRotationZ(r)
  // el caballo, encabritado: el lomo sube hacia adelante
  bulto(e, [0, 2.05, 0], [1.4, 0.74, 0.62], { color: bronce, giro: giroZ(0.56), lados: 8 })
  bulto(e, [-0.85, 1.55, 0], [0.72, 0.76, 0.66], { color: bronce, lados: 8 }) // la grupa
  bulto(e, [0.85, 2.5, 0], [0.6, 0.62, 0.56], { color: bronce, lados: 8 }) // el pecho
  b([0.85, 2.65, 0], [1.4, 3.65, 0], 0.42, 0.24) // el cuello
  bulto(e, [1.68, 3.62, 0], [0.5, 0.24, 0.2], { color: bronce, giro: giroZ(-0.7) }) // la cabeza
  b([1.1, 3.75, 0], [0.75, 2.9, 0], 0.1, 0.16) // la crin
  for (const s of [-1, 1]) {
    b([-0.8, 1.5, s * 0.36], [-1.25, 0.72, s * 0.38], 0.3, 0.15) // patas traseras: muslo, caña y casco
    b([-1.25, 0.72, s * 0.38], [-0.85, 0.08, s * 0.38], 0.14, 0.1)
    bulto(e, [-0.8, 0.07, s * 0.38], [0.17, 0.09, 0.13], { color: bronce, lados: 6 })
  }
  // las manos, al aire: una más alta que la otra
  b([0.95, 2.35, 0.34], [1.75, 2.35, 0.36], 0.24, 0.13)
  b([1.75, 2.35, 0.36], [1.7, 1.65, 0.36], 0.12, 0.09)
  b([0.95, 2.45, -0.34], [1.65, 2.75, -0.36], 0.24, 0.13)
  b([1.65, 2.75, -0.36], [1.95, 2.15, -0.36], 0.12, 0.09)
  b([-1.35, 1.75, 0], [-1.85, 1.3, 0], 0.2, 0.18) // la cola, que cae hasta el pedestal
  b([-1.85, 1.3, 0], [-1.95, 0.25, 0], 0.18, 0.05)
  // el jinete: torso, cabeza, capa al viento, piernas, y el brazo derecho bajo con el sombrero
  bulto(e, [-0.05, 3.35, 0], [0.34, 0.6, 0.32], { color: bronce, giro: giroZ(-0.12) })
  bulto(e, [0.02, 4.12, 0], [0.2, 0.22, 0.19], { color: bronce })
  bulto(e, [-0.6, 3.15, 0], [0.5, 0.5, 0.36], { color: bronce, giro: giroZ(0.5) })
  for (const s of [-1, 1]) {
    b([-0.05, 2.9, s * 0.3], [0.5, 2.6, s * 0.52], 0.16, 0.12)
    b([0.5, 2.6, s * 0.52], [0.35, 1.95, s * 0.55], 0.11, 0.08)
  }
  b([0, 3.65, 0.3], [0.15, 2.95, 0.8], 0.1, 0.08)
  bulto(e, [0.2, 2.85, 0.92], [0.27, 0.07, 0.27], { color: bronce })
  b([0, 3.65, -0.3], [0.6, 3.25, -0.12], 0.1, 0.08)
}

/** Puesto de mercado: toldo de lona a dos aguas sobre cuatro postes, con su mesón (grabado de 1852). */
export function puesto(p, { largo = 3.2, ancho = 2.4, alto = 2.1, lona = TONO.LONA }) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) barra(p, [sx * largo * 0.46, 0, sz * ancho * 0.42], [sx * largo * 0.46, alto, sz * ancho * 0.42], { radio: 0.05, lados: 4, color: TONO.MADERA })
  }
  tejado(p.en(0, alto, 0), { largo, ancho, alto: 0.65, tipo: 'dos', alero: 0.25, color: lona, hastial: lona, mat: MAT.LONA })
  caja(p.en(0, 0.02, 0), { ancho: largo * 0.7, alto: 0.8, fondo: ancho * 0.36, color: TONO.MADERA, flota: true })
}

/** Un tramo de galería: arcos al frente (+z) y a la espalda, pilastrones en los extremos y azotea con cornisa. */
export function tramoDeGaleria(p, { largo, fondo = 4.2, alto = 4.6, arcos, color = TONO.CAL }) {
  const paso = largo / arcos
  const pared = { largo, alto, arcos, luz: paso * 0.72, altoArco: alto * 0.74, espesor: 0.55, color }
  arqueria(p.en(-largo / 2, 0, fondo / 2 - 0.55), pared)
  arqueria(p.en(-largo / 2, 0, -fondo / 2), pared)
  caja(p.en(0, alto, 0), { ancho: largo, alto: 0.3, fondo, color: TONO.CAL_SOMBRA, flota: true })
  cornisa(p.en(0, alto - 0.25, 0), { largo, ancho: fondo, alto: 0.25, vuelo: 0.18, color })
  caja(p.en(0, alto + 0.3, fondo / 2 - 0.15), { ancho: largo, alto: 0.45, fondo: 0.3, color, flota: true }) // pretil
  caja(p.en(0, alto + 0.3, -fondo / 2 + 0.15), { ancho: largo, alto: 0.45, fondo: 0.3, color, flota: true })
}

/**
 * Portada monumental del mercado: un pabellón de arco grande con columnas pareadas, entablamento y frontón
 * (grabado de 1852). `caras` = 2: arco al frente y a la espalda (las del medio de cada lado); 4: en los
 * cuatro frentes (las de esquina).
 */
export function portada(p, { ancho = 8, fondo = 5, alto = 6.4, caras = 2, color = TONO.CAL }) {
  const frentes = caras === 4 ? [[0, 1, ancho, fondo], [0, -1, ancho, fondo], [1, 0, fondo, ancho], [-1, 0, fondo, ancho]]
    : [[0, 1, ancho, fondo], [0, -1, ancho, fondo]]
  for (const [da, db, w, f] of frentes) {
    const q = p.mirando(da * (f / 2), 0, db * (f / 2), da, db)
    arqueria(q.en(-w / 2, 0, -0.7), { largo: w, alto, arcos: 1, luz: w * 0.5, altoArco: alto * 0.84, espesor: 0.7, color })
    for (const s of [-1, 1]) columna(q.en(s * w * 0.37, 0, 0.3), { radio: 0.3, alto: alto - 0.5, color })
    caja(q.en(0, alto - 0.5, 0.15), { ancho: w + 0.4, alto: 0.5, fondo: 0.9, color, flota: true }) // entablamento
    fronton(q.en(0, alto, 0.45), { ancho: w + 0.6, alto: w * 0.2, fondo: 0.8, color })
    for (const s of [-1, 1]) bulto(q, [s * w * 0.46, alto + 0.35, 0.1], [0.24, 0.38, 0.24], { color, lados: 6 }) // remates
  }
  if (caras === 2) {
    for (const s of [-1, 1]) caja(p.en(s * (ancho / 2 - 0.35), 0, 0), { ancho: 0.7, alto, fondo, color })
  }
  caja(p.en(0, alto, 0), { ancho: ancho - 0.2, alto: 0.3, fondo: fondo - 0.2, color: TONO.CAL_SOMBRA, flota: true })
}
