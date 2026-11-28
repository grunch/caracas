# Hitos y manzanas: ningún hito sobre una manzana (R13)

Regla del responsable (27-11-2026): «No pongas el hospital ni ningún edificio sobre la manzana; si es un edificio
pequeño puedes agregarlo dentro de la manzana, pero si es grande hay que quitar la manzana.» Es la R13 de
[`specs/13`](../specs/13-reglas-de-construccion.md).

La medida y la decisión son de `tools/geo/hitos_manzanas.py`; los pasos `retiro-<año>` la aplican a las manzanas
heredadas y a las nuevas de cada época. `node tools/hitos-manzanas-tabla.mjs` vuelve a escribir la tabla completa
([`manzanas-hitos.json`](manzanas-hitos.json): una fila por hito, época y manzana que se cruzan, con las áreas y
las fracciones en los dos sentidos) desde los informes de `fuentes/derivados/retiro<año>/`.

## Qué se mide

Por cada hito de `hitosConPlanta()` en pie en la época y cada manzana que comparte al menos 1 m² con su recinto:

- **huella**: la unión de sus plantas (lo edificado); **recinto**: la huella más su zona de supresión (lo que reserva);
- **manzana bajo el recinto** (y bajo la huella): qué fracción de la manzana cubre;
- **recinto en la manzana** (y huella en la manzana): qué fracción del hito cae en esa manzana;
- **ocupación**: la fracción de la manzana bajo los recintos de **todos** los hitos en pie.

## El criterio

Una manzana se **retira entera** en la época (casas, árboles y suelo de manzana) si:

1. la ocupación es **≥ 50 %** (los hitos ocupan la mayor parte), o
2. la pisa en **≥ 10 %** un hito cuyo recinto es **mayor que la manzana** (no puede estar «dentro» de ella: la abarca).

Si no, se conserva, y el cruce queda en una de tres clases: **chico** (≥ 75 % del recinto cae en la manzana: el
hito va dentro, sin casas ni árboles encima, como hasta ahora), **roce** (menos de 10 % de la manzana y del hito:
no se distingue del error de calce) o **a caballo** (ni cabe ni manda: límite declarado abajo).

Por qué esos umbrales, con los datos:

- **50 %.** Entre las manzanas que se conservan, la ocupación más alta es 41 % (Plaza La Concordia),
  40 % (Universidad con San Francisco) y 35 % (Catedral con el Palacio Arzobispal); entre las que se retiran por
  ocupación, la más baja es 51 %. No hay ningún caso entre 41 % y 51 %: cualquier umbral en ese hueco da lo mismo.
  Bajarlo a un tercio se llevaría la manzana de la Catedral.
- **10 %** para el hito mayor que la manzana. El Hospital Vargas (recinto de 27.000 m²) declara un calce de 7,6 m
  RMS: en una cuadra de 100 m, una franja de ese ancho es un 8 %. Los cruces de un hito mayor que la manzana que se
  conservan llegan a 3 %; los que se retiran empiezan en 13 %. Tampoco hay casos en el hueco.
- **75 %** solo separa «chico» de «a caballo» (no decide retiros): los chicos empiezan en 77 % y los que quedan a
  caballo no pasan de 41 %.

Una manzana retirada deja de heredarse, y mientras el hito siga en pie su suelo cuenta como ocupado: el plano de las
épocas siguientes no levanta otra manzana encima (si no, la cuadra del hito volvería con otro nombre y con casas
pegadas a él). Cuando el hito muere, la manzana retirada se olvida y vuelve lo que el plano de esa época dibuja,
sin inventar nada.

## Qué se retira, por época y por hito


**1772** — quedan 252 manzanas, se retiran 1:

- capitolio: `U1772-0203` (16.615 m², 96 %)

**1843** — quedan 398 manzanas, se retiran 1:

- capitolio: `U1772-0203` (16.615 m², 96 %)

**1889** — quedan 484 manzanas, se retiran 2:

- hospital-vargas: `V1772-38689-0-0` (213 m², 100 %)
- capitolio: `U1772-0203` (16.615 m², 96 %)

