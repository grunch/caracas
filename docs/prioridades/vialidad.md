# Vialidad: hechos comprobados, cobertura y trabajo pendiente

Seguimiento de #269, #272, #277 y #278. Revisión del 26-11-2026, main bc51344.
No es un inventario de geometrías ya implementadas: las tablas separan historia de código.

## Estado real del sistema

- `src/main.js` carga el campo de calles de **1772**. No hay seis redes temporales completas.
- `tools/geo/calles-historicas.json` conserva **11 trazados recuperados** que OSM no basta para reconstruir.
- `tools/geo/calles_nuevas.py` compara 1772/1936; no establece por sí solo las fechas de 1843, 1889, 1911 y 1946.
- Los rótulos actuales de `src/calles.js` se dibujan con opacidad `uHoy.value`. Esa separación **ya existía**.
- La separación de rótulos no prueba que ninguna geometría moderna haya influido en vectorizaciones antiguas.

## Avenidas posteriores

| Eje moderno | Fase verificada | Tratamiento hasta 1946 |
|---|---|---|
| Urdaneta | 1953 [FAC](https://fundaayc.com/2013/09/26/1953-inauguracion-de-la-avenida-urdaneta/) | Mantener calles y solares preexistentes; enlazar Majestic #103 |
| Fuerzas Armadas | 1956 [FAC](https://fundaayc.com/2013/11/10/1956%E2%80%A2-avenida-fuerzas-armadas/) | Conservar eje Norte–Sur 7 de su plano, sin ancho moderno |
| Libertador | Obras desde 1957, apertura 1965 [FAC](https://fundaayc.com/2026/09/15/1965-inauguracion-de-la-avenida-libertador/) | No copiar doble nivel ni enlaces actuales |
| Norte–Sur 6 / Baralt | Ensanche 1951–1953; nombre Baralt 1961; conexiones ampliadas en 1968/1973 [FAC](https://fundaayc.com/2023/04/02/sabia-usted-98/) | La calle anterior sí existe; conservar ancho, nombre y terminación de cada plano |
| Andrés Bello, México, Lecuna | Cronología por segmentos todavía no verificada aquí | No asignarles automáticamente la fecha de otra avenida |

## Autopistas y conexiones

| Infraestructura | Fase documentada | Límite |
|---|---|---|
| Caracas–La Guaira | Apertura 1953 [FAC](https://fundaayc.com/2013/10/26/1953%E2%80%A2-se-inaugura-la-autopista-caracas-la-guaira/) | No confundir con carretera vieja ni camino colonial; gran parte fuera del encuadre |
| Autopista del Este | Etapas 1953, 1955, 1956 [síntesis FAC](https://fundaayc.com/tag/avenida-boyaca/) | El nombre contemporáneo no fecha cada tramo o distribuidor |
| Valle–Coche | Referencia a 1955 en la misma síntesis | Requiere límites de etapa y estructuras; no autopista en 1946 |
| Boyacá / Cota Mil | Aperturas por tramos; referencia a 1971 y enlace Baralt en 1973 [FAC](https://fundaayc.com/2014/10/21/1973-distribuidor-av-baralt-de-la-cota-mil/) | No atribuir 1971 a todo el trazado actual |

Las páginas se citan como referencias documentales; fotografías no redistribuidas.
No se añadieron épocas posteriores ni un sistema vial actual tridimensional.

## Puentes del Guaire

| Cruce | Cronología de referencia | Qué falta antes de modelar |
|---|---|---|
| Hierro / Regeneración | 1875 | Separar estructura original y sustituciones; actual marca `(9430,9440)` no mide el tablero |
| Constitución / Sucre | Constitución hacia 1880–1882, reconstrucción Sucre 1895 | Contrastar continuidad exacta de estribos y nombres en 1889/1911; marca actual `(9710,9430)` nace en 1936 |
| Paraíso | Fuentes secundarias oscilan entre c.1890 y 1895 | Resolver fecha exacta, ubicación y sustituciones; ambas fechas permiten presencia en 1911, no dimensiones |
| Dolores | Montado en 1897; pilas de 1916; el plano de marzo de 1936 aún lo dibuja; «Puente Soublette» en 1946 | Marca, ficha y calce en [`puentes-guaire-cruces.md`](../puentes-guaire-cruces.md). Falta decidir las cabezas y fechar el reemplazo |
| Restaurador | 1905; reparado en 1932; rotulado en 1936 y 1946 | Marca, ficha y calce hechos. Faltan apoyos, cota de tablero y la estructura de 1946 |
| 19 de Diciembre | 1910; «9 de Diciembre» en los planos de 1936 y 1946 | Marca, ficha y eje hechos. Cabezas sin medir |
| Ayacucho | 1924 | Marca, ficha y eje hechos. Cabezas y luces sin medir; separar etapa inicial de reconstrucciones |
| Bolívar / Los Leones | 1933 | Verificar identidad, estructura y accesos históricos |

Fuentes: [síntesis FAC](https://fundaayc.com/2023/04/02/sabia-usted-98/) y
[referencias al estudio de Mónica Silva Contreras, 2004](https://fundaayc.com/tag/las-mercedes/page/2/).
Las discrepancias no se resuelven promediando fechas. No se cambió todavía el ancla de Sucre
ni se copió un puente actual sobre una marca antigua.

## Contrato para completar #269

Cada segmento tendrá identificador estable, geometría en coordenadas del proyecto, sistema
de referencia explícito, ancho medido y **etapas**. Cada etapa conserva inicio/fin conocido,
nombre, fuente, recorte del plano, fecha del documento, fecha del hecho y certeza.
`desconocido` no equivale a `ausente`; un proyecto no equivale a obra ejecutada.

Orden de ejecución pendiente:

1. Digitalizar las seis redes desde sus propios planos; conservar los 11 trazados curados
   con su procedencia sin inventar fechas intermedias.
2. Separar en cada cruce las calles, los puentes y sus accesos; medir anchos e incertidumbre.
3. Comparar redes y manzanas: ningún eje moderno borra automáticamente lotes antiguos.
4. Generar campos por época y selector temporal, manteniendo el comportamiento si faltan datos.
5. Probar presencia, ausencia y continuidad, transición entre épocas y modo Hoy; publicar datos.

Este documento prepara y corrige el inventario; **no completa** #269 ni los modelos de #272.
Los controles existentes de Hoy tampoco bastan para cerrar #277/#278: falta la auditoría
geométrica de los segmentos contra las seis redes.
