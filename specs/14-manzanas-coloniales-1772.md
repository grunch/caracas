# T82.1 / T82.2 · Manzanas coloniales procedurales en 1772

## Decisión y alcance

Se integra el **planificador aprobado en el estudio `../miraflores`**, perfil 4, en el formato nativo de casas de Caracas. El generador recibe cantidad de casas, semilla y dimensiones; sus solares se llevan por interpolación bilineal a las cuatro esquinas reales de cada manzana. La adaptación genera `marcos` y `alas`, no cientos de mallas de hitos: conserva los workers, las baldosas, las fachadas procedurales, el relieve por casa, las colisiones, los modos tinta/color y la vida por época.

La instrucción del responsable para esta integración es **más casas cerca de la Plaza Mayor y menos lejos**, con variación entre cuadras. Sustituye, para este ensayo, la preferencia anterior de grandes solares céntricos. No se presenta como un censo histórico: R6 sigue pendiente de investigación. La regla interpolada es de aproximadamente 32 casas junto a la plaza a 8 a partir de 1.400 m, con una variación determinista de ±2. Los valores son decisiones de modelado. En el entorno inmediato de Plaza Mayor (centros de manzana a no más de 200 m), se aplican las dos reducciones sucesivas del 30 % y otra del 40 % solicitadas, redondeadas a casas enteras en cada paso. Afecta a tres manzanas procedurales: 29 → 20 → 14 → 8, 29 → 20 → 14 → 8 y 30 → 21 → 15 → 9 casas. Esta excepción puede dejar menos casas que en la siguiente corona. La semilla utiliza el ID de la unidad del plano, no su posición en una lista.

La ampliación solicitada sustituye **todas las viviendas genéricas visibles en 1772**: 253 unidades de generación, 3.167 casas nuevas y 5.083 árboles. Hay 86 contornos utilizables en la red de referencia y 167 agrupaciones inferidas de las parcelas visibles restantes. Estas agrupaciones son unidades geométricas de trabajo, no un nuevo inventario histórico de manzanas. No queda ninguna vivienda genérica del generador anterior activa en 1772. Las otras cinco épocas conservan sus datos.

Las unidades parciales y pendientes con contorno utilizable también se regeneran, por instrucción expresa del responsable. En el resto se agrupan parcelas contiguas, se cierran juntas de hasta 1 m y se conserva el perímetro cóncavo; no se usa la caja rectangular como lindero ni se añaden manzanas en terrenos sin viviendas. La Plaza Mayor se excluye. Las áreas inferidas se identifican como tales en el informe; no pasan a tener aprobación histórica. R1–R12 siguen pendientes de su auditoría general.

## Geometría y fuentes

