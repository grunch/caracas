import { rectanguloPx } from './marco.js'

// Ancla y orientación heredadas del rótulo del plano de 1936; medidas aproximadas.
const marco = { x: 9395, y: 5305, eje: [0.118, -0.993] }
// Incluye la base (26 m) y la escalera delante de la fachada, no solo la nave (23 × 55 m).
const planta = [rectanguloPx(marco, 62, 26, 26, 0)]
export const panteon = Object.freeze({
  id: 'panteon', nombre: 'Panteón Nacional', ...marco, nace: 2, muere: 0,
  planta, suprime: planta,
  fuente: 'Plano de Caracas de 1936 (Panteón Nacional); Bellermann, circa 1842–1845; Lessmann, circa 1885–1900 (https://elarchivo.org/producto/panteon-nacional/); Fundación Arquitectura y Ciudad (https://fundaayc.com/tag/panteon-nacional/).',
  verificar: [
    'Iglesia inaugurada en 1781, destruida parcialmente en 1812; en 1843 se representan sus ruinas según Bellermann. No se reconstruyen las obras de 1772.',
    'Panteón inaugurado en 1875. Rosetón y dos agujas para 1889; reforma de Chataing de 1911 con ventana ojival; reforma de Mujica Millán terminada en 1930, con tres torres, para 1936.',
    'Modelo interpretativo: medidas, planta, laterales, cubiertas, daños y ornamentación simplificados, sin levantamiento. La posición y orientación requieren cotejo georreferenciado.',
  ],
  partes: [
    { tipo: 'panteon', anio: 1843, nace: 2, muere: 3 },
    { tipo: 'panteon', anio: 1889, nace: 3, muere: 4 },
    { tipo: 'panteon', anio: 1911, nace: 4, muere: 5 },
    { tipo: 'panteon', anio: 1936, nace: 5, muere: 0 },
  ],
})
