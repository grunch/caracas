import { PlaneGeometry } from 'three'
import { MAT } from './lienzo.js'
import { TONO, caja, cuerpo, vano } from './piezas.js'

const COLOR_JARDIN = 0x78915c

function pabellon(p, a, b, anio) {
  const largo = 96, ancho = 22, alto = 5.7
  // El eje longitudinal de las salas corre norte-sur (b); el eje local de cuerpo corre por a.
  const q = p.en(a, 0, b, -Math.PI / 2)
  if (anio < 1936) cuerpo(q, { largo, ancho, alto, techo: 'dos', altoTecho: 3.4, teja: TONO.TEJA_VIEJA })
  else {
    caja(q, { ancho: largo, fondo: ancho, alto, color: TONO.CAL })
    caja(q.en(0, alto, 0), { ancho: largo + 1.2, fondo: ancho + 1.2, alto: 0.45, color: TONO.PIEDRA_CLARA, flota: true })
  }
  // Cinco salas por pabellón: vanos regulares que expresan el ritmo del plano, sin interiores inventados.
  for (let i = 0; i < 5; i++) {
    const x = -38.4 + i * 19.2
    for (const z of [-ancho / 2 - 0.04, ancho / 2 + 0.04]) {
      vano(q.mirando(x, 1.55, z, 0, Math.sign(z)), { ancho: 2.1, alto: 2.8, arco: false })
    }
  }
}

function galeria(p, a, b) {
  const largo = 98
  for (let i = 0; i <= 16; i++) {
    const z = b - largo / 2 + i * largo / 16
    caja(p.en(a, 0, z), { ancho: 0.38, fondo: 0.38, alto: 3.8, color: TONO.CAL_SOMBRA })
  }
  caja(p.en(a, 3.75, b), { ancho: 1.2, fondo: largo, alto: 0.24, color: TONO.MADERA, flota: true })
}

/** Hospital de pabellones. Las proporciones son interpretativas; la planta viene del plano de 1889. */
export function hospitalVargas(p, { anio = 1889 } = {}) {
  // Jardines longitudinales entre las filas de salas, con suelo que sigue el relieve local.
  for (const b of [-73, 73]) {
    p.en(0, 0, b).sobreTerreno().geo(
      new PlaneGeometry(96, 18).rotateX(-Math.PI / 2).translate(0, 0.04, 0),
      { color: COLOR_JARDIN, mat: MAT.JARDIN },
    )
  }
  for (const b of [-73, 73]) {
    for (const a of [-28, 28]) pabellon(p, a, b, anio)
    if (anio >= 1911) for (const a of [-16.5, 16.5]) galeria(p, a, b)
  }

  // Núcleo central de administración y servicios, entre las dos alas del plano.
  const nucleo = p.en(0, 0, 0)
  caja(nucleo, { ancho: 28, fondo: 23, alto: 6.2, color: TONO.CAL })
  caja(nucleo.en(0, 6.2, 0), { ancho: 29.2, fondo: 24.2, alto: 0.55, color: TONO.PIEDRA_CLARA, flota: true })
  caja(nucleo.en(0, 0, 0), { ancho: 8, fondo: 8, alto: 0.15, color: COLOR_JARDIN, mat: MAT.JARDIN })
  for (const [a, b] of [[-8, 0], [8, 0], [0, -7], [0, 7]]) {
    for (const z of [-4.2, 4.2]) vano(nucleo.mirando(a, 1.8, b + z, 0, Math.sign(z)), { ancho: 1.8, alto: 2.8, arco: false })
  }

  // Los corredores y patios se leen como espacios abiertos; no se añaden anexos sin ubicación documental.
}
