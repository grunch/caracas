/**
 * Los templos parroquiales del issue #259: Santa Rosalía, San Juan (Capuchinos) y San José. La planta de cada
 * uno es su contorno en el plano de 1936 (docs/templos-259-georreferencia.json); la época en que nace, la del
 * primer plano que lo dibuja terminado. Lo que no tiene fuente no se dibuja y queda en `verificar`
 * (docs/templos-259-integracion.md). El origen es el pie de la fachada y el eje entra en la nave.
 */
import { rectanguloPx } from './marco.js'

const IPC = 'IPC, Catálogo del Patrimonio Cultural Venezolano 2004-2007, municipio Libertador, «Lo construido»: https://albaciudad.org/wp-content/uploads/2017/01/Libertador-Construido2.pdf'
const P36 = 'contorno del plano DCN de 1936, contrastado con el de 1946'
const ALTURAS = 'Alturas sin fuente: ninguna está medida ni publicada; salen de la proporción con el ancho leído del plano.'

// --- Santa Rosalía: fachada al oeste, sobre el atrio de la calle Sur 1 ---
const rosalia = { x: 9075.8, y: 8535.8, eje: [0.9701, 0.2425] }
const NAVES_ROSALIA = { largo: 41, ancho: 25.8 }
const TORRE_ROSALIA = { lado: 6.5, a: 3.6, b: -13.4 } // al norte de la fachada, donde el contorno sale del muro
// el solar que el plano deja en blanco: el atrio (19 m hasta la calle), las naves y la franja norte de la torre
const recintoRosalia = [rectanguloPx(rosalia, 60, 29.9, 11, -2.05)]

const santaRosalia = Object.freeze({
  id: 'santa-rosalia', nombre: 'Iglesia de Santa Rosalía', ...rosalia, nace: 2, muere: 0,
  planta: [rectanguloPx(rosalia, NAVES_ROSALIA.largo, NAVES_ROSALIA.ancho, NAVES_ROSALIA.largo / 2, 0)],
  plantaPorEpoca: [{ nace: 4, poligonos: [rectanguloPx(rosalia, TORRE_ROSALIA.lado, TORRE_ROSALIA.lado, TORRE_ROSALIA.a, TORRE_ROSALIA.b)] }],
  suprime: recintoRosalia, sinArboles: recintoRosalia, solarCompleto: true,
  partes: [
    // 1843 y 1889: el templo de 1817, del que solo se sabe que era neoclásico; va la envolvente, sin torre ni cúpulas
    { tipo: 'iglesia', ...NAVES_ROSALIA, alto: 10, fachada: 'clasica', nace: 2, muere: 4 },
    // desde 1911: el templo tras las obras de 1904–1908, como lo describe el IPC
    {
      tipo: 'temploDeNaves', ...NAVES_ROSALIA, altoLateral: 9, altoCentral: 13, cubierta: 'plana', pantalla: true,
      torres: { lado: TORRE_ROSALIA.lado, a: TORRE_ROSALIA.a, b: [TORRE_ROSALIA.b], cuerpos: [{ alto: 13, vanos: 'ventana' }, { alto: 6, vanos: 'arco' }], remate: { tipo: 'cupula', alto: 4.5 } },
      cupulas: [{ a: 35, radio: 3.8 }, { a: 35, b: -9.6, radio: 2.2 }, { a: 35, b: 9.6, radio: 2.2 }],
      nace: 4, muere: 0,
    },
  ],
  fuente: `${IPC} (p. 216: tres naves, fachada neoclásica, cúpula con linterna sobre el presbiterio, dos cúpulas menores, torre; p. 33: «1817 y 1908»); ${P36}; historia de la parroquia: https://parroquiasantarosalia.wordpress.com/santa-rosa/`,
  verificar: [
    ALTURAS,
    'Planta de 41 × 25,8 m: lados del contorno del plano de 1936 (0,5 m por píxel), no mensura. El muro sur y el este quedan bajo el rótulo del plano.',
    'Hasta 1889 es una envolvente: del templo de 1817 no hay vista fechada. No lleva torre ni cúpulas porque nada las prueba antes de las obras de 1904–1908; tampoco está probado que no las tuviera.',
    'Desde 1911, lo que el IPC describe del templo actual: no se sabe qué de eso salió de las obras de 1904–1908. La torre al norte y su remate, de la foto de 2008 (Commons, Jesús Rincón, CC BY-SA 4.0).',
    'El plano de 1772 dibuja una iglesia en el lugar (la parroquia la da por terminada en 1734): sin alzado ni leyenda transcrita, no se modela.',
  ],
})

// --- San Juan (Capuchinos): fachada al norte, sobre la plaza ---
const juan = { x: 6929.6, y: 8323.5, eje: [-0.07, 0.9975] }
const NAVE_JUAN = { largo: 41, ancho: 22 }
const plantaJuan = [rectanguloPx(juan, NAVE_JUAN.largo, NAVE_JUAN.ancho, NAVE_JUAN.largo / 2, 0)]
// el cuerpo trasero más ancho que dibuja el plano (sacristía o capillas): se reserva, no se modela
const recintoJuan = [...plantaJuan, rectanguloPx(juan, 6, 30.4, 32.5, -1.1)]

