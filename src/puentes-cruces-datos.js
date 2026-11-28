/**
 * Marcas y fichas de cuatro cruces del Guaire: Dolores, Restaurador, 19 de Diciembre y Ayacucho (#272).
 * Mismo formato que src/marcas-datos.js y src/fichas-datos.js. No traen geometría: la marca nombra el cruce, no
 * la estructura que lo salvaba en cada época.
 *
 * Posición: el centro adoptado en docs/puentes-guaire-calce-cruces.json, en píxeles del mosaico de 1936.
 * Nombres: el rótulo del plano de cada época. Lo que las fuentes no resuelven va en `dudas`.
 */
const P11 = 'plano de Razetti de 1911, leyenda de puentes sobre el Guaire'
const P36 = 'plano DCN de 1936'
const P46 = 'plano DCN de 1946'
const SILVA = 'https://saber.ucv.ve/ojs/index.php/rev_tc/article/view/2916'
const FAC_98 = 'https://fundaayc.com/2023/04/02/sabia-usted-98/'
const FAC_104 = 'https://fundaayc.com/2023/08/06/sabia-usted-104/'
const FAC_107 = 'https://fundaayc.com/2023/10/15/sabia-usted-107/'
const FAC_AYACUCHO = 'https://fundaayc.com/2022/09/08/1924-inauguracion-del-puente-ayacucho/'
const silva = (paginas) => `Silva Contreras (2004), ${paginas}: ${SILVA}`
const DESDE_1940 = `FAC sitúa el reemplazo de los puentes metálicos que quedaban «a partir de 1940», sin fecha para este (${FAC_107})`

export const MARCAS_PUENTES_CRUCES = Object.freeze([
  { id: 'puente-dolores', x: 7908, y: 10122, nace: 4, nivel: 3, alto: 4,
    nombres: [[4, 'Puente Dolores', 'Armadura de acero de 60 m, de 1897, al final de la calle Sur 4.'],
      [5, 'Puente Dolores', 'La armadura de 1897, con dos pilas de concreto desde 1916.'],
      [6, 'Puente Soublette', 'Así rotula el cruce el plano de 1946.']],
    fuente: `${P11} (IV «Dolores»); ${P36} («Puente Dolores»); ${P46} («Puente Soublette»); ${silva('pp. 36–37 y nota 13')}`,
    dudas: `La marca es el cruce, no una estructura. FAC da el puente por demolido en 1935 (${FAC_98}), pero el plano de 1936, fotografiado en marzo de ese año, todavía lo dibuja y lo rotula. Qué estructura había en 1946 queda sin resolver.` },
  { id: 'puente-restaurador', x: 8500, y: 9880, nace: 4, nivel: 3, alto: 4,
    nombres: [[4, 'Puente Restaurador', 'Puente de hierro de 100,50 m con plazoleta central, de 1905.'],
      [5, 'Puente Restaurador', 'El puente de 1905, reparado en 1932.'],
      [6, 'Puente Restaurador', 'El plano de 1946 conserva el nombre y ya no dibuja la plazoleta.']],
    fuente: `${P11} (III «Restaurador», Av. S.); ${P36} («Puente Restaurador»); ${P46} («Puente Restaurador»); ${silva('pp. 37–38 y nota 14')}`,
    dudas: 'La marca es el cruce de la avenida Sur, en el centro de la plazoleta que dibuja el plano de 1936. Si en 1946 seguía la estructura de 1905 queda sin resolver.' },
  { id: 'puente-19-diciembre', x: 3284, y: 10727, nace: 4, nivel: 3, alto: 4,
    nombres: [[4, 'Puente 19 de Diciembre', 'Vigas de acero sobre pilas de concreto, de 1910.'],
      [5, 'Puente 9 de Diciembre', 'El nombre que tomó tras la muerte de Gómez, en 1935.']],
    fuente: `${P11} (VI «19 de Diciembre», Av. 19 de Dic.); ${P36} («Puente 9 de Diciembre»); ${P46} («Puente 9 de Diciembre»); ${silva('p. 38 y nota 15')}`,
    dudas: `El nombre de 1936 sale del rótulo del plano; FAC sitúa el cambio tras la muerte de Gómez, en 1935 (${FAC_104}). Qué estructura había en 1946 queda sin resolver. El punto es el cruce del eje de la calzada de 1936 con el río; las cabezas están sin medir.` },
  { id: 'puente-ayacucho', nombre: 'Puente Ayacucho', x: 6726, y: 9180, nace: 5, nivel: 3, alto: 4,
    nota: 'Arcos de concreto armado, de 1924, en la calle Sur 14.',
    fuente: `${P36} («Puente Ayacucho»); ${P46} («Puente Ayacucho»); ${silva('p. 38')}; FAC, inauguración de 1924: ${FAC_AYACUCHO}`,
    dudas: 'El punto es el cruce del eje de la calzada de 1936 con el río; ningún plano marca las cabezas: sin medir.' },
].map((marca) => Object.freeze(marca)))

