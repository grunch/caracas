# Casa Natal del Libertador: etapas, solar e instalación (#247)

La casa de los Bolívar del [issue #247](https://github.com/grunch/caracas/issues/247), entre las esquinas de San
Jacinto y Traposos. Tarea T82.CN del plan.

## Qué había y cómo se hizo

En `main` (`b482621`) la casa era una marca sin hito: un nombre a unos 40 m al norte de su solar, sobre casas
genéricas. El [PR #230](https://github.com/grunch/caracas/pull/230) (#99) había corregido su cronología.

No hay estudio de esta casa en `grunch/miraflores`. Se trabajó con las fuentes:

- el **solar** mide lo que publica el Diccionario de Historia de Venezuela (22,40 × 60,50 m) y está puesto donde
  el plano de 1936 raya la «Casa Natal» ([lectura](casa-natal-georreferencia.json));
- la **fachada** de cada época sale del folleto de Manuel Landaeta Rosales (1912), que la describe y trae una
  lámina;
- la **distribución** (zaguán y dos patios, un solo nivel) es la del catálogo del IPC, que describe la casa
  restaurada;
- lo que ninguna fuente respalda **no se dibuja**: el piso alto anterior a 1812, los corredores, los interiores.

## Ficha de evidencias por etapa

Certeza: **alta** = el documento lo dice o lo dibuja; **media** = fuente secundaria, o inferido de dos que
coinciden; **baja** = interpretación.

| Etapa | Qué dice la fuente | Fuente (fecha del documento) | Certeza | En el mapa |
|---|---|---|---|---|
| 1578 | La cuadra está dividida en cuatro partes, cada una con la mención «casa» | Fuentes Carvallo, [DHV](https://bibliofep.fundacionempresaspolar.org/dhv/entradas/c/casa-natal-del-libertador/) (diccionario de 1988, 2.ª ed. 1997; leído en línea) | media: lo cuenta el DHV, el plano no se cotejó aquí | — (fuera de las seis épocas) |
| Siglo XVII | Tras el terremoto de 1641 se edifica la casa; primer dueño conocido, Francisco Marín de Narváez (m. 1673); pasa a los Bolívar por matrimonio de su hija | DHV. El [IPC](https://albaciudad.org/wp-content/uploads/2017/01/Libertador-Construido2.pdf), p. 46 (2004–2007): «inmueble colonial del siglo XVII» | media | — |
| 1759 | El padrón de Catedral anota, de San Jacinto a Traposos, la «Casa de don Vicente Bolívar», donde vive el gobernador Felipe Ramírez | Landaeta Rosales, [«La casa donde nació el Libertador en 1783»](https://archive.org/details/lacasadondenacie00land), 1912, p. 6, que transcribe el padrón (manuscrito de la Biblioteca Nacional) | alta para la propiedad; es transcripción de segunda mano | — |
| 1772 | Manzana edificada, sin rótulo para la casa | Plano de 1772 (`fuentes/mapas/1772-pares-agi-exato-mapa`), calce 18,7 m RMS | alta para la manzana, nula para la casa | casa de un piso con **portón y cuatro ventanas de reja de madera** |
| antes de 1812 | La casa «era de alto interiormente»; Juan Vicente Bolívar y Ponte (m. 1786) le hizo un piso alto | Landaeta, pp. 8–9; DHV | media: nadie dice dónde estaba el alto ni desde cuándo | **el piso alto no se dibuja** |
| 1783 | Nace Simón Bolívar «en la Sala grande hacia el Sur» | Landaeta, pp. 8–9 | media | la sala del sur lleva tres de las cuatro ventanas |
| 1806 | Los Bolívar venden la casa a Juan de la Madriz | Landaeta, pp. 8–9 (9 de junio, con el protocolo del escribano); DHV (19 de junio) | alta para el año | — |
| 1812 | El terremoto arruina el alto: «se le quitó y quedó de un solo piso». A las ventanas se les ponen rejas de hierro «después del terremoto» | Landaeta, pp. 8–9 y 11; DHV («se agrietan sus muros», restaurada sin la parte alta) | media | desde 1843, **sin las rejas de madera** (las de hierro no se dibujan) |
| 1843 | Manzana edificada; la leyenda no trae la casa | Plano de Jesurún (`specs/auditoria-1843/cotejo-leyenda.md`) | alta para la manzana | un piso, portón y cuatro ventanas |
| 1876 | Vicenta Plaza de Madriz la vende a Antonio Guzmán Blanco | Landaeta, p. 10; DHV | alta | — |
| 1883 | Néstor Hernández pinta la casa «con la forma que tenía entonces, es decir, las rejas de las cuatro ventanas de madera con balaustres torneados»; el Papel Periódico Ilustrado de Bogotá (n.º 53, 28-10-1883) publica una lámina con las rejas de hierro | Landaeta, p. 11 | alta para lo que dice Landaeta; el cuadro y la lámina de Bogotá no se consultaron | — |
| 1889 | Número 24, «Casa donde nació Bolívar», un recuadro sobre la calle | Plano de Mestre (`fuentes/mapas/1889-bnf-mestre`) | alta para el lugar | igual que en 1843 |
| después de 1877 | Compañía de Crédito y primer Banco Caracas; «más después se le quitaron las tres ventanas de la sala hacia el Sur y se le pusieron puertas para comercio»: almacenes, molino de maíz, colegio, ferretería | Landaeta, p. 11 | alta para el hecho, **sin fecha** | en 1911, **tres puertas en la sala del sur** |
| 1911 | La manzana, sin distinguir la casa | Plano de Razetti (`fuentes/mapas/1911-princeton-plano-de-caracas-razetti`) | alta para la manzana | fachada de comercio |
| 1912 | La Sociedad Patriótica la compra a los sucesores de Guzmán Blanco (14 de octubre) y la entrega a la Nación (28 de octubre). Dirección: «sur 1, N.º 22» | DHV; Landaeta, pp. 21–23 | alta | — |
| 1916–1921 | Decreto de reconstrucción del 16-10-1916; obras de Vicente Lecuna con Alejandro Chataing y Antonio Malaussena; inaugurada el 5-7-1921 | DHV; IPC, p. 46 | alta | — |
| 1930 | Patio cuadrado con corredores de pilares de madera, teja y pila de piedra | Revista Plus Ultra, febrero de 1930 (`fuentes/imagenes/1930-commons-patio-de-la-casa-natal`, dominio público) | alta | los corredores no se dibujan |
| 1936 | Bloque rayado «Casa Natal» con blancos adentro | Plano DCN de 1936 | alta | **forro de piedra clara y marco de piedra en el portón** |
| 1946 | Contorno propio dentro de la manzana, unos 3 m más ancho que el rayado de 1936 | Plano de 1946 (`fuentes/mapas/1950-archiveorg-plano-de-caracas-dcn`), calce 2,07 m RMS | alta | igual que en 1936 |
| hoy | Un solo nivel, planta rectangular, zaguán y dos patios (el central con las habitaciones, el posterior con el servicio); «su imagen formal actual responde a la apariencia que le fuera dada en la intervención de 1921», con «materiales opulentos como el mármol». Muros forrados de mármol que imita sillares y portada de piedra con el escudo | IPC, p. 46; [Guía CCS](https://guiaccs.com/en/obras/birthplace-of-libertador-simon-bolivar/) (González Viso, Vegas y Peña) | alta para la casa actual | de aquí salen el nivel único, los dos patios y el acabado desde 1936 |

### Contradicciones y dudas que siguen abiertas

- **Quién la construyó y cuándo.** El DHV y el IPC la dan por casa del siglo XVII, de los Marín de Narváez. Landaeta
  (1912) recoge la tradición familiar de que «la fabricó el Coronel Don Juan Vicente de Bolívar» y solo prueba
  que en 1759 era suya. La Guía CCS la fecha en 1643. No se resuelve aquí: en todas las versiones existe en 1772.
- **El piso alto.** Existió antes de 1812 según las dos fuentes, pero ninguna dice sobre qué parte de la casa
  estaba («interiormente», dice Landaeta) ni desde cuándo. La lámina de 1912 muestra un solo piso a la calle. Va
  de un piso en 1772 y la ficha lo dice.
- **El día de la venta de 1806**: 9 de junio (Landaeta, con el protocolo) o 19 de junio (DHV).
- **Cuándo se abrieron las puertas de comercio.** Entre la lámina de 1883 y el folleto de 1912. En 1889 se dibuja
  todavía con ventanas: es la última vista fechada que Landaeta cita, no una prueba.
- **La lámina del folleto** no trae pie de autor. Por el texto (p. 11) parece ser la del cuadro de 1883, que El
  Cojo Ilustrado reprodujo en su n.º 500 (15-10-1912); el folleto es de la misma empresa. Si es así, la fachada de
  1772 se apoya en una reconstrucción pintada cien años después.
- **El ancho del solar** en los planos: 21,9 m en 1936, 25 m en 1946; el DHV publica 22,40 m. Va el del DHV.
- **Los patios antes de 1916.** No se halló descripción de la casa por dentro anterior a la reconstrucción.

## Referencias visuales

| Imagen | Fecha | Autor y procedencia | Licencia | Uso |
|---|---|---|---|---|
| Lámina «La casa donde nació el Libertador», en Landaeta Rosales, lámina sin numerar antes del texto | publicada en 1912 | sin firma; Emp. El Cojo, Caracas; ejemplar de la Universidad de Carolina del Norte en [Internet Archive](https://archive.org/details/lacasadondenacie00land) | publicada en 1912: dominio público por antigüedad; Internet Archive no declara derechos. **No se incorporó al paquete de fotos**: queda enlazada | fachada de 1772 a 1889: un piso, alero de teja, tres ventanas voladas, portón y una ventana |
| [Patio de la Casa Natal de Bolívar, 1930](https://commons.wikimedia.org/wiki/File:Patio_de_la_Casa_Natal_de_Bol%C3%ADvar,_1930.png) | febrero de 1930 | revista Plus Ultra (Buenos Aires), vía Commons | dominio público; ya estaba en `fuentes/imagenes` | patio restaurado (1936) |
| [Caracas Casa Natal 1967](https://commons.wikimedia.org/wiki/File:Caracas_Casa_Natal_1967.jpg) | 1967 | Veronidae, Commons | CC BY-SA 3.0; solo consultada | fachada restaurada, 21 años después de la última época |
| [Fachada de la casa natal de Simón Bolívar](https://commons.wikimedia.org/wiki/File:Fachada_de_la_casa_natal_de_Sim%C3%B3n_Bol%C3%ADvar.jpg) | 24-11-2013 | Fhaidel Domínguez, Commons | CC BY-SA 3.0; solo consultada | forro de mármol, portada y rejas. Es una foto actual: **no prueba** la fachada de 1936 |

No se encontró en Commons ninguna fotografía de la fachada anterior a 1921. Faltan por consultar: el cuadro de
Néstor Hernández (1883), la lámina del Papel Periódico Ilustrado (1883), El Cojo Ilustrado n.º 500 (1912) y el
libro de Lecuna y Planchart, «Historia de la casa de Bolívar y anotaciones sobre su reedificación» (1924), que
debe traer el estado anterior a la obra.

## El solar y la reserva (R13)

- Origen en el medio de la fachada, (9262,6; 7168,2) px; el eje entra al solar hacia el oeste.
- **Reserva** (`suprime`, `sinArboles`): el rectángulo del solar, 22,4 × 60,5 m = 1.355 m². Va **sin** `solarCompleto`:
  la casa está entre medianeras y, con él, se escondía toda casa vecina que tocara el solar y la Casa Natal quedaba
  sola en un claro. Así solo se esconde la casa que pisa el solar de verdad (25 % de la más chica de las dos huellas).
- **Colisión** (`planta`): siete crujías; los dos patios quedan transitables.
- No pisa la calle ni la plaza de San Jacinto (El Venezolano), que está del otro lado de la calle.

Medido con `tools/hitos-manzanas.mjs` (`medirHitos`) sobre los informes de retiro de los datos completos
(`27abd10`), en las seis épocas, con el mismo resultado en todas:

| Manzana | Área | Recinto | Recinto dentro de la manzana | Manzana bajo el recinto | Clase | Decisión |
|---|---:|---:|---:|---:|---|---|
| `V1772-36901-0-0` | 11.572 m² | 1.355 m² | 84,6 % | 9,9 % | **chico** | se conserva |

No retira ninguna manzana y no toca ninguna otra. El 15 % que queda fuera es el frente: **la casa sale 8,6 m de la
manzana del modelo hacia la calle**. No es la casa la que está corrida, es el borde de la manzana: en el mosaico
de 1936 la costura entre las dos hojas tapa una franja de unos 23 m (de x ≈ 9243 a 9290), con la calle y el frente
de esta cuadra adentro, y la manzana del modelo termina donde empieza la costura (x ≈ 9245 a la altura de la casa).
Los planos de 1889, 1911 y 1946 coinciden en poner la línea de fachada entre x ≈ 9263 y 9270, y el fondo del solar
del DHV (60,5 m) cae justo donde termina el rayado de 1936 solo si la fachada está ahí. Por eso la calle del modelo
mide en este tramo unos 25 m en vez de los 12 o 13 de los planos, y las casas vecinas quedan 8,6 m atrás de la
Casa Natal. Corregirlo es asunto del generador de manzanas (el borde bajo la costura), no de este hito; queda
anotado como pendiente.

## El modelo

No lleva constructor propio: `src/hitos/datos/casa-natal.js` lo arma con las partes `cuerpo` y `ventanas` que ya
existían (310 triángulos con las cuatro fachadas). Dos piezas:

- `cuerpos`: las siete crujías de un piso con tejado de teja, iguales en las seis épocas;
- `fachada`, una por fase:

| Fase | Épocas | Qué lleva | De dónde |
|---|---|---|---|
| `colonial` | 1772 | portón y cuatro ventanas voladas con reja de madera | Landaeta, p. 11, y su lámina |
| `republicana` | 1843, 1889 | las mismas ventanas, sin las rejas de madera; las de hierro no se dibujan | Landaeta, p. 11 |
| `comercio` | 1911 | tres puertas en la sala del sur, portón y la ventana del norte | Landaeta, p. 11 |
| `restaurada` | 1936, 1946 | forro liso de piedra clara, marco de piedra en el portón y cuatro ventanas; el escudo y las rejas no se dibujan | IPC, Guía CCS; el número de ventanas, de fotos de 1967 y 2013 |

Interpretativo, y dicho en `verificar` y en la ficha: todas las alturas, el tamaño de los patios, el ancho y el
lugar exacto de cada vano, y que el volumen no cambie entre épocas.

## Qué queda de #247

- El piso alto anterior a 1812: falta una fuente que diga dónde estaba.
- Una vista fechada de la fachada entre 1883 y 1916, y de la fachada recién restaurada.
- La casa por dentro antes de 1916 (Lecuna y Planchart, 1924).
- Regenerar y publicar los datos: la reserva cambia el reparto de casas de la manzana.
- El borde este de la manzana `V1772-36901-0-0`, cortado por la costura del mosaico de 1936: la calle sale el
  doble de ancha y las casas vecinas, 8,6 m atrás de la Casa Natal.
- El entorno posterior a 1946 (Museo Bolivariano, Sociedad Bolivariana) queda fuera de las épocas del mapa.
