# Calce de los cruces Dolores, Restaurador, 19 de Diciembre y Ayacucho

Avance de [#272](https://github.com/grunch/caracas/issues/272), previo a instalar los modelos. Sigue el método y el
formato de [`puentes-guaire-calce.md`](puentes-guaire-calce.md) (Puente de Hierro y Constitución/Sucre, PR #292), que
ya trae medidas las cabezas del cruce de la calle Sur 7: no se repiten acá. Los números completos están en el
mismo archivo que los de esos puentes, [`puentes-guaire-calce.json`](puentes-guaire-calce.json); la cronología y las marcas, en
[`puentes-guaire-cruces.md`](puentes-guaire-cruces.md).

## Cómo se midió

- Recortes ampliados ×4 a ×8, con rejilla cada 10 o 20 px, del mosaico DCN de 1936
  (`fuentes/derivados/1936/mosaico-costura.tif`, 0,5 m/px), del plano de 1911 ya calzado sobre él
  (`fuentes/derivados/1911/calzado.tif`) y del original de 1946 llevado a la misma grilla con su calce.
- Cada cabeza es el medio de un par de pedestales (1911) o de las esquinas del símbolo (1936). Lectura a ojo:
  ±2 px, ±1 m.
- Los píxeles del escaneo original salen del TPS inverso (`tools/geo/calce.py`, `Calce.al_viejo`): con los GCP de
  `tools/geo/gcp/calce-1911-princeton-plano-de-caracas-razetti.json` para 1911 y con los 40 cruces de la cuadrícula
  impresa (`tools/geo/gcp/1946-cuadricula.json`) para 1946.
- Lo que un plano no marca queda **sin medir** (`null` en el JSON). Nada se estimó a ojo para rellenar.
- No es un levantamiento: es lectura de planos a 1:5.000 y 1:10.000.

| Plano | Fuente y licencia | Calce sobre 1936 (dejando uno fuera) |
|---|---|---|
| Razetti, 1911 | [Princeton University Library](https://maps.princeton.edu/catalog/princeton-05741v14j), sin derechos conocidos | 738 GCP, RMS 6,71 m, p90 12,04 m |
| DCN, 1936 (fotografiado en marzo) | [Internet Archive](https://archive.org/details/WCWdb_18053), licencia sin establecer en su ficha | Es la base |
| DCN, fotos de 1946 | [Internet Archive](https://archive.org/details/WCWdb_18051), licencia sin establecer en su ficha | 40 GCP, RMS 2,07 m, p90 3,53 m |

**El plano de 1911 no sirve para ubicar estos cruces.** Su leyenda los identifica sin duda («Puentes sobre el
Guaire»: III Restaurador, IV Dolores, V El Paraíso, VI 19 de Diciembre), pero al sur y al oeste del casco casi no
tiene puntos de control y dibuja el río esquemático. Sobre su calce, los tres puentes quedan de 17 a 26 m al este
del eje de 1936 y, a lo largo de la calle, hasta 78 m al norte. En el Puente de Hierro, en cambio, coincide a 2 m.
Se usa para la existencia, el nombre y el largo dibujado; no para la posición.

## Cabezas por cruce y época

Píxeles del mosaico · píxeles del escaneo original. «—» es sin medir.

| Cruce | Plano | Qué dibuja | Cabeza norte | Cabeza sur | Largo | Error |
|---|---|---|---|---|---|---|
| Dolores | 1911 | Trazos gruesos y pedestales al norte, n.º IV | (7988, 9912) · (4079,6, 3911,0) | (7955, 10038) · (4080,0, 3991,5); fin del trazo, sin pedestal | 65,1 m | 78 m al norte y 19,5 m al este del cruce de 1936; GCP a 71 y 137 m, con 16 y 17 m de error |
| Dolores | 1936 | Símbolo cruzado en X con aletas, «Puente Dolores» | (7915, 10079) | (7901, 10165) | 43,6 m (documentado: 60 m) | ±1 m de lectura; ±8 m a lo largo del eje |
| Dolores | 1946 | Calzada continua de 19,5 m, «Puente Soublette» | — | — | — | Eje a 2,4 m del de 1936 |
| Restaurador | 1911 | Trazos gruesos y pedestales en los dos extremos, n.º III | (8559, 9752) · (4385,3, 3743,0) | (8527, 9930) · (4386,6, 3856,6) | 90,4 m (documentado: 100,50 m) | 23 m al norte y 17 m al este del centro de 1936; GCP a 236 m o más |
| Restaurador | 1936 | Calzada de 7 m con plazoleta circular, «Puente Restaurador» | — | — | — | Centro de la plazoleta: (8500,5, 9879,5), ±1 m |
| Restaurador | 1946 | Calzada continua de 19,6 m, sin plazoleta, «Puente Restaurador» | — | — | — | Eje a 1,3 m del centro de 1936 |
| 19 de Diciembre | 1911 | Trazos gruesos y pedestales en los dos extremos, n.º VI | (3246, 10508) · (1439,5, 4822,0) | (3485, 11060) · (1630,7, 5103,5) | 300,8 m, con accesos | Sin acotar: el GCP más cercano está a 510 m. Eje a 25,8 m del de 1936 |
| 19 de Diciembre | 1936 | Calzada continua de 11 m con tranvía, «Puente 9 de Diciembre» | — | — | — | Eje: ±1 m |
| 19 de Diciembre | 1946 | Calzada continua de 12,5 m, «Puente 9 de Diciembre» | — | — | — | Eje a 1,0 m del de 1936 |
| Ayacucho | 1911 | No hay puente: la calle llega al río por las dos orillas | — | — | — | — |
| Ayacucho | 1936 | Calzada continua de 11,5 m, «Puente Ayacucho» | — | — | — | Eje: ±1 m |
| Ayacucho | 1946 | Calzada continua de 12 m, «Puente Ayacucho» | — | — | — | Eje a 2,5 m del de 1936 |

## Adoptado

El eje es siempre el del plano de 1936, el plano base y el único restituido de fotos aéreas. La dirección es un
vector unitario en píxeles del mosaico (x al este, y al sur).

| Cruce | Centro | Eje | Cabezas | Cauce dibujado en 1936 | Cotas del relieve | Error |
|---|---|---|---|---|---|---|
| Dolores | (7908, 10122) | (−0,161, 0,987) | Las del símbolo de 1936: norte (7915, 10079), sur (7901, 10165) | y = 10128–10160: 16 m | 875,9 m y 876,6 m | 1 m de través; 8 m a lo largo |
| Restaurador | (8500,5, 9879,5) | (−0,203, 0,979) | Derivadas: norte (8520,9, 9781,1), sur (8480,1, 9977,9) | y = 9858–9893: 18 m | 873,3 m y 875,5 m | 3 m |
| 19 de Diciembre | (3284, 10727) | (0,358, 0,934) | Sin medir | y = 10712–10742: 16 m | 884,2 m en el centro | 2 m, solo del eje |
| Ayacucho | (6726, 9180) | (−0,099, 0,995) | Sin medir | y = 9155–9205: 25 m | 879,4 m en el centro | 3 m, solo del eje |

- **Dolores.** El símbolo de 1936 mide 43,6 m y la luz documentada es de 60 m. Desde 1916 había dos pilas de concreto
  a 10 m de cada extremo, con 40 m entre ellas: el plano no permite decidir qué representa el símbolo. Con los 60 m
  centrados en él, las cabezas quedarían 8,2 m más afuera: norte (7917,7, 10062,8), sur (7898,3, 10181,2). Hay que
  decidirlo antes de instalar el modelo.
- **Restaurador.** Ningún plano marca sus cabezas con un calce fiable. Se derivan del centro de la plazoleta de 1936
  (la Memoria del MOP de 1905 la sitúa «en el centro» del puente), del eje de la calzada y del largo documentado,
  100,50 m. La norte cae donde termina la manzana edificada del plano de 1936. Vale para 1911 y 1936; en 1946 el
  plano ya no dibuja la plazoleta.
- **19 de Diciembre.** El centro es el medio del río que dibuja el plano de 1936, sobre el eje: supone que el tramo
  de 30 m está sobre ese cauce. Los 300 m del símbolo de 1911 abarcan los accesos, que no tienen medida en las
  fuentes consultadas.
- **Ayacucho.** Las fuentes consultadas no dan su largo ni sus luces. Estarían en la Memoria del MOP de 1925,
  pp. 263–291, que cita Silva Contreras y no se consultó.
- **Cotas.** Del relieve del sitio (Copernicus GLO-30 corregido con las cotas del plano de 1936), que no trae el
  cauce: sirven para los accesos, no para el lecho.
- **Cauce.** Es el ancho del agua dibujada sobre el eje, no el de la playa del río ni el de una crecida. En 1911 el
  plano dibuja de 23 a 33 m de agua en estos cruces, pero en otro lugar.

## Sin medir

| Qué | Por qué |
|---|---|
| Cabezas del Ayacucho, en todas las épocas | Los planos de 1936 y 1946 dibujan la calzada continua; en 1911 no existía. Sin largo documentado no se pueden derivar |
| Cabezas del 19 de Diciembre | Calzada continua en 1936 y 1946; el plano de 1911 las marca, pero sin puntos de control a menos de 500 m |
| Cabezas de Dolores y Restaurador en 1946 | Calzada continua; además no consta qué estructura había |
| Largo real de Dolores sobre el plano | El símbolo de 1936 (43,6 m) no coincide con la luz documentada (60 m) |
| Lecho del río y rasante | El relieve no trae el cauce; ningún plano da la cota del tablero |
| Píxeles del escaneo original de 1936 | El mosaico es la grilla del repo; no se deshizo la costura de las dos hojas |

## Fuentes

- Mónica Silva Contreras, «Puentes metálicos sobre el río Guaire: el carácter de la tradición académica y la imagen
  del diseño estructural», *Tecnología y Construcción* 20-II (2004), pp. 29–42:
  [revista](https://saber.ucv.ve/ojs/index.php/rev_tc/article/view/2916). Medidas documentadas: Dolores, p. 37;
  Restaurador, nota 14; 19 de Diciembre, nota 15.
- Planos del catálogo del repo, con su ficha en `fuentes/mapas/`. No se agrega ninguna imagen al repo.