**1911** — quedan 876 manzanas, se retiran 9:

- hospital-vargas: `V1772-38689-0-0` (213 m², 100 %), `M4-0042-A0` (95 m², 13 %), `M4-0044-A0` (7.069 m², 19 %)
- capitolio: `U1772-0203` (16.615 m², 96 %)
- circo-metropolitano: `U1843-0224-A0` (1.365 m², 51 %)
- hijos-de-dios: `M4-0005-A0` (238 m², 81 %), `M4-0006-A0` (42 m², 75 %), `M4-0007-A0` (188 m², 78 %)
- cementerio-sur: `M4-0542-A0` (136 m², 100 %)

**1936** — quedan 7053 manzanas, se retiran 27:

- hospital-vargas: `V1772-38689-0-0` (213 m², 100 %), `M4-0042-A0` (95 m², 13 %), `M4-0044-A0` (7.069 m², 19 %), `M5-0887-A0` (5.926 m², 21 %), `M5-1015-A0` (41 m², 100 %), `M5-1046-A0` (151 m², 22 %), `M5-1048-A0` (45 m², 100 %), `M5-1064-A0` (82 m², 100 %), `M5-1088-A0` (15.006 m², 35 %), `M5-1107-A0` (1.169 m², 82 %), `M5-1225-A0` (1.100 m², 100 %)
- capitolio: `U1772-0203` (16.615 m², 96 %)
- circo-metropolitano: `U1843-0224-A0` (1.365 m², 51 %)
- hijos-de-dios: `M4-0005-A0` (238 m², 81 %), `M4-0006-A0` (42 m², 75 %), `M4-0007-A0` (188 m², 78 %), `M5-0571-A0` (190 m², 98 %), `M5-0586-A0` (2.431 m², 100 %), `M5-0642-A0` (81 m², 100 %)
- cementerio-sur: `M4-0542-A0` (136 m², 100 %), `M4-0552-A0` (45 m², 100 %), `M4-0560-A0` (123 m², 100 %), `M5-7418-A0` (71 m², 100 %), `M5-7518-A0` (275 m², 100 %)
- nuevo-circo: `M4-0376-A0` (9.101 m², 64 %)
- panteon: `M5-1834-A0` (626 m², 91 %)
- plaza-bolivar: `M5-3554-A0` (505 m², 100 %)

**1946** — quedan 10685 manzanas, se retiran 47:

- hospital-vargas: `V1772-38689-0-0` (213 m², 100 %), `M4-0042-A0` (95 m², 13 %), `M4-0044-A0` (7.069 m², 19 %), `M5-0887-A0` (5.926 m², 21 %), `M5-1015-A0` (41 m², 100 %), `M5-1046-A0` (151 m², 22 %), `M5-1048-A0` (45 m², 100 %), `M5-1064-A0` (82 m², 100 %), `M5-1088-A0` (15.006 m², 35 %), `M5-1107-A0` (1.169 m², 82 %), `M5-1225-A0` (1.100 m², 100 %)
- capitolio: `U1772-0203` (16.615 m², 96 %)
- hijos-de-dios: `M4-0005-A0` (238 m², 81 %), `M4-0006-A0` (42 m², 75 %), `M4-0007-A0` (188 m², 78 %), `M5-0571-A0` (190 m², 98 %), `M5-0586-A0` (2.431 m², 100 %), `M5-0642-A0` (81 m², 100 %)
- cementerio-sur: `M4-0542-A0` (136 m², 100 %), `M4-0552-A0` (45 m², 100 %), `M4-0560-A0` (123 m², 100 %), `M5-7418-A0` (71 m², 100 %), `M5-7518-A0` (275 m², 100 %)
- nuevo-circo: `M4-0376-A0` (9.101 m², 64 %)
- panteon: `M5-1834-A0` (626 m², 91 %)
- plaza-bolivar: `M5-3554-A0` (505 m², 100 %)
- silencio-bloque-6 + silencio-bloque-7: `V1772-36235-0-0` (12.849 m², 67 %), `M1889-0150-A0` (2.164 m², 77 %)
- silencio-bloque-2 + silencio-bloque-3: `V1772-36568-0-0` (13.001 m², 58 %)
- silencio-bloque-1: `V1772-36273-0-0` (7.433 m², 94 %), `V1772-38746-0-0` (967 m², 16 %), `U1843-0213-A0` (1.736 m², 18 %), `M4-0281-A0` (3.927 m², 94 %), `M4-0286-A3` (3.830 m², 35 %), `M4-0295-A0` (715 m², 90 %), `M4-0295-A3` (1.747 m², 92 %), `M5-3733-A0` (1.342 m², 51 %)
- silencio-bloque-1 + silencio-bloque-5: `V1772-36015-0-0` (4.893 m², 58 %)
- silencio-bloque-7: `V1772-36540-0-0` (4.223 m², 58 %)
- silencio-bloque-4: `V1772-38741-0-0` (81 m², 58 %), `V1772-38742-0-0` (53 m², 100 %), `V1772-38743-0-0` (39 m², 81 %), `U1843-0209-A0` (2.685 m², 81 %), `M1889-0118-A1` (96 m², 45 %)
- silencio-bloque-5: `M4-0323-A0` (48 m², 100 %), `M4-0324-A0` (194 m², 70 %), `M4-0325-A0` (51 m², 100 %)

