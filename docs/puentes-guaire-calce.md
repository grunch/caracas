# Calce de los puentes del Guaire

Avance de [#272](https://github.com/grunch/caracas/issues/272). Las marcas `puente-hierro` y `puente-sucre` eran
anclas aproximadas del mosaico. Acá están las cabezas, el eje y la huella leídos en cada plano, con sus píxeles,
la transformación y el error. Los números completos están en [`puentes-guaire-calce.json`](puentes-guaire-calce.json).

## Cómo se midió

- Recortes ampliados ×4, con rejilla cada 20 px, del mosaico DCN de 1936 (`fuentes/derivados/1936/mosaico-costura.tif`,
  0,5 m/px) y de los planos de 1889 y 1911 ya calzados sobre él (`fuentes/derivados/<año>/calzado.tif`).
- Cada cabeza es el medio de un par de esquinas (Mestre) o de pedestales (Razetti). Lectura a ojo: ±2 px, ±1 m.
- Los píxeles del escaneo original salen del TPS inverso del calce (`tools/geo/calce.py`, `Calce.al_viejo`, con los
  GCP de `tools/geo/gcp/calce-<plano>.json`).
- Nada de esto es un levantamiento: es lectura de planos a 1:5.000 y menores.

| Plano | Fuente y licencia | Calce sobre 1936 (dejando uno fuera) |
|---|---|---|
| Mestre, 1889 | [BnF vía Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Plano_topografico_de_la_ciudad_de_Caracas,_levantado_en_1889_vajo_la_direccion_-_del_general_don_Vicente_S._Mestre_-_btv1b53027837n.jpg), dominio público | 479 GCP, RMS 7,64 m, p90 12,93 m |
| Razetti, 1911 | [Princeton University Library](https://maps.princeton.edu/catalog/princeton-05741v14j), sin derechos conocidos | 738 GCP, RMS 6,71 m, p90 12,04 m |
| DCN, 1936 | [Internet Archive](https://archive.org/details/WCWdb_18053), licencia sin establecer en su ficha | Es la base |

## Puente de Hierro (calle Sur 5)

| Plano | Qué dibuja | Cabeza norte (mosaico · original) | Cabeza sur (mosaico · original) | Largo |
|---|---|---|---|---|
| 1889 | Tablero rayado, n.º 14 | (9438, 9364) · (5320,2, 6791,6) | (9404, 9516) · (5305,2, 6977,9) | 77,9 m sobre el calce; 74,8 m en el original |
| 1911 | Calzada entre dos pares de pedestales, n.º II | (9452,5, 9347) · (4868,8, 3401,6) | (9433, 9537) · (4875,3, 3515,7) | 95,5 m |
| 1936 | Calzada continua, rótulo «Puente de Hierro» | No las marca | No las marca | — |

**Eje.** El de la calzada del plano de 1936: pasa por (9438, 9450) con dirección (−0,111, 0,994); la calzada mide
unos 8 m. Es el plano base y el único restituido de fotos aéreas. El plano de 1911 coincide con ese eje a 1,5 y 2,3 m.
El símbolo de Mestre queda 4,8 m (norte) y 13,2 m (sur) al oeste, girado unos 6°: los GCP más cercanos de su calce
están a 80–210 m. Se toma como error del calce, no como otra posición del puente.

**Centro.** Sobre ese eje, el medio del puente de 1889 y el de 1911 caen a 0,2 m uno del otro: (9438,9, 9441,75).
El ancla anterior de la marca, (9430, 9440), quedaba a 4,5 m.

**Largo.** Ninguna fuente consultada lo da (Silva Contreras documenta los nueve apoyos; el estudio de Miraflores
traía 90 m «nominales»). Los dos planos no coinciden: 77,9 m y 95,5 m. Se adopta el de Mestre, **77,4 m**
proyectado sobre el eje, porque ese plano dibuja los puentes a escala y se puede comprobar: su Puente Constitución
mide 60,7 m sobre el calce y el estudio le da 59,56 m. El plano de 1911, en cambio, da 48 m para el Puente Sucre,
de 60 m de luz documentada. Con la escala que da el Constitución en el original de Mestre (0,400 m/px), el de
Hierro mediría 74,8 m. Incertidumbre: ±3 m.

**Cabezas adoptadas** (mosaico): norte (9447,5, 9364,8), sur (9430,3, 9518,7). Error: 8 m (el RMS de Mestre más la
lectura).

**Cotas.** Del relieve del sitio: 873,5 m en la cabeza norte y 874,1 m en la sur; pendiente del tablero, 0,8 %.
El relieve (Copernicus GLO-30) no trae el cauce: entre las cabezas el terreno baja apenas 0,3 m.

**Huella.** El río, sobre el eje: y = 9400–9450 (1889), 9405–9445 (1911, con las orillas en 9385 y 9478) y
9447–9458 (1936). En 1936 hay dos edificaciones a 1 m del borde este de la calzada, entre y = 9365 y 9410.

## Constitución y Sucre (calle Sur 7), para el PR siguiente

No se instalan todavía. Quedan medidos:

| Plano | Qué dibuja | Cabeza norte (mosaico · original) | Cabeza sur (mosaico · original) | Largo |
|---|---|---|---|---|
| 1889 | Constitución: tablero rayado, n.º 15 | (9720,5, 9338,5) · (5620,7, 6695,5) | (9699, 9458) · (5608,5, 6843,8) | 60,7 m (estudio: 59,56 m) |
| 1911 | Sucre: calzada entre pedestales, n.º I | (9703, 9376) · (5004,9, 3388,2) | (9684, 9470) · (5006,1, 3449,3) | 48,0 m (documentado: 60 m) |
| 1936 | Calzada con tranvía, rótulo «Puente Sucre» | No las marca | No las marca | — |

- Eje de 1936: pasa por (9704, 9440) con dirección (−0,096, 0,995); calzada de unos 9,8 m.
- Río sobre el eje: y = 9358–9400 (1889), 9392–9432 (1911), 9422–9445 (1936). De 1889 a 1936 el cauce dibujado
  se corre unos 30 m al sur: hay que decidir con cuál se queda cada época.
- **Pendiente antes de instalar el Sucre:** el plano de 1911 lo dibuja 12 m más corto que su luz documentada. No se
  puede usar ese plano para las cabezas del Sucre sin otra fuente.
- Cotas del relieve en las cabezas de 1889: 873,2 m y 872,8 m.

## Dolores, Restaurador, 19 de Diciembre y Ayacucho

Su calce sobre los planos de 1911, 1936 y 1946 está en [`puentes-guaire-calce-cruces.md`](puentes-guaire-calce-cruces.md);
los números, en el mismo JSON que los de arriba (claves `puente-dolores`, `puente-restaurador`,
`puente-19-diciembre` y `puente-ayacucho`). Las cabezas del 19 de Diciembre y del Ayacucho quedan sin medir.

## Fuentes

- Mónica Silva Contreras, «Puentes metálicos sobre el río Guaire», *Tecnología y Construcción* 20-II (2004),
  pp. 29–42: [texto de la autora](https://www.academia.edu/8853323/tradici%C3%B3n_acad%C3%A9mica_y_la_imagen_del_dise%C3%B1o_estructural).
- [FAC, «¿Sabía usted…?» n.º 107](https://fundaayc.com/2023/10/15/sabia-usted-107/): inauguración en 1875 como
  prolongación de la calle Sur 5; sustitución en 1937. No da medidas.
- Estudio de Miraflores: `grunch/miraflores`, `docs/puentes-guaire/hierro.md` y `docs/integracion-caracas-puentes.md`.

No se agrega al repo ninguna imagen de terceros.