const sanJuan = Object.freeze({
  id: 'san-juan', nombre: 'Iglesia de San Juan Bautista', ...juan, nace: 3, muere: 0,
  planta: plantaJuan, suprime: recintoJuan, sinArboles: recintoJuan, solarCompleto: true,
  partes: [{ tipo: 'iglesia', ...NAVE_JUAN, alto: 10, fachada: 'clasica' }],
  fuente: `H. D. Elschnig, «Santiago de León de Caracas: una guía práctica histórica-cultural», p. 99 (hospicio y capilla de 1788–1791, destruidos en 1812; templo empezado en 1841 y concluido en 1868): https://bibliodor.wordpress.com/wp-content/uploads/2012/03/parroquia-san-juan.pdf; ${P36}`,
  verificar: [
    ALTURAS,
    'Es una envolvente: no se halló descripción ni vista fechada del alzado. Va la nave que dibuja el plano con una fachada clásica sin torre ni cúpula; la torre y los adornos del templo actual no se copian.',
    'Planta de 41 × 22 m: el contorno del plano de 1936 se ensancha de 21 a 23,5 m hacia el fondo; va el rectángulo medio.',
    'En 1843 el templo estaba en obra (1841–1868): no se modela. El plano de Mestre de 1889 lo dibuja (templo V) unos 37 m al suroeste de su lugar en 1936, más que el error declarado del calce.',
    'Fachada al norte por la plaza de Capuchinos, que todos los planos ponen al frente; sin vista que lo confirme.',
  ],
})

// --- San José: fachada al sur, sobre la plazuela ---
const jose = { x: 10622, y: 5371, eje: [0.1659, -0.9861] }
const NAVES_JOSE = { largo: 50, ancho: 20.4 }
const BRAZOS_JOSE = { a: 30.5, largo: 11, ancho: 30.6 }
const TORRES_JOSE = { lado: 6.2, a: 3.4, b: [-13.3, 13.3] } // fuera del ancho de las naves, como las dibuja el plano
const recintoJose = [rectanguloPx(jose, 59, 33, 21.5, 0)]

const sanJose = Object.freeze({
  id: 'san-jose', nombre: 'Iglesia de San José', ...jose, nace: 4, muere: 0,
  planta: [
    rectanguloPx(jose, NAVES_JOSE.largo, NAVES_JOSE.ancho, NAVES_JOSE.largo / 2, 0),
    rectanguloPx(jose, BRAZOS_JOSE.largo, BRAZOS_JOSE.ancho, BRAZOS_JOSE.a, 0),
    ...TORRES_JOSE.b.map((b) => rectanguloPx(jose, TORRES_JOSE.lado, TORRES_JOSE.lado, TORRES_JOSE.a, b)),
  ],
  suprime: recintoJose, sinArboles: recintoJose, solarCompleto: true,
  partes: [{
    tipo: 'temploDeNaves', ...NAVES_JOSE, altoLateral: 9, altoCentral: 14, cubierta: 'teja',
    brazos: { ...BRAZOS_JOSE, alto: 9 },
    torres: { ...TORRES_JOSE, cuerpos: [{ alto: 9, vanos: 'ventana' }, { alto: 6.5, vanos: 'arco' }, { alto: 4.5, lado: 5.2, vanos: 'ventana' }], remate: { tipo: 'cupula', alto: 3.5 } },
  }],
  fuente: `${IPC} (pp. 125–126: tres naves, la central más alta con techo a dos aguas, dos torres gemelas de tres cuerpos que sobresalen de las naves, tres puertas y frontón); ${P36}; plano de Razetti de 1911 (planta en cruz)`,
  verificar: [
    ALTURAS,
    'Nace en 1911: el plano de Razetti ya dibuja la planta en cruz. El de Mestre de 1889 deja la manzana vacía, aunque la parroquia es de 1889 y el IPC da el templo por «construida en 1889» (p. 148): la fecha de terminación queda sin resolver.',
    'Planta de 50 × 20,4 m con brazos de 30,6 m y torres de 6,2 m: lados del contorno del plano de 1936, no mensura. El IPC la describe rectangular; el plano la dibuja en cruz.',
    'El mismo volumen en 1911, 1936 y 1946: no se hallaron las reparaciones posteriores al sismo de 1900 ni otra reforma. El remate de las torres, de la foto de 2011 (Commons, FELiendo16, CC BY 3.0).',
    'El reloj de la torre derecha (el IPC presume que fue de la Catedral) no se dibuja: no se sabe desde cuándo está.',
  ],
})

export const templosParroquiales = Object.freeze([santaRosalia, sanJuan, sanJose])
