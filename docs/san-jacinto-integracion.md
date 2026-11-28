# San Jacinto: el conjunto dominico y su transformación en mercado (#245)

El lugar del [issue #245](https://github.com/grunch/caracas/issues/245), con el patrón de los templos de
[#259](templos-259-integracion.md). Tarea T82.SJ del plan.

## Qué había y de dónde sale el modelo

En `main` (`fab5b25`) el lugar tenía la marca «Convento de San Jacinto» → «San Jacinto» → «Mercado de San
Jacinto» → «Mercado Principal» ([PR #231](https://github.com/grunch/caracas/pull/231), [nota](issue-96-1772.md)),
sin hito: en las seis épocas, una manzana con casas genéricas en tres de sus lados y el resto en verde. La marca de
la plaza caía al oeste de la calle, sobre casas (D4 de `specs/13`).

**No hay estudio en Miraflores** (ni `src/patrimonio-*.js` ni `docs/prioridades/` nombran San Jacinto). El modelo
se hizo acá con tres hitos en el mismo solar, uno por etapa:

| Hito | Épocas | Qué dibuja | De dónde sale |
|---|---|---|---|
| `san-jacinto` | 1772, 1843 | Iglesia de tres naves bajo un tejado, con la fachada al norte y una puerta; nave de los Terceros al este; torre al oeste; claustro de un piso al este | Dávila Cordido (2013), que cita a Vivas (1997) y a Bueno (2004) |
| `solar-mercado-san-jacinto` | 1889 | El solar con piso de tierra, **sin edificio** | Plano de Mestre («Mercado público»); Pérez Gallego (obras hasta 1895) |
| `mercado-san-jacinto` | 1911, 1936, 1946 | El cuerpo norte del mercado de 1897: tres naves adosadas con techo de zinc detrás de un frente de dos pisos | Pérez Gallego (2017); contorno del plano de 1936 |

## Ficha de evidencias por etapa

Certeza: **alta** = el documento lo dice o lo dibuja; **media** = fuente secundaria que cita la primaria, o dos
que coinciden; **baja** = interpretación. «Dávila» es Mariolly Dávila Cordido, «Estudio para la valoración y
recuperación del patrimonio arquitectónico religioso venezolano a través de técnicas digitales: iglesia de San
Jacinto, caso de estudio», SIGraDi 2013, pp. 177–181
([PDF](https://pdf.blucher.com.br/designproceedings/sigradi2013/0032.pdf)). «Pérez Gallego» es Francisco Pérez
Gallego, «Juan Hurtado Manrique: ingeniero de formación, arquitecto de profesión», Trienal de Investigación FAU
UCV 2017, p. 10 ([PDF](https://trienal.fau.ucv.ve/2017/publicacion/articulos/HP/extenso/TIFAU2017_Extenso_HP-10_FPerezG.pdf)).
«Landaeta, *Pilas*» es Manuel Landaeta Rosales, *Estatuas y pilas antiguas de Caracas* (1907)
([Internet Archive](https://archive.org/details/estatuasypilasan00land)).

| Etapa (hecho) | Qué dice la fuente | Fuente (fecha del documento) | Certeza | En el mapa |
|---|---|---|---|---|
| 1595–1597 | Los dominicos adquieren el solar; en 1600 no estaban acabadas las edificaciones | Dávila, p. 178, por Vivas (1997). La guía guiaccs.com da 1591 para la fundación | media; **fecha en disputa** | — |
| 1641 | Un sismo destroza la iglesia; se reconstruye con los materiales de la anterior | Dávila, p. 178 | media | — |
| 1698 | Seis pilares separan las naves; capillas del Santísimo Jesús y del Rosario a los lados del altar mayor | Fray Manuel de Santa María, por Bueno (2004, p. 150), en Dávila, pp. 179–180 | media, de tercera mano | — |
| 1772 | La iglesia «era de tres naves separadas por pilares que sujetaban arcos de medio punto con techos de pares y nudillos estilo mudéjar»; tenía «una sola puerta de entrada, además de la nueva nave de la Orden de los Terceros» | Visita del obispo Martí según Vivas (1997, p. 110) y Bueno (2004, p. 151), en Dávila, pp. 178–179 | media: **no se cotejó el texto de Martí** | iglesia de 39 × 18,5 m con una puerta y nave de los Terceros de 6,5 m |
| 1772 | Símbolo de iglesia en el ángulo noroeste de la cuadra edificada; la plaza, en blanco, al oeste y al norte | Exato mapa de 1772, calce de 18,7 m RMS | alta para la presencia | — |
| s. XVII–XVIII | Retablo mayor de 9 × 14,9 varas (7,50 × 12,45 m), hoy en parte en San Mateo | Bueno (2004, p. 155), en Dávila, p. 179 | media | la cumbrera, a 12,5 m |
| 1802 | Reloj de sol en la plaza, a sugerencia de Humboldt | guiaccs.com, **sin fuente citada** | baja | sin geometría |
| 1812 | El terremoto arruina la iglesia y el convento; los frailes hacen una capilla provisional en la plaza | Dávila, pp. 178–179, por fray Felipe Espinosa. guiaccs.com: «solo quedó en pie la torrecilla» | media | — |
| 1821, 1837 | Primera ley de extinción de conventos menores; supresión definitiva del convento | Dávila, p. 178 | media | — |
| 1828 | Parte del terreno pasa al Ayuntamiento y el resto, a cárcel pública | guiaccs.com, sin fuente citada; la figura de Vivas rotula «Cárcel Municipal» y «Cuartel de Milicias» | baja | el claustro sigue dibujado como tal |
| 1837 | Inventario de la entrega del templo: describe una iglesia en pie (la «quinta construcción») | Bueno (2004, p. 154), en Dávila, p. 179 | media | la iglesia, en pie en 1843 |
| 1843 | Letra M «San Jacinto», entre las iglesias y conventos; plaza en blanco con un recuadro suelto en su ángulo sureste | Plano de Jesurún, calce de 12,4 m RMS (`specs/auditoria-1843/leyenda.json`) | alta para la presencia; el plano no dibuja el contorno | el mismo conjunto que en 1772 |
| 1845 | La pila de piedra de la plaza de San Pablo pasa a la de San Jacinto | Landaeta, *Pilas* | alta | sin geometría |
| 1848–1852 | San Jacinto, declarado lugar del mercado (1848); proyecto de A. Lutowsky (1852), **que no se hizo**; su plano, acotado en varas, muestra los límites de la iglesia | Dávila, p. 179 | media | — |
| 1865, 1874 | La iglesia sigue en pie: Dávila la reconstruye «a su estado en 1865» y cita una foto de Lessmann de 1874 | Dávila, pp. 178 y 180 | media | — |
| 1874–1875 | Guzmán Blanco crea una Junta de Fomento para demoler la iglesia (1874); la iglesia se demuele en 1875 para ampliar el mercado | Pérez Gallego, p. 10; Landaeta, *Los cementerios de Caracas* (1906), pp. 7–8 | alta; **un año de diferencia** entre las dos | el conjunto muere antes de 1889 |
| 1879–1883 | Pila de mármol «la India» en el centro de la plaza (1879); se quita para poner la estatua de Antonio Leocadio Guzmán (1883) | Landaeta, *Pilas*. guiaccs.com fecha el nombre «El Venezolano» en 1882 | alta | sin geometría |
| 1889 | «Mercado público» (23): un cuadro de unos 60 × 57 m con una franja libre hacia la plaza B, «del Venezolano» | Plano de Mestre | alta para el uso; **nada sobre el edificio** | el solar, sin volumen |
| 1874–1895 | Las obras del mercado «se extendieron hasta 1895» | Pérez Gallego, p. 10 | media | el solar, sin volumen |
| 1891 | El mercado se amplía sobre un pasaje del lado de la plaza | Landaeta, *Pilas* | alta | — |
| 1895–1897 | Proyecto nuevo de Juan Hurtado Manrique con Alejandro Chataing; estructura metálica encargada en septiembre de 1895 a La Métallurgique, de Bélgica; muerto Hurtado en 1896, sigue Norbert Paquet; inaugurado en septiembre de 1897 | Pérez Gallego, p. 10 (por Silva, 2010, p. 213); Iribarren (2010) reseñada en [fundaayc.com](https://fundaayc.com/2017/03/12/algo-mas-sobre-la-postal-no-53/) | media | — |
| 1897 | «Un conjunto formado por tres cuerpos autónomos adosados, de los cuales el central era de mayor altura y ancho que los laterales, antecedidos por un volumen de dos pisos de mampostería y tratamiento neoclásico», con cubiertas que «al final optaron por bóvedas rebajadas de metal galvanizado» | Pérez Gallego, p. 10; fotos de *El Cojo Ilustrado* del 1-11-1897 (sus figuras 21 y 22) | media | tres naves de 27, 34 y 22 m con techo bajo de zinc y un frente de dos pisos |
| 1896 | El mercado se hace «sobre los mismos cimientos de la iglesia, respetando su planta y sus principios estructurales» | Dávila, p. 179, sobre el plano de Manrique | media | el mercado ocupa el lugar de la iglesia y del claustro |
| 1911 | Mancha roja «43» en L | Plano de Razetti | alta para la presencia | el mercado |
| 1928 | Refacciones «en tiempos de Gómez»; quizá las fachadas | fundaayc.com | baja | no se distinguen |
| 1936 | «Mercado Principal», rayado, en L: cuerpo norte de 83 × 45 m y otro al sur | Plano DCN de 1936 | alta | el cuerpo norte |
| 1946 | «Mercado Principal», el mismo contorno | Plano DCN levantado con fotos de 1946, calce de 2,07 m RMS | alta | el cuerpo norte |
| 1942 o 1947 | «Desaparición en 1942» (fundaayc.com); «dejó de funcionar como mercado en 1947» (guiaccs.com) | las dos, sin fuente primaria | baja; **contradicción** | va en pie en 1946 |

### Contradicciones y dudas

- **Hacia dónde miraba la iglesia.** Dávila dice que la puerta «daba a la plaza» y que el templo estaba «en el
  medio del solar», y redibuja los alzados «norte y oeste». En la figura de Vivas el espacio libre queda al norte,
  entre la iglesia y la calle, y la plaza, al oeste. Va con la **fachada al norte**: el plano de 1772 deja en
  blanco, como plaza, también ese frente. No se cotejó con Vivas ni con la foto de 1874.
- **El estado en 1843.** Arruinada en 1812 y en pie en el inventario de 1837 y en 1874. No se halló cuándo se
  reparó ni con qué cambios (la reconstrucción de Dávila para el siglo XIX tiene tres puertas). Va igual que en
  1772, y la ficha lo dice.
- **El recuadro de la plaza en el plano de 1843.** Un rectángulo de 30 × 25 m en su ángulo sureste, sin letra.
  Podría ser la capilla provisional de 1812; ninguna fuente lo dice. No se modela.
- **1874 o 1875** para la demolición: Pérez Gallego fecha en 1874 la junta que la dispuso; Landaeta, en 1875 la
  demolición. No se contradicen del todo.
- **1889.** El rótulo «Mercado público» no dice qué había construido. Se sabe que la iglesia ya no estaba, que
  las obras seguían y que el edificio de hierro es de 1895–1897. Por eso el solar va **sin edificio**.
- **El final del mercado**: 1942 o 1947, contra un plano de 1946 que todavía lo rotula. Sin resolver.
- **Citas de segunda mano.** Martí, Bueno, Vivas, fray Manuel de Santa María y fray Felipe Espinosa se conocen
  por el artículo de Dávila; Silva (2010), por Pérez Gallego; Iribarren (2010), por la reseña de fundaayc.com.
  Ninguno se cotejó. Los textos de la ficha lo dicen así.

## Lugar, huella y manzana (R13)

Lectura de cada plano y de la figura de Dávila en [`san-jacinto-georreferencia.json`](san-jacinto-georreferencia.json).

**La manzana del mapa no es la del plano de 1936.** El mapa usa en las seis épocas la manzana de la reconstrucción
de 1772 (`V1772-37095-0-0`): 108 × 110 m, 16 m más angosta que la cuadra del plano de 1936, con el lado norte de
11 a 14 m más al sur y girada 3° más. Con las coordenadas del plano de 1936, el frente del mercado y el claustro
quedaban en la calle del mapa y solo el 44 % del recinto caía en la manzana. Los tres hitos se midieron entonces
**desde la esquina noreste de la manzana del mapa**, a lo largo de sus lados. El costo: el mercado queda unos 13 m
al sur y 8 m al oeste de su contorno de 1936, y la plaza, 8 m más angosta.

| | Medida |
|---|---|
| Iglesia (colisión) | tres naves de 39 × 18,5 m y nave de los Terceros de 39 × 6,5 m; torre de 7 m |
| Claustro (colisión) | 52 × 40,5 m, con patio |
| Reserva del conjunto (1772 y 1843) | iglesia con su atrio de 13 m y claustro: 3.510 m² |
| Reserva del solar (1889) y del mercado (desde 1911) | 83 × 44 m: 3.652 m² |

Medido con `medirHitos` (`tools/hitos-manzanas.mjs`) sobre los informes `retiro-<año>` de los datos completos
(`/disco/dev/caracas-datos-sur`), fuera del repo:

| Épocas | Hito | Manzana | Manzana bajo el recinto | Recinto en la manzana | Clase | Decisión |
|---|---|---|---|---|---|---|
| 1772, 1843 | `san-jacinto` | `V1772-37095-0-0` (8.955 m²) | 32,3 % | 82,3 % | chico | se conserva |
| 1889 | `solar-mercado-san-jacinto` | la misma | 28,0 % | 68,6 % | **a caballo** | se conserva; límite |
| 1911, 1936, 1946 | `mercado-san-jacinto` | la misma | 28,0 % | 68,6 % | **a caballo** | se conserva; límite |

**Límite declarado.** El límite de la manzana del mapa deja afuera, como plaza, el ángulo noroeste que dibuja el
plano de 1772. El tercio oeste del mercado cae ahí: no pisa otra manzana ni la calle, sino el suelo que el mapa
conserva como plaza de 1772 en todas las épocas. No se puede resolver sin regenerar la manzana por época
(1889 en adelante con el contorno del plano de 1936), que es trabajo del generador y no de este PR. El conjunto
dominico entra como chico: la iglesia queda en parte sobre ese mismo ángulo, donde el plano de 1772 pone su símbolo.

Ninguno retira la manzana ni cambia la decisión de otro hito. Las casas genéricas de los lados oeste, sur y este
de la manzana siguen en su lugar.

## La plaza

No se modela como hito: en el mapa ya está libre (es la parte de la manzana sin casas). Se corrigió su **marca**,
que estaba en (9265, 7040), al oeste de la calle y sobre casas: ahora va en (9335, 7110), dentro de la plaza del
plano de 1936 y a unos 15 m del borde del mercado. La pila de piedra (1845–1879), la pila de mármol (1879–1883), la
estatua de Antonio Leocadio Guzmán (desde 1883), la baranda y el reloj de sol **no se dibujan**: no se halló su
forma ni su lugar exacto. La ficha cuenta la pila y la estatua con su fuente.

## Referencias visuales

Ninguna se incorpora al sitio ni al paquete de fotos.

| Imagen | Fecha | Autor y procedencia | Licencia | Para qué se usó |
|---|---|---|---|---|
| Superposición de planos de la cuadra (solar de 1997, Lutowsky 1852, Manrique 1896) | 1997 | Virginia Vivas, en Dávila, fig. 2 | derechos reservados (Blucher Design Proceedings); la del original, no establecida | Lugar y tamaño de la iglesia y del claustro; lado de la torre |
| Plano del mercado | 1896 | Juan Hurtado Manrique, en Dávila, fig. 2 | no establecida para la reproducción | Los tres cuerpos sobre la calle del norte y sus anchos |
| Plantas del templo en 1600–1641, 1772 y 1812 | 2011 | Dávila, fig. 3 (reconstrucción propia) | derechos reservados | Que la nave de los Terceros y la torre van en lados opuestos |
| Fachadas y secciones del templo, siglos XVIII y XIX | 2011 | Dávila, fig. 5 (reconstrucción propia) | derechos reservados | Una puerta en el XVIII; ala de dos pisos en el XIX (no se siguió: sin fecha) |
| Iglesia de San Jacinto | 1874 | Foto de F. Lessmann, en Dávila, fig. 2 (miniatura) | no establecida | No se usó: ilegible al tamaño publicado |
| Óleo de Nuestra Señora de Caracas; grabado de W. Wood, *Vista de la ciudad de Caracas* (1851) | s. XVIII; 1851 | Citados por Dávila, fig. 4 | no establecida | No se usaron |
| Mercado de San Jacinto, exterior e interior | 1-11-1897 | *El Cojo Ilustrado*, en Pérez Gallego, figs. 21 y 22 | la revista es de 1897; la de la reproducción, no establecida | Frente de dos pisos con vanos de arco sobre una calle con rieles; techo bajo detrás |
| Postal n.º 53 del mercado | sin fecha | fundaayc.com, tomada de iamvenezuela.com; sin autor | no establecida | No se usó |

`fuentes/imagenes/` no tiene ninguna imagen del conjunto ni del mercado, y este PR no agrega ninguna: de las de
arriba, ninguna tiene licencia establecida.

## Qué es interpretativo

- **Todas las alturas.** Lo único escrito es el alto del retablo mayor (12,45 m), que fija la cumbrera de la
  iglesia, y que el cuerpo central del mercado era más alto que los laterales.
- **El lugar y el tamaño del conjunto dominico**: leídos de una figura de 748 píxeles y llevados a una manzana del
  mapa corrida respecto de la real. Puede estar a 15 o 20 m de su sitio y errar 5 m en el tamaño.
- La fachada (la «clásica» de la iglesia paramétrica, con una puerta), la torre (dos cuerpos y chapitel) y el
  claustro (crujías de 9 m, un piso, un solo patio).
- Que en 1843 todo esté como en 1772.
- El piso de tierra del solar en 1889.
- Los techos del mercado, a dos aguas y bajos en vez de bóvedas; el frente sin su orden neoclásico; los 36 m de
  largo de las naves.

## Datos generados

Este PR **no regenera ni publica datos**. Con los datos publicados, las reservas actúan al cargar: esconden las
casas y los árboles de `V1772-37095-0-0` que pisan el recinto de la época (seis casas del lado norte y del ángulo
noreste). Al regenerar (`npm run datos`), los pasos de manzanas y de retiro reparten las casas sin pisar las
reservas. `npm run datos:al-dia` avisa por `src/hitos/`.

## Rendimiento

2.583 triángulos más (convento 1.400, solar de 1889 590, mercado 593): con `main` (`fab5b25`, que ya trae La
Candelaria), 646.757 antes de 1946 y 1.126.130 en total. Los topes unitarios suben de 645.000 a 650.000 y de
1.125.000 a 1.130.000. Build: entrada 310,6 kB y workers 176,9 kB (173,6 en `main`); el tope de workers sube de
174 a 178. La medición de carga y de cuadro, con dos llamadas de dibujo de más que no se explicaron, en
[`mediciones/san-jacinto-245`](mediciones/san-jacinto-245/README.md).

## Capturas

`docs/capturas/san-jacinto-245/san-jacinto-<antes|despues>-<año>-<arriba|costado>.webp`: `main` (`fab5b25`) y esta
rama, misma cámara, en las seis épocas, con los datos completos
(`TEMPLO=san-jacinto TEMPLO_GPU=1 node tests/e2e/capturas-templos.mjs`).

## Pendiente

- El estudio de Virginia Vivas (Fundapatrimonio, 1997) y los de fray Antonio Bueno (2004, 1998): con ellos se
  cotejan la orientación, las medidas en varas del plano de Lutowsky y la visita de Martí.
- La manzana por época: desde 1889 la cuadra debería ser la del plano de 1936 (plaza al oeste, mercado al este,
  pasaje entre los dos). Mientras sea la de 1772, el mercado queda a caballo.
- El cuerpo sur del mercado (puestos y ala suroeste) y lo construido en 1889.
- La plaza como hito: pila, estatua, baranda y reloj de sol, con una vista fechada y con licencia.
- Iribarren, *De Catedral a San Jacinto* (2010), para la forma del mercado antes de 1897 y sus refacciones.
- La fecha en que el mercado dejó de existir (1942 o 1947).
- Fotos con licencia establecida para `fuentes/imagenes/`.
- Regenerar y publicar los datos; la prueba a mano de una persona.