export const FICHAS_PUENTES_CRUCES = Object.freeze({
  'puente-dolores': {
    textos: [
      [4, 'Prolonga la calle Sur 4 hasta la avenida del Paraíso y toma el nombre de la última esquina de la calle antes del río. Manuel Felipe Herrera Tovar lo montó con una armadura de acero traída de Francia, colocada sobre sus bases de mampostería en octubre de 1897: 60 m de luz sin apoyos intermedios, 8 m de ancho y 5 m sobre el río. El plano de 1911 lo numera IV entre los puentes del Guaire.'],
      [5, 'Desde 1916 dos pilas de concreto, a 10 m de cada extremo, reducen la luz a 40 m; un informe de 1922 trata de cambiar el piso de madera por pavimento de concreto. En 1932 Teunis Stolk propuso reemplazarlo por un arco de concreto armado. El plano de 1936 todavía lo dibuja, con el mismo símbolo cruzado del Puente Paraíso, y lo rotula «Puente Dolores».'],
      [6, 'El plano de 1946 rotula el cruce «Puente Soublette» y dibuja una calzada de unos 20 m, más del doble que la del puente de 1897. No se encontró la fecha del reemplazo.'],
    ],
    dudas: `La demolición no tiene fecha firme: FAC dice 1935 (${FAC_98}), el plano de 1936 aún dibuja el puente y ${DESDE_1940}. Medidas y obras: ${silva('pp. 36–37 y nota 13')}. Las cabezas del símbolo de 1936 distan 43,6 m y la luz documentada es de 60 m.`,
  },
  'puente-restaurador': {
    textos: [
      [4, 'Proyectado por Rafael Núñez Cáceres, se inauguró el 11 de junio de 1905, día de la juramentación de Cipriano Castro. Lleva de la avenida Sur a la avenida Castro, del otro lado del río: 100,50 m de largo por 8 m de ancho, con una plazoleta circular en el centro, baranda ornamentada y veinte postes de hierro para faroles. El plano de 1911 lo numera III.'],
      [5, 'En 1932 hubo que repararlo: la extracción de granzón de las riberas había cambiado el cauce. El plano de 1936 lo rotula «Puente Restaurador» y todavía dibuja la plazoleta circular, de unos 14 m de diámetro, en una calzada de unos 7 m.'],
      [6, 'El plano de 1946 conserva el rótulo «Puente Restaurador», pero dibuja una calzada de unos 20 m, sin plazoleta.'],
    ],
    dudas: `No consta si la estructura de 1905 seguía en pie en 1946: ${DESDE_1940}. Historia y medidas: ${silva('pp. 37–38 y nota 14')}. Las cabezas se derivan del centro de la plazoleta y del largo documentado; no son un levantamiento.`,
  },
  'puente-19-diciembre': {
    textos: [
      [4, 'Construido por Herman Stelling en 1910, sostiene la avenida del mismo nombre entre la Carretera del Oeste y la avenida de La Vega. La estructura se fabricó en Estados Unidos, con planos autorizados por la American Bridge Company: un tramo central de 30 m sobre el río, de vigas trianguladas, y dos laterales de 15 m, de vigas de palastro, sobre pilas de concreto armado. El nombre es la fecha que celebraba el gomecismo. El plano de 1911 lo numera VI.'],
      [5, 'Muerto Gómez en 1935, la avenida y el puente pasaron a llamarse 9 de Diciembre, la fecha de la batalla de Ayacucho. El plano de 1936, fotografiado en marzo, ya los rotula así, y el de 1946 también. La calzada que dibujan mide unos 11 m.'],
    ],
    dudas: `No consta cuál era la estructura en 1946: ${DESDE_1940}. Cambio de nombre: FAC (${FAC_104}). Descripción: ${silva('p. 38 y nota 15')}. El plano de 1911 dibuja unos 300 m de puente y accesos, pero su calce ahí es extrapolado: cabezas sin medir.`,
  },
  'puente-ayacucho': {
    textos: [
      [5, 'Inaugurado en 1924, en el centenario de la batalla de Ayacucho, prolonga la calle Sur 14 y abre otra vía entre San Juan y El Paraíso. Lo proyectó en 1919 el ingeniero Hernán Ayala Duarte, del Ministerio de Obras Públicas, con balaustrada y faroles. Fue el primero de tres puentes de arco de concreto armado construidos en el país. Los planos de 1936 y 1946 lo rotulan «Puente Ayacucho».'],
    ],
    dudas: `Ningún plano marca las cabezas y las fuentes consultadas no dan el largo ni las luces: sin medir. Inauguración y proyecto: FAC (${FAC_AYACUCHO}); ${silva('p. 38')}, que remite a la Memoria del MOP de 1925, pp. 263–291, sin consultar.`,
  },
})
