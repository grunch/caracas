# T82.1 · Manzanas coloniales procedurales en 1772

## Decisión y alcance

Se integra el **planificador aprobado en el estudio `../miraflores`**, perfil 4, en el formato nativo de casas de Caracas. El generador recibe cantidad de casas, semilla y dimensiones; sus solares se llevan por interpolación bilineal a las cuatro esquinas reales de cada manzana. La adaptación genera `marcos` y `alas`, no cientos de mallas de hitos: conserva los workers, las baldosas, las fachadas procedurales, el relieve por casa, las colisiones, los modos tinta/color y la vida por época.

La instrucción del responsable para esta integración es **más casas cerca de la Plaza Mayor y menos lejos**, con variación entre cuadras. Sustituye, para este ensayo, la preferencia anterior de grandes solares céntricos. No se presenta como un censo histórico: R6 sigue pendiente de investigación. La regla interpolada es de aproximadamente 32 casas junto a la plaza a 8 a partir de 1.400 m, con una variación determinista de ±2. Los valores son decisiones de modelado. En el entorno inmediato de Plaza Mayor (centros de manzana a no más de 200 m), se aplican las dos reducciones sucesivas del 30 % y otra del 40 % solicitadas, redondeadas a casas enteras en cada paso. Afecta a tres manzanas procedurales: 29 → 20 → 14 → 8, 29 → 20 → 14 → 8 y 30 → 21 → 15 → 9 casas. Esta excepción puede dejar menos casas que en la siguiente corona. La semilla utiliza el ID de la unidad del plano, no su posición en una lista.

Se aplican **43 unidades aprobadas** del contrato `tools/geo/referencias/1772-unidades.json`: 41 continuas y dos conjuntos especiales con edificios modelados activos. Las cinco cuadras con hitos reservan sus plantas y patios; las casas procedurales se adaptan alrededor de ellos. Las unidades parciales, pendientes, plazas, terrenos libres y conjuntos especiales sin edificio modelado conservan el sistema previo. No se inventan contornos ni se rellenan huertos para completar la cobertura. Esta entrega no cierra la reconstrucción de toda la época ni las reglas R1–R12.

## Geometría y fuentes

- Las cuatro esquinas vienen de los cruces identificados de `tools/geo/referencias/1772-red.json`. Son ejes de calle; se retraen 3 m como en `RETIRO_REFERENCIA_M` de `tools/geo/vectorizar.py`. Es un ancho inferido ya usado por el proyecto, no una medición histórica.
- Se conservan sus ángulos y lados desiguales, sin imponer una cuadrícula de cuadrados.
- El intervalo de dimensiones del planificador importado se amplía a 60–200 m para admitir las manzanas aprobadas del mapa. No se agrandan ni reducen sus contornos para hacerlos caber en el límite de 140 m del visor de estudio.
- Se usan casas en L, U y patio cerrado; el ancho de crujía aumenta con el tamaño del solar. Los tejados se adaptan a `ALA` y al alzado nativo. La esquina utiliza el inglete de crujías de igual ancho del renderizador de Caracas, y la vegetación de patio la genera el sistema nativo. Los anexos centrales del visor de estudio no se convierten en nuevas viviendas ni se copian como hitos: el centro queda de corrales y solares.
- Un piso salvo algunos altos en esquinas cercanas a la plaza: pauta visual existente de `fuentes/imagenes/README.md`, grabado [View of Caracas, 1812](https://commons.wikimedia.org/wiki/File:View_of_Caracas,_1812.jpg). La procedencia y derechos dudosos están registrados en su ficha; no se publica esa imagen.
- Referencia cartográfica: `fuentes/mapas/1772-pares-agi-exato-mapa/ficha.json`, censo y correspondencias de `specs/auditoria-1772/`. Las capturas satelitales aportadas para el prototipo son referencias internas; no se copian al sitio ni se atribuye su apariencia a Caracas en 1772.

## Épocas y edificios existentes

Solo se sustituye el intervalo `[1,2)` (1772 hasta antes de 1843). Una casa original que continúa en otra época conserva su huella, semilla, historia y alas allí. Cuando su vida abarca ambos lados del intervalo, se divide sin perder ninguno. Se retiran los solares anteriores mayoritariamente contenidos en la cuadra. Si una casa mayoritariamente externa la cruza, se omite esa cuadra para no cortar viviendas vecinas. La decisión queda registrada en el informe.

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

### Cierre del ajuste de densidad y color

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

## Rendimiento final

| Medición RTX 2060, sin otras pruebas concurrentes | main | Rama |
|---|---:|---:|
| Casas listas | 6.143 ms | 6.292 ms |
| Tarea más larga | 431 ms | 408 ms |
| Transferencia inicial | 9.682.696 B | 9.736.002 B |
| Heap observado | 242 MB | 242 MB |
| Geometría retenida en JS | 85,6 MB | 85,6 MB |
| Triángulos, centro | 4.484.071 | 4.342.983 |
| Mediana por cuadro, centro | 7,7 ms | 8,2 ms |

La transferencia aumenta 53.306 B por conservar vidas separadas y la nueva selección de paletas. La medición posterior a incorporar las reservas registra 242 MB de heap, dentro del presupuesto de 250 MB; los 257 MB de la medición anterior no se reprodujeron en esta ejecución. La mediana por cuadro sube 0,5 ms frente a la base y permanece por debajo de 16,6 ms. Los presupuestos de carga, tarea larga, transferencia y triángulos ya estaban excedidos en main. No se midió móvil físico.

## Validación de reservas de edificios

64 casas nuevas en las cinco cuadras con hitos; intersección máxima de sus solares con las reservas: 3,73e-9 píxeles cuadrados (redondeo numérico). El test de cuadra oblicua con dos reservas comprueba también cada triángulo de la geometría nativa, incluidos los tejados, no solo el parcelario. Auditoría de las otras cinco épocas: casas, árboles y paletas idénticos a la versión anterior.

Tras añadir las reservas: 10 tests focalizados de manzanas aprobados, suite unitaria completa 1.707/1.707 y 5/5 E2E de hitos. Las capturas de las cinco épocas terminaron sin errores. La suite integral E2E de 89 pruebas y los 996 tests Python corresponden a la validación anterior; no se repitieron íntegramente para este cambio solo de generación JavaScript.
