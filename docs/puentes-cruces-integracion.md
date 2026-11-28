# Puente Dolores y Puente Restaurador

Avance de [#272](https://github.com/grunch/caracas/issues/272). De los cuatro cruces que
[`puentes-guaire-cruces.md`](puentes-guaire-cruces.md) dejó con marca, ficha y calce, este paso instala el modelo
de dos y explica por qué los otros dos no se instalan. Usa el adaptador de puentes de
[`puente-hierro-integracion.md`](puente-hierro-integracion.md), con un agregado: la franja de agua puede cruzar el
lecho al sesgo. No cierra el issue.

## Qué se instaló y qué no

| Cruce | 1911 | 1936 | 1946 |
|---|---|---|---|
| **Dolores** (calle Sur 4) | **Armadura de 1897**: 60 m de luz sin apoyos | Nada dibujado. El plano lo dibuja en pie, ya con las pilas de 1916: variante sin alzado | Nada. «Puente Soublette», sin estructura documentada |
| **Restaurador** (avenida Sur) | **Puente de 1905**: 100,50 m, plazoleta central, ocho apoyos | Nada dibujado. El plano dibuja la plazoleta, pero el puente fue reparado en 1932: etapa sin alzado | Nada. Calzada del triple, sin plazoleta: no consta la estructura |
| **19 de Diciembre** | No se instala: cabezas sin fijar | No se instala: sin alzado | No se instala: sin alzado |
| **Ayacucho** (calle Sur 14) | No existe | No se instala: sin cabezas ni largo | No se instala: sin cabezas ni largo |

En las épocas sin estructura la marca y la ficha del cruce siguen. No se reserva un vacío: ni casas ni árboles
cambian en 1936 ni en 1946.

**Por qué solo 1911.** El proyecto modela primero en Miraflores y acá instala. El estudio
(`grunch/miraflores`, `src/puentes-guaire-datos.js`, `estadoPuente`) da `modelo: null` para Dolores y Restaurador
en 1936 y 1946: «Las reformas desde 1915 y la desaparición posterior requieren otras variantes; la estructura de
1911 no se prolonga automáticamente» (`docs/puentes-guaire/dolores.md`), y «las reparaciones de 1932 no permiten
asegurar una restitución idéntica en las fechas posteriores» (`restaurador.md`). No se estiró la vida de la
estructura de 1911 para tapar ese hueco.

## Dolores: 60 m centrados en el símbolo de 1936

El calce anterior dejó esto abierto: el símbolo del plano de 1936 mide 43,6 m de aleta a aleta y la luz documentada
es de 60 m. Se resolvió con dos medidas nuevas.

1. **El centro del símbolo es el centro del puente, se lea como se lea.** Si el símbolo es una convención del
   dibujante, su centro es la mejor estimación que hay. Y si fuera el tramo de 40 m entre las dos pilas de concreto
   de 1916, que estaban a 10 m de cada extremo (Silva Contreras, nota 13), su centro también sería el del puente:
   las pilas eran simétricas.
2. **El símbolo no parece estar a escala.** El plano de 1936 usa el mismo símbolo cruzado en X para el Puente
   Paraíso: mide 37,5 m (de y = 9243 a 9318 px sobre su eje), y la armadura de 1895 medía «poco más de 24 m»
   (Silva Contreras, p. 36, según [`puentes-guaire-cruces.md`](puentes-guaire-cruces.md)). Es un indicio y no una
   prueba: no consta que en 1936 siguiera esa armadura.

Así: **60 m (el largo documentado, que no se toca) centrados en (7908, 10122)**, el centro del símbolo.

| Qué | Valor | De dónde sale |
|---|---|---|
| Eje | Pasa por (7912,25, 10100) y (7898, 10170); dirección (−0,199, 0,980) | El medio de los dos bordes del símbolo de 1936, leído fila por fila. La calle Sur 4 llega a la cabeza norte por la misma recta: en y = 10063 su medio queda a 0,4 m |
| Cabeza norte | (7920,0, 10063,2) | A 30 m del centro. Queda 8,2 m al norte de la aleta del símbolo, sobre la calle |
| Cabeza sur | (7896,0, 10180,8) | A 30 m del centro. Queda 8,2 m al sur de la aleta, donde el camino del plano empieza a abrirse en dos |
| Centro | (7908, 10122); en el mundo, x = −530 m, z = 1642 m | El del símbolo |
| Cotas | 876,0 m (norte) y 877,1 m (sur); pendiente 1,9 % | `public/datos/relieve.bin` |
| Error | 1 m de través; hasta 8 m a lo largo del eje | Lectura (±1 m); a lo largo, lo que el símbolo es más corto por lado |

El primer calce daba al eje la dirección (−0,161, 0,987), sacada de las dos esquinas del símbolo (86 px de base).
Releída sobre los bordes, la diferencia a 30 m del centro es de 1,2 m.

El plano de 1911 dibuja el cruce 78 m al norte y 20 m al este, más que el error de su calce: no se usa para el lugar
(ver [`puentes-guaire-calce-cruces.md`](puentes-guaire-calce-cruces.md)).

## Restaurador: cabezas derivadas de la plazoleta

Sin cambios respecto del calce anterior, que se comprobó contra los bordes de la calzada.

| Qué | Valor | De dónde sale |
|---|---|---|
| Centro | (8500,5, 9879,5); en el mundo, x = −234 m, z = 1520 m | El centro de la plazoleta circular del plano de 1936. La Memoria del MOP de 1905 la pone «en el centro» del puente (Silva Contreras, nota 14) |
| Eje | Dirección (−0,203, 0,979) | La calzada del plano de 1936 |
| Cabezas | Norte (8520,9, 9781,1), sur (8480,1, 9977,9) | **Derivadas**: a 50,25 m del centro, por el largo documentado de 100,50 m. Ningún plano las marca con un calce fiable |
| Comprobación | 0,2 m (norte) y 0,7 m (sur) | Distancia de cada cabeza al medio de los dos bordes de la calzada de 1936, leído en y = 9785 (8520,5) y en y = 10020 (8473) |
| Cotas | 873,3 m (norte) y 875,5 m (sur); pendiente 2,2 % | `public/datos/relieve.bin` |
| Error | 3 m | Centro de la plazoleta (±1 m), eje y largo |

La cabeza norte cae donde termina la manzana edificada del plano de 1936. En 1911 el sitio no tiene manzanas ahí.

## El río al sesgo

En los puentes de Hierro y Sucre el río cruza casi a escuadra. Acá no: junto al Restaurador corre a unos 37° del
través, y junto a Dolores, a unos 11°. Con la franja de agua a escuadra, el río del lecho quedaría hasta 12 m
corrido respecto del que pinta el suelo a cada lado.

`sueloDelPuente(lecho, vano, ancho, agua, sesgo)` (`src/hitos/puente.js`) corre la franja `sesgo` metros a lo
largo por cada metro a lo ancho; en la parte, `sesgoAgua`. Los bordes del vano no se mueven. Si la franja corrida se
saliera del vano, falla.

| Puente | Franja de agua sobre el eje | Sesgo | Medido en el plano de 1936, a 16 m del eje |
|---|---|---|---|
| Dolores | De 6,2 a 17,2 m al sur del centro | −0,20 | Al este, de 10,0 a 19,8 m; al oeste, de 2,5 a 14,5 m |
| Restaurador | De −12,7 a 4,3 m | 0,76 | A 16 m al este, de −24,8 a −8,0 m; a 12 m al oeste, de −3,5 a 13,5 m |

Bajo el símbolo de cada puente el plano no dibuja el río: la franja sobre el eje se interpola de los dos lados.

## Reserva

- **Casas:** solo el cauce bajo el tablero, en 1911: 62 × 32 m en Dolores y 102,5 × 28 m en el Restaurador (más
  angosto: a 14,6 m del eje hay un árbol que dibuja el plano de 1936, y el cauce no llega hasta él). Con el
  release `datos-2026-11-28-c5b8180` no le cambia la vida a ninguna casa (0 de 19.663), y en 1911 no hay ninguna en
  la huella ni en los accesos.
- **Árboles:** una franja de 27 m centrada en el eje (el tablero y lo que mide una copa grande a cada lado), hasta
  12 m más allá de cada cabeza. Es más angosta que en los puentes de Hierro y Sucre, que la medían desde el borde
  del cauce: un árbol retirado no vuelve, y acá el puente solo se dibuja en una época. Con el release actual se
  retiran 6 árboles en Dolores y 5 en el Restaurador, todos del monte anterior a la ciudad (`silvestre`). Cinco de
  ellos vivían también en 1936 y 1946 y ya no vuelven: tres en Dolores y dos en el Restaurador, estos dos en medio
  de la calzada que dibuja el plano de 1936. Ningún árbol dibujado en un plano cambia.
- **Colisión:** ninguna. Los puentes se cruzan.
- **1936 y 1946:** ninguna reserva.

## Manzanas

Distancia firmada al borde de la manzana más cercana (`public/plano/suelo-manzanas-modernas.png`, canal de 1911;
2 m por píxel), medida cada medio metro sobre el tablero, los estribos, la plazoleta, el cauce, el margen sin
árboles y los accesos.

| Puente | 1911 | 1936 y 1946 |
|---|---|---|
| Dolores | A más de 16 m de toda manzana (no hay ninguna a menos de 300 m) | Nada que medir: sin estructura ni reserva |
| Restaurador | A más de 16 m (ídem) | Nada que medir |

El E2E `tests/e2e/puentes-cruces-modelos.spec.js` repite la medida sobre los datos servidos, y cuenta casas y
árboles vivos en 1911 dentro de la huella y los accesos: cero.

Si algún día se dibuja una estructura en 1936: junto al Restaurador el plano de ese año tiene una manzana edificada
al oeste de la calzada que llega hasta la cabeza norte (y ≈ 9775), y el cauce la pisaría.

## Qué es interpretativo

- **Dolores.** El lugar a lo largo del eje (hasta 8 m). Altura de la armadura (7 m), doce paneles, arriostramiento
  y colores: del estudio, según una fotografía. Documentado: 60 m de luz sin apoyos, 8 m de ancho, 5 m sobre el
  río, estructura de acero francesa, piso de madera.
- **Restaurador.** Las cabezas (derivadas). Radio de la plazoleta (6,5 m en el estudio; el plano de 1936 la dibuja
  de 14,5 m de diámetro), ocho apoyos intermedios, altura sobre el río (5 m), barandas y faroles simplificados: del
  estudio. Documentado: 100,50 × 8 m, plazoleta circular en el centro, baranda ornamentada, veinte postes para
  faroles.
- **El lecho**, en los dos: un cuenco de 5 m de fondo, de 32 m de ancho en Dolores y 28 m en el Restaurador, de
  cabeza a cabeza. Ni su forma ni su fondo
  están medidos. La franja de agua es el río del plano de 1936, que el suelo pinta en todas las épocas; en 1911 el
  río pudo correr por otro lado.

## No instalados, y qué haría falta

### Puente 19 de Diciembre (1911)

El estudio tiene modelo para 1911: el núcleo de tres tramos documentados (30 m y dos de 15 m). No se instala porque
sus cabezas no se pueden fijar:

- Los planos de 1936 y 1946 dibujan la calzada continua. El de 1911 sí marca dos pares de pedestales, a 300 m uno del
  otro (el puente con sus accesos), pero su punto de control más cercano está a 510 m: ahí el calce es una
  extrapolación sin error acotado, y dibuja el puente 26 m al este de la calzada de 1936.
- El centro del calce supone que el tramo de 30 m está sobre el río que dibuja el plano de 1936 (16 m de agua):
  ±7 m en el mejor caso, y sin saber si el río de 1910 corría por ahí.
- El modelo termina en dos estribos de mampostería a 30 m del centro. El alzado de 1910 consultado en el estudio (recorte
  de referencia, sin licencia establecida, fuera del repo) muestra más tramos a cada lado (de 10 m, y un acceso
  largo hacia un extremo): esos estribos no existieron ahí. El propio estudio dice que «los accesos adicionales del alzado publicado no están incluidos».

Hace falta: (1) un punto fijo de la estructura en un plano con control cerca, o una foto aérea de los años treinta
con las pilas; (2) el largo total con accesos (MOP, *Memoria* de 1911, que cita Silva Contreras en la nota 15, sin
consultar); (3) los tramos de acceso modelados en Miraflores.

### Puente Ayacucho (1936 y 1946)

El estudio tiene modelo para las dos épocas, con 64 m de largo **nominales**; su ficha dice «debe medirse la luz y
el perfil de cada vano antes de instalar». No se instala:

- Ningún plano marca las cabezas: los de 1936 y 1946 dibujan la calzada continua sobre 25 m de agua.
- Ninguna fuente consultada da el largo ni las luces. [FAC](https://fundaayc.com/2022/09/08/1924-inauguracion-del-puente-ayacucho/)
  trae fecha, autor y tipo, sin medidas (página releída para este paso).
- Con los bordes del agua de 1936 y un largo inventado, el error de cada cabeza pasaría de 15 m.

Hace falta: MOP, *Memoria* de 1925, pp. 263–291 (citada por Silva Contreras, p. 38), o una foto aérea a escala.

### Estructuras de 1936 y 1946

- **Dolores, 1936:** la armadura de 1897 con las dos pilas de concreto de 1916 (a 10 m de cada extremo; luz de
  40 m) y, quizá, piso de concreto (informe de 1922). Falta esa variante en Miraflores. El plano de marzo de 1936
  la dibuja en pie; [FAC](https://fundaayc.com/2023/04/02/sabia-usted-98/) la da por demolida en 1935. La
  contradicción queda en `dudas` de la marca y de la ficha.
- **Restaurador, 1936:** falta saber qué cambió la reparación de 1932 (MOP, *Memoria* de 1932, p. 218, sin
  consultar). Si no cambió lo que se ve, bastaría con que el estudio lo diga.
- **1946, los tres metálicos:** FAC sitúa los reemplazos «a partir de 1940», sin fecha por puente. Sin fuente no se
  dibuja nada.

## Fuentes

- Mónica Silva Contreras, «Puentes metálicos sobre el río Guaire: el carácter de la tradición académica y la imagen
  del diseño estructural», *Tecnología y Construcción* 20-II (2004), pp. 29–42:
  [revista, Universidad Central de Venezuela](https://saber.ucv.ve/ojs/index.php/rev_tc/article/view/2916).
  Paraíso, p. 36; Dolores, pp. 36–37 y nota 13; Restaurador, pp. 37–38 y nota 14; 19 de Diciembre, p. 38 y nota 15;
  Ayacucho, p. 38. Las Memorias del MOP y El Cojo Ilustrado se citan a través de ella.
- [Plano de Razetti, 1911](https://maps.princeton.edu/catalog/princeton-05741v14j) (Princeton University Library,
  sin derechos conocidos), [plano DCN, 1936](https://archive.org/details/WCWdb_18053) y
  [plano DCN, fotos de 1946](https://archive.org/details/WCWdb_18051) (Internet Archive, licencia sin establecer
  en su ficha).
- FAC: [¿Sabía usted? 98](https://fundaayc.com/2023/04/02/sabia-usted-98/) (Dolores),
  [104](https://fundaayc.com/2023/08/06/sabia-usted-104/) (19 de Diciembre),
  [107](https://fundaayc.com/2023/10/15/sabia-usted-107/) (fotografías de consulta) y
  [Puente Ayacucho](https://fundaayc.com/2022/09/08/1924-inauguracion-del-puente-ayacucho/).
- Estudio de Miraflores: `grunch/miraflores`, `docs/puentes-guaire/{dolores,restaurador,diciembre,ayacucho}.md`,
  `src/puentes-guaire.js` y `src/puentes-guaire-datos.js`.

No se agrega al repo ninguna imagen de terceros.

## Capturas

En [`capturas/puentes-cruces-modelos/`](capturas/puentes-cruces-modelos/): antes (`main`) y después, misma cámara,
desde arriba y de costado, en 1911, 1936 y 1946; y en tinta, de costado, en 1911. El Restaurador de costado va con
`PUENTE_LEJOS=1.6`: a 85 m no cabe.

En tinta el suelo de 1911 es la hoja de Razetti, que dibuja estos cruces en otro lugar (78 m al norte el de Dolores,
23 m el del Restaurador): el modelo no cae sobre el símbolo de esa hoja. Es el desvío del calce, ya declarado.

```sh
PUENTE_CAPTURA=1911,1936,1946 PUENTE_CRUCE=-530.1,1641.5 PUENTE_VISTA=arriba,costado node tests/e2e/capturas-puente-hierro.mjs http://localhost:5199/ docs/capturas/puentes-cruces-modelos dolores-despues
PUENTE_LEJOS=1.6 PUENTE_CAPTURA=1911,1936,1946 PUENTE_CRUCE=-233.85,1520.25 PUENTE_VISTA=arriba,costado node tests/e2e/capturas-puente-hierro.mjs http://localhost:5199/ docs/capturas/puentes-cruces-modelos restaurador-despues
```
