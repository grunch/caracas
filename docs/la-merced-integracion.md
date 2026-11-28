# Las Mercedes: etapas, huella e instalación (#244)

El templo del [issue #244](https://github.com/grunch/caracas/issues/244), con el patrón de los templos de
[#259](templos-259-integracion.md) y de [La Candelaria](candelaria-integracion.md). Tarea T82.LM del plan.

## Qué había y de dónde sale el modelo

En `main` (`27abd10`) La Merced era una marca sin hito, puesta a mano en (8880, 5830). Ese punto cae **unos 95 m al
oeste** del templo que dibujan los seis planos, sobre otra manzana: el nombre estaba sobre casas que no eran las de
la iglesia. La marca y la ficha venían del [PR #229](https://github.com/grunch/caracas/pull/229)
([nota](issue-90-1772.md)), que dejó dicho que el solar seguía sin cotejar.

**No hay estudio en Miraflores**: ningún archivo de `grunch/miraflores` (`origin/main`) nombra La Merced ni Las
Mercedes. El modelo se hizo acá:

- la **planta** es el contorno del templo en el plano de 1936 ([lectura](la-merced-georreferencia.json));
- el **volumen** es la descripción del catálogo del IPC, que también da las fechas de la obra;
- **solo se instala el templo de 1857**, desde el primer plano que lo dibuja terminado (1889). Del convento y de
  la iglesia anteriores no se halló ninguna descripción: no se dibujan.

## Ficha de evidencias por etapa

Certeza: **alta** = el documento lo dice o lo dibuja; **media** = se infiere de dos fuentes que coinciden o es una
fuente secundaria sin cita; **baja** = interpretación. «IPC» es el Catálogo del Patrimonio Cultural Venezolano
2004–2007, municipio Libertador, [«Lo construido»](https://albaciudad.org/wp-content/uploads/2017/01/Libertador-Construido2.pdf),
pp. 150–151. «Guía CCS» es la ficha n.º 49 de [guiaccs.com](https://guiaccs.com/en/obras/nuestra-senora-de-las-mercedes-church/)
(textos de Iván González Viso, María Isabel Peña y Federico Vegas; sin bibliografía en la página).

| Etapa (hecho) | Qué dice la fuente | Fuente (fecha del documento) | Certeza | En el mapa |
|---|---|---|---|---|
| s. XVII | Hospicio de mercedarios con una capilla; el terremoto de 1641 lo destruye y en 1647 el obispo Mauro de Tovar manda demoler la iglesia | IPC (2004–2007) | media | — |
| 1614 | «Un grupo de mulatos» levanta una capilla en este sitio | Guía CCS (página actual) | media: contradice el traslado de 1681 del IPC | — |
| 1681 | «Se traslada la Iglesia de las Mercedes, que permanece hasta su destrucción por el terremoto de 1812» | IPC | media | — |
| 1766 | La iglesia, ya reconstruida, es dañada por otro terremoto y se rehace | Guía CCS | media: el IPC no lo menciona | — |
| 1772 | Visita del obispo Martí al convento | *Historia general de la Iglesia en América Latina*, t. VII, pp. 228–229 ([PDF](https://docs.enriquedussel.com/txt/Textos_Libros_Editados_ED/L.Edi.4_Tomo7_Colombia_y_Venezuela.pdf)); citada en `docs/issue-90-1772.md`, no releída acá | media | — |
| 1772 | Símbolo de iglesia en el lugar, con una plazuela al sur | Plano de 1772 (`fuentes/mapas/1772-pares-agi-exato-mapa`), calce 18,7 m RMS | alta para la presencia | **sin geometría**: no hay descripción del templo ni del convento |
| 1812–1813 | El terremoto destruye la iglesia; en 1813 «se construye una capilla provisional» | IPC | media | — |
| 1839 | Salen los últimos religiosos | *Historia general…*, pp. 228–229 | media | — |
| 1842–1857 | «En 1842 se da inicio a la construcción de la iglesia actual, proyectada por el sacerdote Jannato Madalaine, inaugurándose finalmente en 1857» | IPC | media: una sola fuente | — |
| 1843 | Letra E «La Merced» en la leyenda; un recuadro en blanco de unos 15 × 22 m donde está el templo | Plano de Jesurún de 1843 (`specs/auditoria-1843/leyenda.json`), calce 12,4 m RMS | alta para el nombre | **sin geometría**: el templo llevaba un año en obra; la capilla de 1813 no tiene forma conocida |
| 1881 | Estatua del mariscal Falcón «en la plaza de las Mercedes ó Falcón», inaugurada el 28-10-1881 | Landaeta Rosales, [*La iglesia y plaza de la Candelaria*](https://archive.org/details/laiglesiayplazad00land) (1908), p. 18 | alta | **sin geometría** |
| 1889 | Templo IX; al este, la plaza M | Plano de Mestre de 1889 | alta | tres naves con la central más alta y más ancha, dos torres a los lados de la fachada sur |
| 1900 | El terremoto «afectó levemente su estructura» | Guía CCS | media | — |
| 1911 | Bloque del templo (I) y plaza (10) | Plano de Razetti de 1911 | alta | igual |
| 1936, 1946 | «Iglesia Las Mercedes»; contorno de 46 × 23,7 m con la nave central de 13 m y el atrio al sur | Planos DCN de 1936 y de 1946 | alta | igual |
| hoy | Planta rectangular de tres naves separadas por columnas y arcos de medio punto; fachada neoclásica «con dos cuerpos y tres calles, totalmente simétrica», tres accesos de arco rebajado, tres ventanas encima y «frontis triangular» en la calle central; «a cada lado se levantan las torres campanarios de dos cuerpos, en el segundo de forma ochavada se ubican vanos con arcos de medio punto, rematando en una cúpula de media naranja con linterna»; Monumento Histórico Nacional (Gaceta Oficial 26.320, 2-2-1960) | IPC | alta para el templo actual | de aquí sale el volumen |
| hoy | Nave central «de mayor altura» con bóvedas ojivales; columnas de capitel toscano; «tuvo un cementerio detrás» | Guía CCS | media | la nave central más alta; el cementerio, sin geometría |

### Contradicciones y dudas

- **Origen**: el IPC habla de un hospicio destruido en 1641 y de un traslado en 1681; la Guía CCS, de una capilla
  de 1614 rehecha tras 1641 y 1766. No se resolvió: nada de eso se dibuja.
- **1772 y 1843 quedan sin edificio.** El convento estaba en pie en 1772 (D4 de `specs/13`: un nombre sin
  edificio), pero no se halló ni una línea sobre su forma: ni naves, ni torre, ni claustros. En 1843 la iglesia
  vieja estaba destruida, la nueva llevaba un año en obra y no se sabe qué quedaba del convento. La marca se
  conserva en las dos épocas porque el lugar y el nombre sí están documentados.
- **Qué es de 1857.** El IPC describe el templo de hoy y no dice si las torres son de la obra de 1842–1857 o
  posteriores; la Guía CCS dice que el terremoto de 1900 lo dañó «levemente». Va el mismo volumen de 1889 a 1946.
- **«Jannato Madalaine»** es la grafía del IPC; no se halló al proyectista en otra fuente.
- **El lugar en los planos antiguos** coincide con el de 1936 solo dentro del calce de cada plano: en 1772 el
  símbolo cae unos 20 m al noroeste (calce de 18,7 m RMS) y en 1843 el recuadro en blanco está en el lugar, pero
  la letra E de la leyenda cae una cuadra al oeste: de ahí venía el ancla anterior. La marca lo dice en sus dudas.

## Entorno

- **Plaza**: el plano de 1889 la dibuja al este del templo (M) y el de 1911 al norte y al este (10); Landaeta la
  llama «de las Mercedes ó Falcón» y fecha la estatua en 1881. No se modela: no se leyó su contorno ni hay vista.
- **Convento**: ni claustros ni dependencias; no hay planta en ninguna fuente.
- **Cementerio** detrás del templo (Guía CCS): sin fecha ni tamaño; no se dibuja.
- **Atrio**: los 7 m que el plano de 1936 deja entre la fachada y la calle quedan dentro de la reserva, sin modelar.

## Referencias visuales

**No se usó ninguna imagen.** En `fuentes/imagenes/` no hay vistas de Las Mercedes; las fotos de la página de la
Guía CCS no tienen fecha, autor ni licencia a la vista y no se consultaron para el modelo. El adorno de la fachada
es el de la parte `temploDeNaves` (tres puertas, pilastras, frontón sobre la nave central), no un retrato.

## Huella, reserva y R13

Planta, eje y contorno leído: [`la-merced-georreferencia.json`](la-merced-georreferencia.json).

| | Medida |
|---|---|
| Planta (colisión) | naves de 38 × 23,7 m y presbiterio de 8 × 13 m |
| Reserva (sin casas ni árboles) | 58 × 24,3 m: el atrio, el templo y el saliente de la cabecera (1.409 m²) |

Medido con `medirHitos` (`tools/hitos-manzanas.mjs`) sobre los informes `retiro-<año>` de los datos completos
(`/disco/dev/caracas-datos-sur`), fuera del repo. Las mismas filas de 1889 a 1946:

| Manzana | Manzana bajo el recinto | Recinto en la manzana | Huella en la manzana | Clase | Decisión |
|---|---|---|---|---|---|
| `V1772-38515-0-0` (10.820 m²) | 3,4 % | 26,4 % | 25,7 % | a caballo | se conserva |
| `U1772-0069` (15.658 m²) | 2,3 % | 25,7 % | 29,2 % | a caballo | se conserva |
| `U1772-0068` (17.844 m²) | 0,2 % | 2,2 % | 0 % | roce | se conserva |
| `U1772-0083` (12.007 m²) | 0,1 % | 0,7 % | 0 % | roce | se conserva |

**No retira ninguna manzana** ni cambia la decisión de otro hito. Queda **a caballo** (límite, como Santa Rosalía,
San Agustín y el Panteón en `docs/manzanas-hitos.md`): la mitad del recinto cae entre dos manzanas de la
reconstrucción de 1772, en el espacio que ese tejido deja abierto donde el plano de 1772 dibuja la iglesia y su
plazuela, y la otra mitad muerde el borde de las dos. No ocupa ninguna (3,4 % como máximo).

## Datos generados

Este PR **no regenera ni publica datos**. Con los datos publicados, la reserva actúa al cargar (`suprime` y
`sinArboles`) desde 1889: esconde las casas y los árboles que pisan el solar. En 1772 y 1843 no cambia nada: las
capturas de `main` y de la rama son iguales en el mapa (difieren 9 píxeles del borde inferior de la interfaz).

Al regenerar (`npm run datos`), los pasos de manzanas y de retiro leen `hitosConPlanta()` y reparten las casas de
`V1772-38515-0-0` y `U1772-0069` sin pisar la reserva desde 1889. `npm run datos:al-dia` avisa por `src/hitos/`.

## Qué es interpretativo

- **Todas las alturas**: naves laterales de 9 m, nave central de 13 m, torres de 14 m hasta el tambor y 8 m de
  tambor ochavado, cúpula y linterna.
- Que las torres ocupen el pie de las naves laterales (los cuadros que el plano cierra ahí) y su lado de 5,6 m.
  En el modelo tapan las puertas laterales de la fachada: el IPC habla de tres accesos y no dice dónde quedan
  respecto de las torres.
- La cubierta de teja, los vanos, las pilastras y el color.
- Que el presbiterio tenga la altura de la nave central.

## Rendimiento

1.351 triángulos más: 645.327 antes de 1946 y 1.124.700 en total (con La Candelaria, de #314). Los topes de los
tests suben de 645.000 a 647.000 y de 1.125.000 a 1.127.000. Build: entrada 305,7 kB y workers 174,2 kB (con La
Candelaria daban 304,7 y 173,5; `main`, 303,4 y 172,4); el tope de workers sube de 174 a 176. La medición de carga
y de cuadro, en [`mediciones/la-merced-244`](mediciones/la-merced-244/README.md).

## Capturas

`docs/capturas/la-merced-244/las-mercedes-<antes|despues>-<año>-<arriba|costado>.webp`: `main` (`27abd10`) y esta
rama, misma cámara, en las seis épocas, con los datos completos
(`TEMPLO=las-mercedes TEMPLO_GPU=1 node tests/e2e/capturas-templos.mjs`).

## Pendiente

- **1772**: una descripción del convento y de su iglesia (el acta de la visita de Martí, que acá solo se conoce
  por una cita de segunda mano) para poder dibujarlos.
- **1843**: qué había en pie (capilla de 1813, muros del convento, avance de la obra).
- Una vista fechada del templo entre 1857 y 1936 y cualquier medida de altura; qué se rehízo tras 1900.
- La plaza de las Mercedes o Falcón, con su estatua (1881), y el cementerio.
- Regenerar y publicar los datos; revisar `docs/manzanas-hitos.json` después.
- La prueba a mano de una persona.
