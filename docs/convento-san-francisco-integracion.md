# El convento de San Francisco antes de la Universidad: etapas, planta e instalación (#254)

El conjunto del [issue #254](https://github.com/grunch/caracas/issues/254), con el patrón de los templos de
[#259](templos-259-integracion.md) y de [La Candelaria](candelaria-integracion.md). Tarea T82.CF del plan.

## Qué había y de dónde sale el modelo

En `main` el lugar tenía:

- la **iglesia** de San Francisco por épocas (PR #184, `src/hitos/datos/san-francisco.js`), que no se toca;
- el hito **`universidad`** desde 1889: un bloque de 96 × 56 m con frente neogótico, sin patios
  (`src/hitos/datos/civiles.js`), que tampoco se toca;
- la marca `universidad`, que desde 1772 se llama «Convento de San Francisco», sobre **un solar vacío con
  árboles**: la reserva del hito de la Universidad ya quitaba las casas en todas las épocas, y en 1772 y 1843 no
  había edificio.

**No hay estudio del convento en Miraflores.** `docs/iglesia-san-francisco.md` y
`docs/integracion-caracas-san-francisco.md` son de la iglesia; del convento solo dicen que quedaba al oeste, que el
campanario de 1745 estaba «en el enlace con el convento» y que se disolvió en 1837. El modelo se hizo acá, y solo
con lo que tiene fuente:

- el **lugar** y el **número de patios** salen de los planos (ver «Lectura de los planos»);
- las **medidas** salen del levantamiento del edificio de hoy que publica la guía de arquitectura de Caracas;
- el **volumen** es de un piso con tejado, que es lo que deja ver la litografía de hacia 1845; las alturas no
  tienen fuente y van dichas así.

Es el punto débil y va dicho en todas partes: **ningún plano de 1772 ni de 1843 dibuja el interior de la cuadra**.
Los claustros de esas épocas son una lectura hacia atrás.

## Ficha de evidencias por etapa

Certeza: **alta** = el documento lo dice o lo dibuja; **media** = fuente secundaria que cita, o dos que coinciden;
**baja** = fuente sin citas o interpretación. «Briceño» es Leopoldo Briceño-Iragorry, «El Paraninfo del Palacio de
las Academias. Personajes», *Gaceta Médica de Caracas* 109(3), 2001
([SciELO](https://ve.scielo.org/scielo.php?pid=S0367-47622001000300011&script=sci_arttext)), que da como fuente a
Carlos F. Duarte y Graziano Gasparini, *Historia de la iglesia y el convento de San Francisco de Caracas* (Banco
Venezolano de Crédito, 1991): **ese libro no se consultó**. «IAM» es la ficha de
[IAM Venezuela](https://iamvenezuela.org/2015/09/palacio-de-las-academias/) (29-9-2015), tomada, según dice, del
*Catálogo del patrimonio cultural venezolano 2004-2007* del IPC. «Wikipedia» es
[Palacio de las Academias](https://es.wikipedia.org/wiki/Palacio_de_las_Academias) (versión del 11-11-2026), cuyo
relato histórico **no lleva citas**. «Guía» es la ficha de la
[guía de arquitectura de Caracas](https://guiaccs.com/obras/palacio-de-las-academias/) (firmada IGV).

| Etapa (hecho) | Qué dice la fuente | Fuente (fecha del documento) | Certeza | En el mapa |
|---|---|---|---|---|
| 1575–1586 | Se ceden «cuatro solares» en una de las 24 manzanas; el convento «primigenio» empieza en 1577 y se concluye nueve años después | Wikipedia; la Guía: «erigido en 1577» | baja | — |
| 1577; 1684–1687 | Los franciscanos llegan en 1577 y empiezan a construir «en algún sitio, de seguro que no el actual»; «hacia 1684-87 es en realidad la fecha de inicio de la construcción del convento» | Briceño (2001); IAM: «desde 1684» | media | — |
| siglo XVIII | Las edificaciones «fueron destruidas en sucesivos terremotos y reconstruidas sucesivamente hasta el siglo XVIII, y conformaban el cuerpo principal del inmueble actual» | IAM (2015) | media | es el apoyo para leer la planta de hoy hacia atrás |
| mediados del XVIII–1794 | «Se decide construir otra parte del convento en la parte posterior de la edificación terminándolo en 1794» | Wikipedia, sin cita | baja | **en 1772 solo va el claustro del norte**; el solar de atrás queda reservado y vacío |
| 1772 | La cuadra entera en rojo (edificado), sin interior | Plano de 1772, calce de 18,7 m RMS | alta para que estaba edificado; nada sobre la forma | — |
| 1812 | «Buena parte es destruida por el fuerte sismo» | Wikipedia, sin cita. El estudio de la iglesia dice que el templo resistió con daños reparables | baja | **sin geometría**: no se halló qué se cayó ni cuándo se rehízo |
| 1821 | «Por ley de 1821 fueron suprimidos todos los conventos de la Gran Colombia»; después, «cuartel y hospital» | Briceño; Wikipedia e IAM coinciden | media | — |
| 1837 | Disolución del convento; el templo pasa al obispado | Estudio de la iglesia en Miraflores (sin fuente propia) | baja | — |
| 1838 | «Funcionó en su recinto la Dirección General de Instrucción y el "Colegio de la Independencia"» | Briceño | media | en uso: va techado en 1843 |
| 1840–1845 o 1844–1873 | «Las Cámaras Legislativas lo ocuparon desde 1844 a 1873» (Briceño); «entre 1840 y 1845 fue sede de la Cámara de Diputados» (Wikipedia) | Briceño; Wikipedia | media para que el Congreso sesionaba ahí en 1843–1844; las fechas no coinciden | — |
| 1843 | Plazuela en blanco delante del convento y de la iglesia; la leyenda solo nombra la iglesia (N «San Francisco»); el resto de la cuadra, edificado | Plano de Jesurún, calce de 12,4 m RMS | alta para la plazuela | el convento completo; **la plazuela no se abre** |
| hacia 1845 | A la derecha de la iglesia y de su espadaña, un cuerpo largo con tejado, más bajo que la nave, con una fila de ventanas sobre un muro bajo; al fondo, una portería con cruz | Litografía anónima (`fuentes/imagenes/1845-commons-iglesia-de-san-francisco`), dominio público | media: procedencia débil, 640 px | el frente bajo y con tejado |
| 1856 | «La Universidad de Caracas que venía ocupando su primitivo edificio de la esquina de Las Monjas se traslada al antiguo Convento» | Briceño; Wikipedia: «de 1856 a 1953» | media | la marca no cambia de nombre hasta 1889 (ver «La marca») |
| 1872–1876 | Se derriba la fachada del convento y se hace la neogótica, de Juan Hurtado Manrique; «se construyó en el piso alto, fachada norte, su salón principal, actual Paraninfo», inaugurado el 3-12-1876 | IAM (derribo en 1872, remodelación de 1873); Briceño (paraninfo); Wikipedia («nueva fachada y… una segunda planta, culminando los trabajos en 1876»); la Guía («mantuvo la altura de la edificación») | media | el hito `universidad`, desde 1889 |
| 1875–1883 | «El 28 de octubre de 1875 se inaugura el Edificio del Museo, una continuación de la fachada de la Universidad, coronado por la torre de planta hexagonal proyectada como observatorio… solo fue construida la fachada… se completaría en 1883, para alojar la Exposición Nacional» | IAM | media | **sin geometría propia**: el bloque de la Universidad cubre también ese lugar |
| 1883 | Estatuas de Vargas y Cajigal «en los patios norte y sur» (29 y 30-7-1883) | Briceño | media | sin geometría |
| 1889 | 3 «Universidad», con **tres patios en fila** de norte a sur, el del sur abierto a la calle; 4, un cuerpo al noroeste; VII, la iglesia | Plano de Mestre, calce de 7,6 m RMS | alta para los tres patios | de aquí salen el número y el orden de los patios de 1772 y 1843 |
| 1911 | 16, una franja de unos 35 m pegada a la iglesia, de calle a calle; 24 y 25, al noroeste | Plano de Razetti, calce de 6,7 m RMS | alta | — |
| 1922 | Se extiende la fachada norte (Carlos Toro Manrique y Luis Soriano) | Wikipedia, sin cita; la Guía: «modificaciones interiores en 1922, 1930 y 1949» | baja | sin cambio en el modelo |
| 1930 | «Se modificó la fachada sur… Era abierta, con escalinatas para alcanzar la acera y en su centro existió una estatua de Bolívar» | Briceño. Coincide con el patio del sur abierto del plano de 1889 | media | sin cambio en el modelo |
| 1936 | «Universidad Central» y «Academia de la Historia»: dos patios grandes en fila junto a la «Iglesia San Francisco» y otro al noroeste | Plano DCN de 1936 | alta | el hito `universidad`, sin patios |
| 1946 | Lo mismo: dos patios en fila junto a la iglesia y uno en forma de H al noroeste | Plano DCN de 1946, calce de 2,1 m RMS | alta | igual |
| 1949; 1952–1956 | Nueva fachada sur por el Centro Simón Bolívar; la Universidad se va y llegan las Academias; Monumento Histórico Nacional (Gaceta Oficial n.º 25.020 del 6-4-1956) | Wikipedia; Briceño; IAM | media | fuera de las épocas del mapa |

### Contradicciones y dudas

- **Cuándo se hizo el convento.** 1577–1586 (Wikipedia, la Guía) o desde 1684–1687 en este lugar (Briceño, IAM).
  Para 1772 da igual: en las dos lecturas ya existía. No se decide.
- **La parte de atrás y 1794.** Solo lo dice Wikipedia, sin cita. Que «la parte posterior» sean los dos patios del
  sur es una lectura de este modelo. Si el dato fuera falso, en 1772 faltaría medio convento; si fuera cierto y la
  obra ya estuviera techada en 1772, también. No hay cómo saberlo con estas fuentes.
- **1812.** «Buena parte» destruida (Wikipedia) contra un templo que resistió (estudio de la iglesia). No se halló
  una descripción de los daños del convento. Va entero en 1843 porque en 1838 y 1844 estaba en uso y la litografía
  de hacia 1845 muestra el frente techado.
- **¿Un piso o dos?** Wikipedia atribuye la segunda planta a la reforma terminada en 1876; la Guía dice que Hurtado
  Manrique «mantuvo la altura»; Briceño, que el paraninfo «se construyó en el piso alto»; la litografía deja ver
  una fila de ventanas sobre un muro bajo, que puede ser un piso alto sobre un cerco o un solo piso de ventanas
  altas. Va de **un piso**, y es una decisión, no un dato.
- **1840–1845 o 1844–1873** para las Cámaras: las dos fuentes van en la ficha, sin elegir.
- **1856 y la marca.** La Universidad ocupa el edificio desde 1856, pero el mapa no tiene época entre 1843 y 1889:
  el cambio de nombre cae en 1889, que es cuando un plano del catálogo lo rotula. La fecha institucional de la
  Universidad (1721) no fecha esta sede, y la «primera sede» sigue siendo la marca `seminario`.
- **El ancho.** El plano de Mestre dibuja la Universidad de 65 m de ancho con los patios en el medio; el
  levantamiento de hoy da 32 m para la columna de claustros y Razetti, una franja de unos 35 m. Además, en esta
  cuadra el plano de 1889 calzado queda de 10 a 15 m al oeste (dibuja la iglesia de a = 35 a 59 y está de 50 a
  72). Del plano de 1889 se toma el número y el orden de los patios, no las medidas.
- **Los patios en 1936 y 1946** quedan de 7 a 10 m más al oeste que en el levantamiento de hoy.
- **Citas de segunda mano.** Lo de Duarte y Gasparini se conoce por Briceño; lo del catálogo del IPC, por IAM.
  Ninguno se cotejó. La ficha del sitio lo atribuye así en sus textos.

## Lectura de los planos

Detalle, en metros del marco del hito, en [`convento-san-francisco-georreferencia.json`](convento-san-francisco-georreferencia.json).

- **1772**: no dibuja el interior. **1843**: tampoco; dibuja la plazuela.
- **1889** es el primer plano del catálogo que dibuja los patios: tres, en fila, junto a la iglesia.
- El **levantamiento de hoy** (la Guía, con escala gráfica) tiene los mismos tres patios en el mismo orden,
  pegados al muro oeste de la iglesia: dos claustros de unos 25 × 25 m y un patio menor al sur, en una columna de
  32,3 m de ancho y 97 m de fondo. De ahí salen las medidas, con medio metro de error de lectura en un patio y
  hasta 2 m en el fondo.
- IAM dice que las edificaciones coloniales «conformaban el cuerpo principal del inmueble actual» y que el edificio
  tiene «tres patios con corredores» organizados «de manera secuencial». Es el apoyo, de segunda mano, para llevar
  esa planta a 1772 y 1843. **No prueba** que cada crujía de hoy sea colonial.

## Huella, reserva y R13

| | Medida |
|---|---|
| Planta (colisión) en 1772 | frente, dos corredores y una crujía: 881 m² |
| Planta (colisión) en 1843 | cuatro crujías y seis corredores: 1.680 m²; los tres patios se caminan |
| Reserva (sin casas ni árboles), de 1772 a 1889 | la columna entera, 32,3 × 97 m: 3.133 m² |
| Reserva de la Universidad (desde 1889, sin cambios) | 96 × 56 m: 5.376 m² |

Medido con `medirHitos` (`tools/hitos-manzanas.mjs`) sobre los informes `retiro-<año>` de los datos completos
(`/disco/dev/caracas-datos-sur`), fuera del repo:

| Épocas | Manzana | Manzana bajo el recinto | Recinto en la manzana | Ocupación con la iglesia | Clase | Decisión |
|---|---|---|---|---|---|---|
| 1772, 1843 | `U1772-0202` (16.782 m²) | 18,7 % | 100 % | 26,1 % | chico | se conserva |
| 1889 a 1946 (Universidad e iglesia, sin cambios) | `U1772-0202` | 32,0 % | 100 % | 40,2 % | chico | se conserva |

Es **chico**: va dentro de su manzana, sin casas ni árboles encima, y no retira nada. La ocupación de 1772 y 1843
queda lejos del 50 % que retira una manzana. Con la huella que dibuja Mestre (65 × 105 m) habría llegado al
49,1 %, a un metro y medio de ancho del umbral: otra razón para no usar sus medidas.

La reserva del convento se sale 41 m hacia el sur de la que ya tenía la Universidad: en 1772 y 1843 esconde las
casas genéricas que el mapa tenía ahí. Desde 1889 vuelven (como casas nacidas en 1889), porque el bloque de la Universidad es menos hondo que
lo que dibujan los planos (ver «Pendiente»).

## Datos generados

Este PR **no regenera ni publica datos**. Con los datos publicados, la reserva actúa al cargar en 1772 y 1843.
Desde 1889 el dibujo no cambia, salvo la pared de una casa que la reserva esconde hasta 1843 (43 píxeles en la
captura desde arriba; ver «Capturas»).

Al regenerar (`npm run datos`), los pasos de manzanas y de retiro de 1772 y 1843 reparten las casas de
`U1772-0202` sin pisar la reserva. `npm run datos:al-dia` avisa por `src/hitos/`.

## La marca y la ficha

La marca sigue siendo `universidad`, enlazada al hito `universidad` (`hito:`), con «Convento de San Francisco»
hasta 1843 y «Universidad» desde 1889. Su punto es el medio del frente de la Universidad, 18 m al oeste del muro
del convento modelado: **no se movió**, porque sirve a las seis épocas. Se le agregaron las fuentes. La ficha tiene
ahora un texto para 1772, otro para 1843 y otro desde 1889, y cada uno dice qué interpreta el dibujo de esa época.

## Cotejo de la Universidad desde 1889

No se cambió el hito `universidad`. Lo que el cotejo encontró, para un PR propio:

- **Fondo**: el modelo mide 56 m; los planos de 1889, 1936 y 1946 dibujan el conjunto de calle a calle (unos
  105 m), con patios.
- **Patios**: tres en 1889; dos grandes y otro al noroeste en 1936 y 1946. El modelo no tiene ninguno.
- **Frente**: 96 m en el modelo. En 1889, 65 m de Universidad más 26 m del cuerpo 4 (¿el Museo de 1875–1883?);
  en 1936, 108 m con la «Academia de la Historia». IAM dice que el Museo fue «una continuación de la fachada»;
  Wikipedia, que la fachada norte se extendió en 1922. El modelo lleva el mismo frente de 1889 a 1946.
- **Torre del observatorio**: IAM la describe «de planta hexagonal», al extremo oeste de la fachada, sobre el
  Museo. **No está en el modelo.** La foto de fines del XIX del repo (`1895-commons-universidad-palacio-de-las-academias`)
  muestra la torre central de reloj y aguja, que sí está.
- **Qué era el 4 del plano de 1889**: la leyenda de Mestre no está transcrita en el repo. Que sea el Museo es una
  conjetura.
- La foto de 1880 con la estatua de Guzmán Blanco sigue con la identificación dudosa.

## Referencias visuales

Ninguna imagen nueva se incorpora al sitio ni al paquete de fotos.

| Imagen | Fecha | Autor y procedencia | Licencia | Para qué se usó |
|---|---|---|---|---|
| «Iglesia y parte del convento de San Francisco» (`fuentes/imagenes/1845-commons-iglesia-de-san-francisco`) | hacia 1845 | Litografía anónima; Wikimedia Commons | dominio público (ficha del repo) | El frente del convento: bajo, con tejado |
| «Palacio de las Academias» (`fuentes/imagenes/1895-commons-universidad-palacio-de-las-academias`) | fines del siglo XIX | Autor desconocido; Biblioteca Nacional, vía Commons | dominio público (ficha del repo) | Cotejo de la fachada de 1889: sin cambios |
| Planta del Palacio de las Academias | sin fecha (ficha web de 2017) | Guía de arquitectura de Caracas, [guiaccs.com](https://guiaccs.com/obras/palacio-de-las-academias/) | no establecida: solo enlace | Medidas de la columna de claustros. Es el edificio de **hoy**, no una prueba de la forma antigua |
| «Palacio de las Academias, antigua Universidad», c. 1883; «Antiguo Palacio de la Exposición», c. 1878; «Plano de la Exposición del Centenario», 1883; «Jardines internos de la Universidad» (Luis Felipe Toro, s. f.) | las de cada pie | En la ficha de [IAM Venezuela](https://iamvenezuela.org/2015/09/palacio-de-las-academias/), sin procedencia | no establecida: solo enlace | No se usaron para el modelo. El plano de la Exposición de 1883 serviría para el cuerpo 4 |
| «University of Caracas 1911» | 1911 | Wikimedia Commons, en el artículo de Wikipedia | sin verificar acá | No se usó |

No se halló ninguna vista de los claustros anterior a 1876, ni del observatorio.

## Qué es interpretativo

- **Que la planta de hoy sea la de 1772 y 1843**, y que en 1772 solo estuviera el claustro del norte.
- **Todas las alturas**: 5 m las crujías, 3,2 m los corredores; y que fuera de un piso.
- Los corredores como cuerpos cerrados: las arquerías no tienen descripción ni vista fechada.
- Los tejados (a dos aguas, con la cumbrera a lo largo de cada crujía) y el color.
- Que no hubiera nada al oeste de la columna: no se sabe.

## Rendimiento

180 triángulos más: 644.354 antes de 1946 y 1.123.727 en total, dentro de los topes (645.000 y 1.125.000), que
no se tocaron. Build: entrada 309,1 kB (tope 346) y workers 175,4 kB; **el tope de workers sube de 174 a 176**
(`main` mide 173,6). La medición de carga y de cuadro, en
[`mediciones/convento-254`](mediciones/convento-254/README.md): nada cambia más que el ruido, salvo la vista
«cerca», de 0,2 a 0,6 ms más lenta en la mediana, que no se volvió a medir.

## Capturas

`docs/capturas/convento-254/convento-<antes|despues>-<año>-<arriba|frente>.webp`: `main` y esta rama, misma
cámara, en las seis épocas, con los datos completos
(`CONVENTO_GPU=1 node tests/e2e/capturas-convento-254.mjs`). Las de antes se tomaron sobre `b482621`, antes de que
entrara La Candelaria (#314), que queda a más de un kilómetro; se repitió la de 1889 desde arriba sobre `fab5b25` y
salió idéntica.

De 1889 a 1946, la vista de frente es idéntica píxel por píxel y la de arriba cambia en **43 píxeles** de
1.296.000: una línea de la pared de una casa al sur de la Universidad. La causa más probable, que no
se verificó en el código de las casas: es una de las que la reserva del convento esconde en 1772 y 1843, y al
volver en 1889 cuenta como nacida ese año (`vidaSinHito`, `src/hitos/suprimir.js`).

## Pendiente

- Consultar a Duarte y Gasparini (1991) y el catálogo del IPC: de ahí saldría qué crujías son coloniales, cuántos
  pisos tenía el convento y qué pasó en 1812. Y la visita del obispo Martí de 1772, por si describe el convento.
- Abrir la plazuela de San Francisco en el tejido de 1843 (y ver si el plano de 1772 la tiene): hoy hay casas
  genéricas delante del frente. Pide tocar el generador de manzanas y regenerar los datos.
- Rehacer el hito `universidad` con sus patios, su fondo de calle a calle, el Museo de 1875–1883 y la torre del
  observatorio; transcribir la leyenda de Mestre para saber qué es el 4.
- Alinear la fachada de la iglesia con el frente del convento: el hito de la iglesia la tiene 8 m más al norte.
- Las arquerías de los claustros y la portería de la litografía.
- Regenerar y publicar los datos; la prueba a mano de una persona.
