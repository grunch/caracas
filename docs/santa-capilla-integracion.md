# San Mauricio y la Santa Capilla: etapas, solar e instalación (#253)

La esquina del [issue #253](https://github.com/grunch/caracas/issues/253), con el patrón de los templos de
[#259](templos-259-integracion.md) y de [La Candelaria](candelaria-integracion.md). Tarea T82.SC del plan.

## Qué había y de dónde sale el modelo

En `main` (`fab5b25`) el lugar tenía una sola iglesia, de 1889 en adelante: una nave de 50 × 22 m con la fachada
**al norte**, torre central de 28 m y aguja, tomada «a ojo» del recuadro del plano de 1936. En 1772 y 1843 había
solo la marca «San Mauricio» sobre casas genéricas, y que esa iglesia hubiera estado en este solar era un dato
general sin cotejar.

**No hay estudio en Miraflores.** El modelo se hizo acá sobre dos trabajos de Francisco Pérez Gallego, arquitecto
restaurador de la Universidad Central de Venezuela, que citan los documentos de archivo:

- **Ascenso**: *De la ermita de San Sebastián a la Santa Capilla, Caracas: la vocación religiosa de un lugar.
  1567-1900*, trabajo de ascenso, Facultad de Arquitectura y Urbanismo, UCV, enero de 2017
  ([Saber UCV](https://saber.ucv.ve/jspui/handle/10872/21681)). Páginas impresas.
- **Maestría**: *Santuario Eucarístico Santa Capilla: estudio y proyecto para su restauración y puesta en valor*,
  trabajo final de maestría en Conservación y Restauración de Monumentos, UCV, octubre de 2011, vol. I
  ([Saber UCV](https://saber.ucv.ve/jspui/handle/10872/24360)). Páginas impresas.

De ahí salen tres cosas que `main` tenía mal o no tenía:

1. **La fachada mira al oeste**, no al norte: Martí lo escribe de San Mauricio en 1772 y el plano de 1936 lo
   dibuja (la torre y el pórtico están sobre la calle del oeste).
2. **El edificio cambió tres veces después de 1883.** La capilla de 1883 era de una sola nave y sin torre; la
   torre con aguja es del ensanche de 1889–1891, y la nave central, de 1917–1924.
3. **San Mauricio estuvo en este mismo solar**: lo dicen el decreto de 1883 y los dos planos antiguos.

El **solar** sale del recuadro en blanco del plano de 1936 ([lectura](santa-capilla-georreferencia.json)). La
**distribución de cada etapa** es la «hipótesis gráfica» que Pérez Gallego dibuja para ella, puesta a escala sobre
ese solar: son reconstrucciones suyas a partir de los documentos y del edificio actual, **no levantamientos de
época**, y así se dice en el hito, en la ficha y acá.

## Ficha de evidencias por etapa

Certeza: **alta** = el documento lo dice o lo dibuja y se leyó; **media** = fuente secundaria que cita la
primaria (acá, casi todo: se leyó a Pérez Gallego, no los documentos que él cita); **baja** = interpretación.

| Etapa (hecho) | Qué dice la fuente | Fuente (fecha del documento) | Certeza | En el mapa |
|---|---|---|---|---|
| 1567–1734 | Ermita de San Sebastián, que después recibe la imagen de San Mauricio: una nave | Ascenso, pp. 301–303 (actas del Cabildo) | media | antes de la primera época con edificio |
| 1734–1740 | Se le añaden dos naves. En 1737 «no tenía más que una que se componía de 25 varas de largo y nueve de ancho» (20,9 × 7,5 m) | AGI, Santo Domingo, 728-A (12-2-1737), citado por Rosario Salazar y por Pérez Gallego, Ascenso, p. 94 | media | el ancho de la nave del medio |
| 1770 | Torre al suroeste, «que se fabricó estos últimos años» | Martí (1772), más abajo; la fecha de 1770 y el lugar son de Pérez Gallego, Ascenso, p. 97 | media | torre de tres cuerpos al suroeste |
| 1772 | «Esta plantada con tres puertas principales hacia el occidente, su figura es de tres naves que dividen dos órdenes de columnas y arcos de ladrillos y por cabeza de ellas tiene tres capillas… El techo, en lo que corresponde a la capilla mayor, es de bóveda, y en lo demás de tablas y tirantes, cubiertos de teja. Tiene al frente un hermoso frontispicio de ladrillo, y a un lado de él, una torre para las campanas con proporcionada elevación. Al costado, que mira al sur, tiene un corredor, y por cabeza de él, la sacristía, que es muy pequeña» | Visita del obispo Mariano Martí, en Ernesto Otaduy, *Iglesias de la antigua Caracas* (1974), pp. 20–21, citado por Pérez Gallego, Ascenso, p. 106 | media | **San Mauricio**: tres naves, fachada al oeste, media naranja, torre, sacristía |
| 1772 | Símbolo de iglesia en la esquina sureste del cruce | Plano de 1772, calce de 18,7 m RMS (leído) | alta para la presencia | el lugar |
| 1794 | «3 naves de tapias y rafas, cubierta de tejas… el presbiterio cubierto con media naranja de ladrillos» | Inventario de la cofradía de Nuestra Señora de Guía, citado en Ascenso, p. 108 | media | la media naranja del presbiterio |
| 1812 | Las torres de la capital «fueron destruidas por el terremoto de 1812, conservando su primer cuerpo la de San Mauricio, sobre la cual crecieron yerbas y arbustos»; también cayó «parte de las cubiertas» | Arístides Rojas, *Crónica de Caracas*, citado en Ascenso, p. 112; lo de las cubiertas es de Pérez Gallego | media | desde 1843, el primer cuerpo de la torre |
| 1843 | Letra I «San Mauricio»; recuadro en blanco de 22 × 26 m en la esquina | Plano de Jesurún (`specs/auditoria-1843/leyenda.json`), calce de 12,4 m RMS (leído) | alta para la presencia y el lugar | **San Mauricio** con la torre desmochada |
| 1812–1883 | Sigue en uso «entre ruinas parciales y espacios provisionales»; un dibujo de Carl Geldner de la década de 1860 muestra el primer cuerpo de la torre y la cúpula del presbiterio | Ascenso, pp. 109 y 113 | media | la media naranja sigue en 1843 |
| 26-3-1883 | Decreto de Guzmán Blanco: «El área destinada á la edificación de esta Capilla será la que ocupa el deteriorado templo de San Mauricio»; se usan los materiales de la demolición | Memoria del MOP de 1883, pp. 355–356, citada en Ascenso, p. 111, y transcrita en Maestría, p. 173 | media | San Mauricio muere antes de 1889 |
| 1883 | Proyecto de Juan Hurtado Manrique; obra de menos de cuatro meses, inaugurada en agosto. «Una sola nave de 7 metros de ancho, formada por tres tramos… y un presbiterio cuadrado, además de un pequeño cuarto lateral»; fachada con «cuádruple juego de contrafuertes y pináculos»; «24 metros de longitud total» | Leszek Zawisza, citado en Ascenso, p. 195; fechas en Maestría, p. 173 | media | **1889**: la capilla de una nave, con sus dos oratorios y el atrio |
| 1889 | Templo VIII «Santa Capilla»; el rótulo de la esquina dice «San Mauricio» | Plano de Mestre (leído) | alta | la época de la capilla de 1883 |
| 1889–1891 | Ensanche de Rojas Paúl, del mismo Hurtado Manrique: «le añadió otra» nave, al sur; capillas alineadas con la calle; torre campanario con aguja. Utilidad pública el 9-12-1889; inaugurado el 28-5-1891, «sin haber concluido la casa del capellán al Sur» | Ascenso, pp. 256, 277–279 y 304; Maestría, pp. 219–220 y 226 | media | **1911**: dos naves, pasadizo, torre con aguja |
| 1890 | Recibos de obra: «cornisa a 11 metros de altura», «muro de mampostería de ladrillo a 18 metros de altura», «montaje de la aguja» (26-4-1890) | Recibos del MOP en el AGN, citados en Ascenso, p. 284 | media | los 11 m de las naves |
| 29-10-1900 | «La Torre de la Santa Capilla se desplomó dividiéndose en tres trozos»; reabre antes del 7-9-1902 | *La Linterna Mágica* (30-10-1900) y monseñor Pacheco, citados en Maestría, p. 266 | media | — |
| 1910 | Se cambian «las cubiertas de madera, caña amarga y tejas» (17-6 a 8-7-1910) | Expediente del MOP, citado en Maestría, p. 267 | media | las naves van de teja |
| 1911 | Rótulo «Sta. Capilla» y un bloque edificado | Plano de Razetti (leído) | alta para la presencia | la época del ensanche |
| 1917–1924 | «Se componía solamente de las naves norte y sur unidas por un amplio pasadizo»; Luis B. Castillo hace la nave central, de cubierta horizontal, y el gran arco bajo la torre; muere en 1921; la obra «empezó a mediados del año de 1917, y terminó en el año de 1924» | Monseñor Manuel A. Pacheco (1958), citado en Maestría, p. 270; pp. 281–284 | media | **1936 y 1946**: la nave central y la torre de Castillo |
| 1919 | Foto: la torre «todavía conserva la imagen de la reconstrucción posterior al terremoto de 1900», con balaustrada y aguja | Maestría, p. 284 (imagen 66, fotógrafo desconocido) | media | la torre de 1911 va entera |
| 1926 | Basílica menor (5-8-1926) | Maestría, p. 286; IAM Venezuela | media | la ficha |
| 1936 | Recuadro en blanco «Iglesia Santa Capilla», de 28,7 × 43,4 m | Plano DCN (leído) | alta | **el solar** |
| 1946 | Recuadro con cruz, de unos 31 × 33 m | Plano DCN de 1946, calce de 2,1 m (leído) | alta para la presencia | sin cambio |
| 1952 | La avenida Urdaneta le quita la capilla del noroeste y el frente norte | Maestría, pp. 282 y 304 | media | **posterior al último mapa: no se dibuja** |

### Contradicciones y dudas

- **La inauguración de 1883.** [IAM Venezuela](https://iamvenezuela.org/2015/09/basilica-menor-de-santa-capilla/)
  dice diciembre; Pérez Gallego, con los documentos de la obra, agosto. No cambia el mapa.
- **«Década de 1910» o 1917–1924.** IAM fecha la reforma de Castillo en «la década de 1910» y habla de «dos naves
  adicionales»; Pérez Gallego documenta **una** nave, la central, de 1917 a 1924. Va lo segundo. El issue pedía
  resolver si la reforma estaba hecha en el corte de 1911: **no lo estaba**; en 1911 estaba el ensanche de 1891,
  con los techos recién cambiados (1910).
- **«Restos demolidos» o iglesia reciclada.** IAM y el decreto hablan de demoler San Mauricio; Pérez Gallego
  concluye que la capilla de 1883 reutilizó parte de la nave del medio (por eso sus arcos son de medio punto), y lo
  da como hipótesis a confirmar con arqueología. En el mapa no cambia nada: son dos hitos sucesivos.
- **Cuántos cuerpos tenía la torre.** Pérez Gallego la describe «de tres cuerpos», escribe que en 1812 se
  derrumbaron «tres cuerpos» y cita a Rojas, para quien quedó el primero: su alzado tiene cuatro niveles bajo la
  cupulita. Va de tres en 1772 y uno en 1843.
- **La altura de esa torre.** La hipótesis gráfica la dibuja de **43,2 m**, porque «competía en altura con la
  torre de la Catedral». Martí solo dice «con proporcionada elevación». **No se siguió**: va de 21 m más el remate,
  por debajo de la torre de la Catedral del mapa (26,5 m). Ninguna de las dos alturas tiene medida.
- **El estado en 1843.** Cayeron la torre y «parte de las cubiertas», y la iglesia siguió en uso a medio reparar
  hasta 1883. No se sabe qué techos faltaban en 1843: va techada, y la ficha lo dice.
- **La fecha del dibujo de Geldner**: 1863 en el texto de Pérez Gallego y 1866 en su pie de figura.
- **La torre rehecha.** Cayó en 1900 y en 1919 estaba otra vez en pie; no se halló cuándo se rehízo. En 1911 va en
  pie porque la capilla reabrió en 1902 y la foto de 1919 muestra la torre de antes de Castillo.
- **El fondo del templo en 1946.** El plano de 1946 dibuja un recuadro de unos 33 m de fondo; las naves del modelo
  ocupan 36,3 m. La diferencia, de 3 a 6 m, es mayor que el calce de ese plano (2,1 m) y queda sin explicar: el
  modelo sigue el solar de 1936 y las bandas de la hipótesis gráfica.
- **Citas de segunda mano.** Martí (por Otaduy), el documento de 1737 (por Rosario Salazar), Rojas, Zawisza, los
  recibos del MOP y Pacheco se conocen por Pérez Gallego; ninguno se cotejó. El hito y la ficha lo dicen.
- **Tradiciones.** La primera misa de Caracas en este lugar es tradición oral (IAM y Pérez Gallego lo dicen así):
  no entra en la ficha.

## Referencias visuales

Ninguna se incorpora al sitio ni al paquete de fotos: no se estableció la licencia de ninguna reproducción.

| Imagen | Fecha | Autor y procedencia | Licencia | Para qué se usó |
|---|---|---|---|---|
| Gráficas 1.3 a 1.5: San Mauricio, planta y fachadas | 2017 (hipótesis) | Pérez Gallego, Ascenso, pp. 115–117 | no establecida | Distribución de las naves, la torre y la sacristía; **no** las alturas |
| Gráficas 2.1 a 2.3: Santa Capilla, «primer tiempo» (1883–1889) | 2017 (hipótesis) | Ascenso, pp. 212–214 | no establecida | La capilla, los oratorios y el atrio |
| Gráficas 3.1 a 3.3: «segundo tiempo» (1889–1900) | 2017 (hipótesis) | Ascenso, pp. 277–279 | no establecida | Las bandas del solar, el pasadizo, la torre; la proporción de la torre |
| «Santa Capilla en 1883» | 1883 | Maestría, imagen 30; la tesis da su procedencia | no establecida | Confirmar la capilla exenta, con atrio, sin torre |
| Dibujo de la Plaza Mayor | 1863 o 1866 | Carl Geldner, en Ascenso, figura 1.27 | no establecida para la reproducción | La media naranja y el primer cuerpo de la torre después de 1812 |
| «La Santa Capilla en 1919» | 1919 | Fotógrafo desconocido, en Maestría, imagen 66 | no establecida | La torre rehecha tras 1900 |
| «La Santa Capilla… a fines de los 20» | hacia 1925 | A. Müller, taller fotográfico del MOP (Biblioteca Nacional), en Maestría, imagen 54 | no establecida | La torre de Castillo |
| Panorámica de Caracas (`fuentes/imagenes/1903-commons-panoramica-de-caracas`) | hacia 1903 | Commons, dominio público según su ficha | la de su ficha | No se usó. Su «aguja neogótica (¿Santa Capilla?)» sigue sin identificar: en 1903 la torre acababa de caer (1900) |

No se usó ninguna foto actual como prueba de una fachada antigua.

## Solar, reservas y R13

| | Medida |
|---|---|
| Solar del plano de 1936 | 28,7 × 43,4 m: 1.246 m² |
| San Mauricio: planta (colisión) | naves de 26 × 21,4 m, torre de 5,5 m y sacristía: 616 m² |
| San Mauricio: reserva (1772 y 1843) | 28,7 × 28,45 m: 817 m², sin las casas de las cofradías del sur |
| Santa Capilla: planta en 1889 | 286 m² (la capilla y sus dos oratorios) |
| Santa Capilla: planta en 1911 | 1.028 m² |
| Santa Capilla: planta en 1936 y 1946 | 1.134 m² |
| Santa Capilla: reserva (desde 1889) | todo el solar: 1.246 m² (en `main`, 22 × 50 m: 1.100 m²) |

Medido con `medirHitos` (`tools/hitos-manzanas.mjs`) sobre los informes `retiro-<año>` de los datos completos
(`/disco/dev/caracas-datos-sur`), fuera del repo:

| Épocas | Hito | Manzana | Manzana bajo el recinto | Recinto en la manzana | Clase | Decisión |
|---|---|---|---|---|---|---|
| 1772, 1843 | `san-mauricio` | `U1772-0081` (11.789 m²) | 6,6 % | 95,6 % | chico | se conserva |
| 1889 a 1946 | `santa-capilla` | `U1772-0081` | 10,3 % | 97,1 % | chico | se conserva |
| 1889 a 1946, en `main` | `santa-capilla` | `U1772-0081` | 8,9 % | 95,4 % | chico | se conserva |

Los dos son **chicos**: van dentro de su manzana, sin casas ni árboles encima, y no retiran nada. No se regeneró
`docs/manzanas-hitos.json`: sale de los informes de retiro de los datos, que este PR no regenera.

## Datos generados

Este PR **no regenera ni publica datos**. Con los datos publicados, las reservas actúan al cargar: en 1772 y 1843
esconden las casas de `U1772-0081` que pisan el templo. Desde 1889 la reserva nueva es casi la de antes (el
recuadro de `main` corría 7 m más al sur): queda una franja de suelo sin casas al sur del solar hasta que se
regeneren los datos.

Al regenerar (`npm run datos`), los pasos de manzanas y de retiro leen `hitosConPlanta()` y reparten las casas sin
pisar las reservas. `npm run datos:al-dia` avisa por `src/hitos/`.

## La marca, la ficha y el buscador

- **Marca**: sigue siendo una (`santa-capilla`: «San Mauricio» hasta 1843, «Santa Capilla» desde 1889), enlazada al
  hito. Se movió 15 m con el origen del hito: del medio del frente norte al pie de la fachada oeste.
- **Ficha**: un texto por etapa (1772, 1843, 1889, 1911, 1936). Cada uno dice a la vista lo que el dibujo no
  prueba, y las citas de segunda mano van atribuidas en el texto.
- **Buscador**: «San Mauricio» se encuentra como lugar. Donde hay dos hitos sucesivos en el mismo punto, la frase
  nombra el que está en pie en la época elegida («junto a la iglesia de San Mauricio» en 1772, «junto a la Santa
  Capilla» en 1889).

## Qué es interpretativo

- **Todas las alturas**, salvo los 11 m de las naves (un recibo de 1890, de segunda mano).
- **Todas las medidas de la planta** dentro del solar: la hipótesis gráfica puesta a escala.
- La torre de planta cuadrada (la real tenía los cuerpos altos octogonales), sin balaustrada, contrafuertes ni
  crestería; la torre de 1936 con las medidas de la de 1911.
- La fachada de San Mauricio (la de pilastras y frontón de la pieza del mapa, encalada: Martí dice «de ladrillo»)
  y su nave central más alta que las laterales.
- La casa del sur como un cuerpo bajo corrido, y el suelo vacío del sur del solar en 1889.
- Los colores: cal y teja en todas las épocas.

## Rendimiento

2.412 triángulos más (San Mauricio, 1.322; la Santa Capilla pasa de 756 a 1.846): 646.586 antes de 1946 y
1.125.959 en total, con La Candelaria ya en `main`. Los topes unitarios suben de 645.000 a 650.000 y de 1.125.000
a 1.130.000. La medición de carga y de cuadro, en [`mediciones/santa-capilla-253`](mediciones/santa-capilla-253/README.md).

## Capturas

`docs/capturas/santa-capilla-253/santa-capilla-<antes|despues>-<año>-<arriba|cerca>.webp`: `main` (`fab5b25`) y
esta rama, misma cámara, en las seis épocas, con los datos completos
(`CAPILLA_GPU=1 node tests/e2e/capturas-santa-capilla.mjs <url> <carpeta> <antes|despues>`).

## Pendiente

- Cotejar a Otaduy, a Martí, a Rojas, a Zawisza y los expedientes del MOP en sus ediciones: acá se citan por Pérez
  Gallego.
- Una medida de las alturas (un levantamiento del edificio actual serviría para las naves y la torre de 1924).
- La fecha de la reconstrucción de la torre después de 1900 y la forma de la casa del sur en cada época.
- Las casas del sur del solar en 1889 (la del capellán y otra) y las de las cofradías en 1772 y 1843.
- La diferencia de fondo con el plano de 1946.
- Fotos fechadas y con licencia de la fachada antes y después de 1917: las que reproduce Pérez Gallego no la
  tienen establecida.
- Regenerar y publicar los datos; la prueba a mano de una persona.
