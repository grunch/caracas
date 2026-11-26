# Caracas de 1936 y expansión de 1946 — issue #103

## Qué es cierto y qué cambia

- Hotel Majestic: inaugurado el 30 de diciembre de 1930, demolido en 1949. Corresponde a 1936 y 1946. Faltaban marca y ficha en main `bdd418a`; se agregan.
- San Bernardino: la empresa urbanizadora se constituye en 1939. No corresponde representar la urbanización en 1936. El plano de 1946 ya la rotula y dibuja sus avenidas y viviendas; se agrega marca de sector desde 1946.
- Avenida Urdaneta: inaugurada el 29 de noviembre de 1953. No se agrega en 1936 ni 1946. La calle anterior no equivale a la avenida ensanchada.
- El Paraíso: marca y ficha desde 1911 ya implementadas; las calles y casas están en el tejido derivado de los planos. Se añade una precisión en la ficha de 1936. Esto no equivale a modelos individualizados de cada quinta.

## Fuentes contrastadas

1. [FAC, inauguración Majestic](https://fundaayc.com/2013/09/14/1930-inauguracion-del-hotel-majestic/) y [demolición](https://fundaayc.com/2013/11/04/1949%E2%80%A2-demolicion-del-hotel-majestic/). Se usa solo el año de demolición porque otras crónicas difieren en el día.
2. [FAC, Hoteles Nacionales](https://fundaayc.com/2019/11/17/hoteles-nacionales-2/): frente al Teatro Municipal/plaza Monagas, adaptación de edificios previos; medidas del terreno, no levantamiento del edificio entero.
3. [FAC, empresa San Bernardino en 1939](https://fundaayc.com/2016/11/04/1939-constitucion-de-la-empresa-que-construira-san-bernardino/).
4. [FAC, avenida Urdaneta en 1953](https://fundaayc.com/2013/09/26/1953-inauguracion-de-la-avenida-urdaneta/).
5. [Willem van de Poll, 1948, Nationaal Archief](https://commons.wikimedia.org/wiki/File:Stadsgezicht_met_Hotel_Majestica_in_Caracas_in_Venezuela,_Bestanddeelnr_252-8437.jpg), CC0 verificado en ficha local. Se inspeccionó la fachada desde el pórtico del teatro: cinco niveles, balcones, toldos y torre cupulada. La foto de 1948 no se presenta como foto de 1936 ni 1946.
6. Plano DCN de 1936: https://archive.org/details/WCWdb_18053. Plano basado en fotos de 1946: `fuentes/mapas/1950-archiveorg-plano-de-caracas-dcn/ficha.json` (el año del identificador del catálogo no es la época representada).

Artículos FAC: derechos no verificados, solo enlaces y paráfrasis. No se copian imágenes modernas ni se modifica la atribución de la foto archivística.

## Posiciones y límites

San Bernardino: recorte original de 1946 [8400,2200,10800,4500], nombre y avenidas legibles. Punto original (9300,3260), transformado con `mapa_1946.calibrar().a_1936` a (12069.27,5370.76), redondeado a (12069,5371). Es referencia del sector, no un edificio ni límite administrativo.

Majestic: se cotejaron el sector del teatro en ambos mapas y la foto de 1948. Los planos no rotulan el hotel ni distinguen inequívocamente su solar de las construcciones anexas. Se deja la marca aproximada en (8260,7520), frente al teatro, explicitando esa incertidumbre en nota y ficha. **La reconstrucción arquitectónica queda pendiente de resolver ese emplazamiento y la composición de los dos edificios adaptados.** No se inventa una planta definitiva a partir de una sola fachada ni se suprimen casas por una posición incierta.

R9: hito Majestic pendiente; marcas de sector sin geometría propia. R11: vidas verificadas. Las reglas geométricas mantienen sus entradas en las siete épocas; no se declara cerrada una auditoría arquitectónica. El trabajo pendiente de modelado continúa en T41; este PR implementa marcas/fichas y corrige el alcance histórico, sin cerrar por completo #103.
