import { rectanguloPx } from './marco.js'

// Huella interpretativa ajustada del polígono de pabellones del plano Mestre 1889 al mosaico común de 1936.
// Centro aproximado (9796, 4503), eje transversal este-noreste y dimensión nominal 100 × 270 m.
const marco = { x: 9796, y: 4503, eje: [0.963, 0.269] }
const recinto = [rectanguloPx(marco, 100, 270)]
// El recinto abierto se reserva para la supresión de casas; solo las salas y el núcleo son colisión.
const edificios = [
  ...[-73, 73].flatMap(b => [-28, 28].map(a => rectanguloPx(marco, 22, 96, a, b))),
  rectanguloPx(marco, 28, 23),
]

export const hospitalVargas = Object.freeze({
  id: 'hospital-vargas', nombre: 'Hospital Vargas', ...marco, nace: 3, muere: 0,
  planta: edificios, suprime: recinto, sinArboles: recinto, solarCompleto: true,
  partes: [
    { tipo: 'hospitalVargas', anio: 1889, nace: 3, muere: 4 },
    { tipo: 'hospitalVargas', anio: 1911, nace: 4, muere: 5 },
    { tipo: 'hospitalVargas', anio: 1936, nace: 5, muere: 0 },
  ],
  fuente: 'Mestre (1889); SVHM (2006); El Cojo Ilustrado (1892); ver docs/issue-249-hospital-vargas.md.',
  verificar: [
    'Huella nominal, no catastral; calce RMS LOO 7,64 m.',
    'Planta de 1889 durante obras; dimensiones y vanos interpretativos.',
    'Anexos de 1939 sin ubicación verificable; no modelados.',
    'Jardines y galerías quedan transitables; solo los pabellones y el núcleo son colisión.',
  ],
})