- Las cuatro esquinas vienen de los cruces identificados de `tools/geo/referencias/1772-red.json`. Son ejes de calle; se retraen 3 m como en `RETIRO_REFERENCIA_M` de `tools/geo/vectorizar.py`. Es un ancho inferido ya usado por el proyecto, no una medición histórica.
- Se conservan sus ángulos y lados desiguales, sin imponer una cuadrícula de cuadrados.
- El plan se calcula en dimensiones normalizadas de 60–200 m y se transforma al contorno real. Los perímetros irregulares se recortan con Shapely; se conserva el número real de vértices al empaquetar las huellas.
- Se usan casas en L, U y patio cerrado; el ancho de crujía aumenta con el tamaño del solar. Los tejados se adaptan a `ALA` y al alzado nativo. La esquina utiliza el inglete de crujías de igual ancho del renderizador de Caracas, y los árboles se empaquetan en el sistema nativo de instancias. Los anexos centrales del visor de estudio no se convierten en nuevas viviendas ni se copian como hitos: el centro queda de corrales y solares.
- Un piso salvo algunos altos en esquinas cercanas a la plaza: pauta visual existente de `fuentes/imagenes/README.md`, grabado [View of Caracas, 1812](https://commons.wikimedia.org/wiki/File:View_of_Caracas,_1812.jpg). La procedencia y derechos dudosos están registrados en su ficha; no se publica esa imagen.
- Referencia cartográfica: `fuentes/mapas/1772-pares-agi-exato-mapa/ficha.json`, censo y correspondencias de `specs/auditoria-1772/`. Las capturas satelitales aportadas para el prototipo son referencias internas; no se copian al sitio ni se atribuye su apariencia a Caracas en 1772.

## Épocas y edificios existentes

Solo se sustituye el intervalo `[1,2)` (1772 hasta antes de 1843). Una casa original que continúa en otra época conserva su huella, semilla, historia y alas allí. Cuando su vida abarca ambos lados del intervalo, se divide sin perder ninguno. Se retira únicamente el intervalo de vida de 1772 de todas las viviendas anteriores, dividiendo su vida cuando corresponde para conservar las otras épocas. La integración completa no omite cuadras porque una parcela antigua cruce el lindero.

Los hitos mantienen sus anclas reales y sus vidas: no se coloca Miraflores en 1772 ni se reubica un edificio con el selector del prototipo. Se usan sus polígonos `suprime` o, si están vacíos, `planta`, incluyendo patios. Se conserva el mayor solar restante de cada vivienda con frente a la calle original; sus alas se redimensionan completas para evitar tejados cortados. El espacio posterior queda solar. Se descartan los lotes menores de 4 m de frente u 8 m de fondo y se comprueba que ninguna huella invade la reserva. La cantidad pedida es previa a reservar edificios; la cantidad efectiva consta en el informe. El contacto permite llegar al lindero de la reserva sin deformar el edificio.

| Unidad nueva | Edificio conservado | Casas efectivas |
|---|---|---:|
| U1772-0067 | Altagracia | 26 |
| U1772-0094 | Catedral y Palacio Arzobispal | 8 |
| U1772-0202 | San Francisco | 23 |
| U1772-0203 | Convento de las Concepciones, sitio del futuro Capitolio | 0 |
| U1772-0204 | Ayuntamiento y Real Cárcel, actual Casa Amarilla | 7 |

En U1772-0203 la reserva del convento ocupa el espacio disponible: se conserva el edificio y no se introducen viviendas encima.

Los árboles fuera de 1772 conservan exactamente sus posiciones, radios y condición silvestre. El paso de árboles reconstruye primero la base con los índices originales y luego sustituye únicamente los árboles de 1772 en las cuadras integradas. Así la reducción de casas no vuelve a sortear los patios de 1843–1936.

## Reproducir

El pipeline añade `manzanas-1772` después de `estilos`, y `empacar` lee `ciudad-manzanas.json`. `arboles` recibe `--manzanas-1772`. No se versionan los binarios ni el JSON grande generado.

Con las salidas previas disponibles:

```sh
node tools/manzanas-1772.mjs fuentes/derivados/epocas/ciudad-estilos.json fuentes/derivados/epocas/ciudad-manzanas.json
node tools/empacar-ciudad.mjs fuentes/derivados/epocas/ciudad-manzanas.json
node tools/arboles.mjs fuentes/derivados/1936/segmentacion/mosaico/arboles.json fuentes/derivados/1936/mosaico.json fuentes/derivados/1936/segmentacion/mosaico/jardines.json fuentes/derivados/1936/segmentacion/mosaico/clases-costura.png --manzanas-1772
npm run dev -- --port 5181
```

El pipeline completo sigue siendo `npm run datos`; puede rehacer dependencias anteriores si sus firmas cambiaron. El informe está en `fuentes/derivados/epocas/manzanas-1772-informe.json`, con semilla, coordenadas, distancia, cantidad y motivos de exclusión por unidad. Para cambiar la densidad se modifica `cantidadPorDistancia` y se regenera, no se editan casas a mano.

## Comprobación

Tests de selección, densidad, reproducibilidad, inmutabilidad, vida dividida, árboles por época, contención de solares oblicuos y extrusión nativa. `tools/auditar-manzanas-1772.mjs <datos-antes> <datos-después> <informe.json>` compara las seis épocas incluyendo firmas de las casas visibles y árboles. Sale con error si cambia una época distinta de 1772.

Capturas: `node tests/e2e/capturas-manzanas.mjs <url> <carpeta>` espera casas y árboles, usa cámaras fijas y recorre las cinco fechas disponibles en la interfaz. 1578 se verifica en datos: la interfaz no permite elegirla. El verificador general `tools/geo/reglas_mapa.py` todavía no existe en la base de esta rama; estas comprobaciones no se presentan como su sustituto ni como cierre de todas las puertas.

La prueba automática de navegador no sustituye la revisión visual de una persona exigida por AGENTS.md. La publicación de datos y el despliegue quedan pendientes de esa revisión.

## Colores del estudio

La adaptación conserva ahora el par exacto de colores de cada casa del perfil 4 de Miraflores. La parte opcional `paletas` del paquete contiene un byte por casa (0: material anterior; 1–36: combinación muro/teja). El byte alto de `aInfo.z` transporta esa selección a la GPU; el bajo mantiene el estilo. No se agregan atributos ni draw calls. Los paquetes anteriores, el suelo y los hitos conservan la paleta cero.

Los colores hexadecimales se convierten de sRGB a lineal como en el prototipo. Las casas nuevas usan su luz hemisférica cálida, intensidad solar y exposición ACES 1,05; los tejados conservan una variación leve sin la pátina gris del render anterior. Se mantiene la oclusión de sombras del mapa y el modo tinta. Es una adaptación de la apariencia del estudio al render nativo, no una reproducción pixel a pixel de su material Standard: la geometría, el detalle procedural y el acabado de contorno del mapa siguen siendo propios de Caracas.

### Validación anterior: 43 unidades (antes de la ampliación completa)

- 43 manzanas, 913 casas nuevas. Las tres cuadras procedurales originales de la primera corona: 8, 8 y 9 casas tras las tres reducciones sucesivas.
- 106 archivos / 1.707 tests unitarios aprobados; 996 tests de geoprocesamiento aprobados.
- Capturas finales en las cinco épocas sin errores de página. Comparación de píxeles de las vistas centrales: 1843, 1889 y 1936 son idénticas a las capturas de `main`; en 1911 solo cambia un nivel del canal azul en un píxel de 1.152.000. La vista de 1772 cambia como corresponde.
- Regresión de paquetes aprobada: ninguna casa, árbol ni paleta cambia fuera de 1772.
- Build aprobado; JavaScript inicial 308,3 KB / 330 KB, workers 139,7 KB / 150 KB.
- Dos fallos de navegador en `hitos.spec.js` reproducidos también contra `main` 858c239 con la misma GPU: la prueba marcada como fallo conocido T41b pasa inesperadamente, y la lectura de color de la ciudad acostada no satisface el umbral. No se modificaron esas pruebas para ocultarlos.
- Revisión visual humana y publicación de datos pendientes; el PR se abre como borrador.

Suite Playwright completa de la entrega anterior, con GPU y dos workers: **86 aprobados, 1 omitido, 2 fallidos**, 5,1 min. Ambos fallos se reprodujeron contra `main`; no se presenta como una suite verde.

## Reparto junto a Plaza Mayor

| Unidad | Distancia al centro | Casas iniciales | Tras primer −30 % | Tras segundo −30 % | Tras −40 % |
|---|---:|---:|---:|---:|---:|
| U1772-0080 | 117 m | 29 | 20 | 14 | 8 |
| U1772-0205 | 166 m | 29 | 20 | 14 | 8 |
| U1772-0095 | 167 m | 30 | 21 | 15 | 9 |

No se publican binarios. La generación específica, empaquetado y árboles finalizaron; el pipeline integral `npm run datos -- --desde manzanas-1772` terminó interrumpido con código 143 durante `epocas`, tras regenerar `calles-nuevas` y `vectorizar`. Queda pendiente repetirlo completo. La auditoría final confirma que los únicos datos públicos cambiados son las casas y árboles de 1772.

## Rendimiento de la entrega anterior (43 unidades)

| Medición | main tras #210 | Rama |
|---|---:|---:|
| Casas listas | 6.184 ms | 6.292 ms |
| Tarea más larga | 433 ms | 408 ms |
| Transferencia inicial | 9.727.880 B | 9.736.002 B |
| Heap observado | 242 MB | 242 MB |
| Triángulos del centro | 4.352.947 | 4.342.983 |
| Mediana por cuadro | 8,5 ms | 8,2 ms |

La carga varía +108 ms y la transferencia +8.122 B al incorporar cinco cuadras. Heap y tiempo por cuadro están dentro de presupuesto. Los presupuestos de carga, tarea larga, transferencia y triángulos ya excedidos en main siguen pendientes. Las mediciones no permiten afirmar una mejora estable de tiempos.

Tras añadir las reservas: 10 tests focalizados de manzanas aprobados, suite unitaria completa 1.707/1.707 y 5/5 E2E de hitos. Las capturas de las cinco épocas terminaron sin errores. La suite integral E2E de 89 pruebas y los 996 tests Python corresponden a la validación anterior; no se repitieron íntegramente para este cambio solo de generación JavaScript.


## Cobertura completa y vegetación variable

`tools/manzanas-completas.mjs` coordina el planificador existente y `tools/geo/manzanas_completas.py`. Requiere el entorno Python del proyecto con Shapely (ya incluido en sus dependencias); respeta `PY` cuando está definido. El selector ya no exige que una unidad esté aprobada para sustituir el tejido visible solicitado.

La densidad de árboles depende del área y de una semilla estable por unidad: **mínimo efectivo 1, máximo 60**, con abundancia distinta entre cuadras. Los candidatos están dentro de patios, corrales o espacios libres; se restan los tejados de las casas y las cubiertas reales de los hitos activos. Sus copas deben caber, no solo el tronco. Posición y radio se cuantizan antes de comprobarlos, para que el paquete binario conserve la contención. Tres parcelas muy estrechas ceden una vivienda a un corral; todas conservan al menos una casa. La cuadra del Convento de las Concepciones conserva únicamente su edificio histórico y recibe árboles en los espacios libres.

Comprobación con datos completos: 253/253 unidades con árboles; los 5.083 árboles previstos están en `arboles.bin`; cero viviendas con paleta antigua activas en 1772. La auditoría contra la entrega anterior confirma igualdad de huellas, marcos, alas, estilos, paletas y árboles en 1578, 1843, 1889, 1911 y 1936. La cantidad de viviendas visibles de 1772 pasa de 5.414 a 3.167. Esto es una decisión visual solicitada, no una estimación histórica de población.

Los informes resumidos actuales son `reglas/manzanas-1772/cobertura-completa.json` y `comparacion-todas-epocas.json`. El informe detallado regenerable sigue en `fuentes/derivados/epocas/manzanas-1772-informe.json`; `unidadesSinContornoUsable` enumera referencias que no aportaron un cuadrilátero, no manzanas visibles dejadas con el generador anterior.

### Validación de la cobertura completa

- Vitest: **106 archivos, 1.710 tests aprobados**. Tras el ajuste del inventario de dependencias, 38 tests focalizados de datos y manzanas aprobados.
- Python: **999 tests aprobados**, incluidos contornos sin referencia, distribución reproducible con árboles en todas las unidades y apertura de un corral cuando los tejados no dejan espacio.
- Playwright completo con GPU: **86 aprobados, 1 omitido y 2 fallidos (5,1 min)**. Los mismos dos fallos de `hitos.spec.js:96` y `:117` ya reproducidos en main: el test marcado como fallo conocido T41b pasa inesperadamente y el umbral de color de la ciudad acostada no se satisface. No se modificaron para ocultarlos.
- Build aprobado. Regeneración completa repetida: SHA-256 idéntico de `ciudad-manzanas.json`.
- Los 5.083 árboles nuevos están presentes en el binario final; ninguna unidad queda sin árboles. Auditoría de las seis épocas aprobada (solo cambia 1772).
- Pendientes la revisión visual humana, las puertas generales R1–R12 y la publicación de datos. PR #211 permanece como borrador.
- Capturas finales de centro y afueras en las cinco épocas disponibles: completadas sin errores de página. El primer intento se interrumpió al cerrarse Chromium mientras había otras pruebas abiertas; la repetición aislada terminó correctamente.
- Comprobación espacial sobre el informe completo: **0 contornos superpuestos por encima de 0,1 m² y 0 copas fuera de su unidad**.


### Rendimiento de la cobertura completa

Medición con GPU RTX 2060, build de producción y datos completos; base main tras #210 frente a la rama con toda la cobertura:

| Medición | Base | Rama |
|---|---:|---:|
| Casas listas | 6.279 ms | 5.773 ms |
| Tarea más larga | 403 ms | 416 ms |
| Transferencia inicial | 9.727.880 B | 9.991.878 B |
| Heap observado | 257 MB | 215 MB |
| Triángulos del centro | 4.352.947 | 4.872.834 |
| Mediana por cuadro | 7,7 ms | 7,6 ms |

El arbolado adicional y la cobertura completa aumentan la transferencia 263.998 B (+2,7 %) y los triángulos del centro 519.887 (+11,9 %). El tiempo por cuadro observado permanece equivalente y el heap baja; una sola corrida por variante no demuestra una mejora estable. Los presupuestos de carga, tarea larga, transferencia y triángulos ya excedidos en la base siguen sin cerrarse. La rama sí cumple heap y tiempo por cuadro. Informes completos: `specs/reglas/manzanas-1772/rendimiento-todas-{base,final}.json`.