Las manzanas `M4-` y `M5-` bajo el Panteón, la Plaza Bolívar, los cementerios y el Hospital Vargas son envolventes
de lo que el plano de esa época dibuja edificado: la huella del propio edificio o recinto, que el modelo sustituye.

## Casos frontera y límites

- **Hospital Vargas, 1911 a 1946.** Tres manzanas grandes se retiran con solo 19 % a 35 % bajo el recinto
  (`M4-0044` desde 1911; `M5-0887` y `M5-1088` desde 1936): cada una tiene un pabellón encima y el recinto es
  mayor que ellas. Con ellas se van las casas que tenían fuera del recinto (de 6 a 9 por manzana). Es la lectura
  literal de «si es grande hay que quitar la manzana»; son los retiros con menos solape de toda la tabla, junto con
  dos retazos de El Silencio en 1946 (`V1772-38746`, 16 %, y `U1843-0213`, 18 %).
- **Nuevo Circo, 1936 y 1946.** Ocupa 64 % de `M4-0376`, heredada de 1911: se retira entera, con las casas que
  quedaban alrededor del ruedo en la misma cuadra.
- **Circo Metropolitano, 1911 y 1936.** Se retira `U1843-0224` (51 %, la retirada por ocupación más cerca del
  umbral). Sobre `M4-0353` queda a caballo (41 % del recinto, 13 % de la manzana): límite.
- **El Silencio, 1946.** Las manzanas de 1772 a 1936 bajo los siete bloques se retiran (`V1772-36568` por los
  bloques 2 y 3 juntos, 58 %: ninguno la ocupa solo).
- **Plaza La Concordia y solar de La Rotunda (41 %), Universidad con San Francisco (40 %), Catedral con el Palacio
  Arzobispal (35 %)**: chicos, dentro de su manzana. La Rotunda (1889–1911) ocupa 27 % de la suya; al morir, la
  manzana sigue y el solar queda dentro.
- **A caballo (límite, no se corrige acá):** el **Circo Metropolitano** (arriba), el **Panteón** (31 % de su huella sobre `V1772-38339`, 14 % de esa
  manzana, de 1843 a 1946) y **San Agustín** (38 % sobre `U1772-0134`, 5 % de la manzana, en 1936 y 1946) pisan el
  borde de una manzana y el resto cae en la calle. No son mayores que la manzana ni la ocupan: retirarla abriría un
  hueco de una cuadra entera por un solape de calce. El modelo queda en parte sobre suelo de manzana, como antes. Lo que corresponde es revisar la posición del hito contra el
  plano, no la manzana.
- **Roces** (se conservan): Hospital Vargas con `M4-0065` y `M4-0066` (3 % y 2 %), Teatro Municipal con
  `U1772-0052` (1 %), Circo Metropolitano con `V1772-36189` (1 %), San Agustín con `U1772-0133` (0,4 %).


