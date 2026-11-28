# Cruces del Guaire: Dolores, Restaurador, 19 de Diciembre y Ayacucho

Avance parcial de [#272](https://github.com/grunch/caracas/issues/272). Suma la marca y la ficha de cuatro cruces
que no tenían ninguna, con su calce en [`puentes-guaire-calce-cruces.md`](puentes-guaire-calce-cruces.md). No
instala geometría: los modelos siguen en Miraflores (`grunch/miraflores`, `docs/puentes-guaire/`). La cronología de
Hierro y Constitución/Sucre está en [`puentes-guaire-cronologia.md`](puentes-guaire-cronologia.md).

Los datos viven en `src/puentes-cruces-datos.js`, con el formato de `src/marcas-datos.js` y `src/fichas-datos.js`.
Cada marca nombra **el cruce**, no la estructura: el nombre es el rótulo del plano de su época.

## Cronología por época

| Época | Dolores (Sur 4) | Restaurador (av. Sur) | 19 de Diciembre | Ayacucho (Sur 14) |
|---|---|---|---|---|
| 1772–1889 | Sin marca | Sin marca | Sin marca | Sin marca |
| 1911 | «Dolores», n.º IV de Razetti. Armadura de 1897, 60 m | «Restaurador», n.º III. Puente de 1905, 100,50 m | «19 de Diciembre», n.º VI. Puente de 1910 | Sin marca: el plano no dibuja puente |
| 1936 | «Puente Dolores», con símbolo de armadura. Pilas de 1916 | «Puente Restaurador», con plazoleta. Reparado en 1932 | «Puente 9 de Diciembre» | «Puente Ayacucho», de 1924 |
| 1946 | «Puente Soublette»: estructura sin resolver | «Puente Restaurador», sin plazoleta: estructura sin resolver | «Puente 9 de Diciembre»: estructura sin resolver | «Puente Ayacucho» |

## Decisiones sobre la vida de cada marca

El estudio de Miraflores deja en `presente: null` los tres puentes metálicos después de 1911. Los planos del propio
catálogo resuelven la **presencia del cruce** en 1936 y 1946; la **estructura** de 1946 sigue sin resolver y así
queda escrito en `dudas`.

- **Dolores sigue en 1936.** FAC lo da por demolido en 1935
  ([¿Sabía usted? 98](https://fundaayc.com/2023/04/02/sabia-usted-98/)), pero el plano DCN, fotografiado en marzo de
  1936, lo rotula y lo dibuja con un símbolo cruzado en X que, entre los puentes del Guaire revisados, solo llevan Dolores y Paraíso, los dos
  que Teunis Stolk llamaba en 1933 «de armadura superior» (Silva Contreras, p. 39). La misma FAC, en
  [¿Sabía usted? 107](https://fundaayc.com/2023/10/15/sabia-usted-107/), sitúa el reemplazo de los puentes
  metálicos restantes «a partir de 1940». Manda el plano de la época. La contradicción va en `dudas`.
- **En 1946 el cruce de Dolores se llama Soublette.** Así lo rotula el plano de 1946, con una calzada de 19,5 m. No
  se encontró ninguna fuente que feche ese puente: la marca cambia de nombre y la ficha dice que no hay fecha.
- **Restaurador sigue en 1936 y 1946.** Los dos planos lo rotulan. El de 1936 dibuja la plazoleta circular del
  puente de 1905, reparado en 1932 (MOP, Memoria 1932, p. 218, en Silva Contreras, p. 38). El de 1946, a 1:10.000,
  dibuja una calzada de 19,6 m sin plazoleta: no prueba un reemplazo, y tampoco que siguiera el puente de 1905.
- **19 de Diciembre: el nombre cambia en 1936.** En 1911 es «19 de Diciembre» (leyenda de Razetti). El plano de
  marzo de 1936 ya rotula «Puente 9 de Diciembre» y «Avenida 9 de Diciembre», y el de 1946 también. FAC sitúa el
  cambio tras la muerte de Gómez, en diciembre de 1935
  ([¿Sabía usted? 104](https://fundaayc.com/2023/08/06/sabia-usted-104/)). La marca no lleva el nombre nuevo a 1911.
- **Ayacucho desde 1936.** Se inauguró en 1924; la época anterior del sitio es 1911, cuando el plano no dibuja
  puente.

## Lo que dice cada fuente

| Hecho | Fuente |
|---|---|
| Dolores: prolonga Sur 4; nombre por la esquina; estructura francesa; colocado el 28 de octubre de 1897 | Silva Contreras, p. 36 (MOP, Memorias 1897 y 1898) |
| Dolores: 60 m de luz sin apoyos, 8 m de ancho, 5 m sobre el río | Silva Contreras, p. 37 (El Cojo Ilustrado n.º 147, 1-2-1898) |
| Dolores: consolidación en 1915; dos pilas de concreto y luz de 40 m en 1916; informe de 1922 | Silva Contreras, nota 13 (MOP, Memorias 1915, 1916 y 1922) |
| Restaurador: Núñez Cáceres, 11 de junio de 1905, plazoleta, veinte postes; 100,50 × 8 m | Silva Contreras, pp. 37–38 y nota 14 (MOP, Memoria 1905) |
| 19 de Diciembre: Stelling, 1910; 30 m y dos de 15 m; pilas de concreto armado | Silva Contreras, p. 38 y nota 15 (MOP, Memoria 1911) |
| Ayacucho: 1924, Sur 14, arco de concreto armado | Silva Contreras, p. 38; [FAC](https://fundaayc.com/2022/09/08/1924-inauguracion-del-puente-ayacucho/) |
| Ayacucho: proyecto de 1919 de Hernán Ayala Duarte | [FAC](https://fundaayc.com/2022/09/08/1924-inauguracion-del-puente-ayacucho/). Silva Contreras escribe «Herman Ayala» |

Silva Contreras, «Puentes metálicos sobre el río Guaire», *Tecnología y Construcción* 20-II (2004), pp. 29–42:
[texto en la revista](https://saber.ucv.ve/ojs/index.php/rev_tc/article/view/2916). Las páginas son las impresas.
Las Memorias del MOP y El Cojo Ilustrado se citan a través de ella: no se consultaron.

Consulta y paráfrasis de hechos. No se agrega al repo ninguna foto ni escaneo de terceros.

## Diferencias con la tabla anterior de `prioridades/vialidad.md`

- Dolores: decía «1898; desaparición referida en 1935». El puente quedó sobre sus bases en octubre de 1897 y El Cojo
  Ilustrado lo daba por inaugurarse en febrero de 1898; el plano de marzo de 1936 todavía lo dibuja.
- 19 de Diciembre: ya está identificado (n.º VI de Razetti) y calzado sobre el plano de 1936.

## Otros puentes del Guaire que traen los planos

Vistos en los planos al hacer este calce; quedan **sin marca ni ficha** en este PR. Las posiciones son aproximadas,
en píxeles del mosaico: sirven para encontrarlos, no son un calce.

| Puente | Posición | 1911 | 1936 | 1946 | Qué falta |
|---|---|---|---|---|---|
| El Paraíso (Sur 12) | (6990, 9281) | n.º V de Razetti | «Puente Paraíso», símbolo en X | «Puente Paraíso» | Imagen de la armadura de 1895 y año del reemplazo. Silva Contreras, p. 36: inaugurado el 28-10-1895, poco más de 24 m |
| Bolívar | (1478, 12055) | No existe | «Puente Bolívar» | «Puente Bolívar» | Ancho y despiece. Silva Contreras, p. 40: arco metálico de 50 m, inaugurado en 1933 |
| San Agustín | (10445, 9277) | No existe | Dibujado, sin rótulo | «Puente Sn. Agustín» | Imagen y medidas. Silva Contreras, nota 16 (MOP, Memoria 1933) |
| Mohedano | (12323, 8895) | No se revisó | «Puente Mohedano» | «Puente Mohedano» | El plano de 1936 ya lo rotula; el informe documental paralelo de #272 recoge que FAC lo fecha en 1940 (sin cotejar acá): contradicción sin resolver |
| Lara | (4442, 10119) | No se revisó | «Puente Lara» | «Puente Lara» | Ninguna fuente consultada lo nombra |

No entran acá porque cada uno necesita su propio calce y sus fuentes, y dos traen contradicciones que hay que
escribir con cuidado.

## Pendientes para cerrar #272

Modelos y adaptador de los cuatro cruces, decisión sobre las cabezas de Dolores, cabezas del 19 de Diciembre y del
Ayacucho, rasante, estructuras de 1946, y los cinco puentes de la tabla anterior.
