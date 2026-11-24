import { EJE_DAMERO, rectanguloPx } from './marco.js'

const SUR = [-EJE_DAMERO[1], EJE_DAMERO[0]]

// El pie de la fachada norte, donde el plano de 1936 rotula «Iglesia San Francisco»; +a entra en la nave hacia el
// sur y +b va al oeste, hacia el antiguo convento (la Universidad).
const marco = { x: 8768, y: 7198, eje: SUR }
// La nave: 62 m de largo y 19,6 m de ancho, más la portada (~1 m sobre la calle) y los contrafuertes y pilastras
// del costado este. El campanario colonial (1772–1843) asoma al oeste, junto a la fachada.
const nave = rectanguloPx(marco, 63.5, 22.4, 30.75, -0.2)
const campanario = rectanguloPx(marco, 5.4, 5.2, 2.0, 11.65)
const solar = rectanguloPx(marco, 63.5, 25.5, 30.75, 1.35)

export const sanFrancisco = Object.freeze({
  id: 'san-francisco', nombre: 'Iglesia de San Francisco', ...marco, nace: 1, muere: 0,
  planta: [nave, campanario], suprime: [solar],
  fuente: 'Plano de Caracas de 1936 (rótulo «Iglesia San Francisco»); plano de Mestre de 1889 (templo VII); ' +
    'litografía de hacia 1845 (fuentes/imagenes/1845-commons-iglesia-de-san-francisco); ' +
    'Wikipedia https://es.wikipedia.org/wiki/Iglesia_de_San_Francisco_(Caracas) (reforma de 1745, 1813, 1842, ' +
    'fachada de Juan Hurtado Manrique de 1887–1889, jesuitas desde 1922, Monumento Histórico Nacional en 1956); ' +
    'estudio por épocas de miraflores (san-francisco.html), límites en specs/08-san-francisco-por-epocas.md.',
  verificar: [
    'Huella de 62 × 19,6 m y alturas de la nave (7,4–7,8 m las laterales, 10,6–11,2 m la central): decisiones de modelado, sin levantamiento.',
    '1772 y 1843 reproducen la portada barroca de 1745 (un portal, nichos con las esculturas genovesas de 1655, frontón triangular) y el campanario de tres arcos al oeste leídos en la litografía de hacia 1845: su aplicación a 1772 es retrospectiva.',
    'Los contrafuertes del costado este en 1843 (consolidación tras el terremoto de 1812) y los alzados laterales coloniales son interpretativos.',
    'Desde 1889, la fachada de Juan Hurtado Manrique (tres puertas, óculo, volutas y frontón curvo partido, sin torre), cotejada con fotos posteriores; los colores de 1889 a 1936 son aproximados y se usa el de 1936.',
    'El encaje del campanario colonial con el antiguo convento, al oeste, no tiene levantamiento.',
    'La Ceiba de San Francisco (hacia 1866) no se dibuja en la iglesia: es de la capa de árboles.',
  ],
  partes: [
    // La geometría exterior de Hurtado Manrique no cambia de 1889 a 1936: un solo tramo para las tres épocas.
    { tipo: 'sanFrancisco', anio: 1772, nace: 1, muere: 2 },
    { tipo: 'sanFrancisco', anio: 1843, nace: 2, muere: 3 },
    { tipo: 'sanFrancisco', anio: 1936, nace: 3, muere: 0 },
  ],
})
