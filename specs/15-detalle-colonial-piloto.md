# T82.3 · Prueba de detalle colonial por distancia

La prueba inicial de 1772 se conserva; la sección «Extensión a 1843» documenta la segunda época.

## Alcance

Prueba solicitada por el responsable para acercar el acabado de Caracas al estudio de Miraflores sin cargar toda la ciudad con el máximo detalle. Solo afecta, al activar `?detallecasas=1`, las casas nuevas de 1772 de U1772-0080, U1772-0095 y U1772-0205. El sitio normal conserva su representación actual. No se regeneran paquetes ni se amplía la prueba a las 253 unidades.

Vista directa: `http://localhost:5181/?sinintro&detallecasas=1&verbalcones`. Este enlace levanta las casas, activa el color y encuadra una fachada con balcones. `?detallecasas=1` permite recorrer libremente el piloto; sin ese parámetro se ve la base.

## Qué se recupera

Balcones de 70 cm de vuelo, losa, barandas frontales y laterales, barrotes reales, marcos del piso alto y cornisa. Las dimensiones y colores toman como referencia el generador aprobado de `../miraflores/src/manzana-colonial.js`; se adaptan a la altura y al reparto de vanos que ya dibuja Caracas. No cambia la cantidad de ventanas ni se sustituyen las texturas de puertas o ventanas de planta baja. No es todavía una reproducción completa del detalle del estudio.

Se leen las fachadas ya extruidas que llegan de los workers. Solo se aceptan casas con paleta del generador, vida [1772,1843), estilo colonial y tramos sobre el perímetro de las tres cuadras. Los patios y medianeras quedan excluidos. Los 86 balcones corresponden a los vanos altos existentes; no se añaden pisos para crearlos.

Referencias existentes: `fuentes/imagenes/README.md` y el estudio aprobado. El vuelo de 70 cm y la selección de cuadras son decisiones de modelado, no medidas históricas verificadas. Las reglas generales R1–R12 mantienen sus límites previos; los vuelos están por encima de la circulación, pero su ancho histórico no se da por certificado.

## Costo y niveles de detalle

- Módulo cargado de forma diferida solo cuando se activa el parámetro.
- Desde lejos no se dibuja esta capa. Cerca se crean y conservan dos geometrías fusionadas por cuadra: piezas principales y barrotes finos. Hasta seis mallas en total para las tres cuadras, no una malla por barrote.
- Distancia medida desde la cámara al volumen aproximado de la cuadra: entra el nivel medio a menos de 400 m y sale a 440 m; entra el fino a 160 m y sale a 200 m. La histéresis evita alternar repetidamente al rozar un umbral.
- En modo liviano/software se limita al nivel medio; en modo mínimo no se carga la capa.
- Épocas, ola, relieve, tinta/color y sombras siguen los uniforms de la ciudad. Los detalles usan el apoyo exacto de la casa, sin el pedestal de 12 cm de los hitos. Cambiar de nivel invalida el mapa de sombras.
- Las geometrías se reutilizan al volver a acercarse. Este caché está acotado a tres cuadras; antes de extenderlo a toda la ciudad habría que estudiar la liberación de cuadras lejanas y medir en móviles.

## Comprobar

`npx vitest run tests/unit/detalle-colonial.test.js` verifica extracción, exclusión de patios/otras épocas, normal empaquetada, vuelos, geometría compartida, apoyo, vida y reutilización de niveles. `tests/e2e/detalle-colonial.spec.js` comprueba la vista cercana y que se apague al alejarse o cambiar de época.

La medición general admite `--detalle-casas` y `--vistas archivo.json` para añadir la misma cámara cercana a ambas variantes. Las capturas comparativas se conservan localmente en `../miraflores/entregables/detalle-colonial/antes.png` y `despues.png`. Son capturas automatizadas revisadas por el agente; la revisión visual de una persona sigue pendiente. El PR se presenta listo para revisión por instrucción explícita del responsable.

## Resultados

Comparación contra a296e8a (base #211, mismas casas y árboles), RTX 2060, build de producción, 1280 × 800, con GPU y sin límite de vsync. Una corrida por variante; las diferencias pequeñas de tiempo no demuestran una mejora.

| Medición | Base | Piloto activado |
|---|---:|---:|
| Casas listas | 5.895 ms | 5.775 ms |
| Tarea larga inicial máxima | 367 ms | 479 ms |
| Transferencia inicial | 9.991.878 B | 9.996.902 B |
| Heap observado antes del acercamiento | 242 MB | 257 MB |
| Centro: mediana por cuadro | 8,0 ms | 8,0 ms |
| Balcones: mediana por cuadro | 7,0 ms | 6,7 ms |
| Balcones: percentil 90 | 8,4 ms | 8,4 ms |
| Balcones: llamadas de dibujo, incluyendo pases | 95 | 107 |
| Balcones: triángulos, incluyendo pases | 4.573.280 | 4.619.576 |

El detalle añade 5.024 B a la transferencia inicial de la prueba activada y 46.296 triángulos dibujados en la cámara cercana (+1,0 %, contando sombras). Desde lejos, llamadas y triángulos del centro permanecen iguales. Las seis mallas activas contienen 23.148 triángulos de detalle; la preparación de sus buffers costó 38,5 ms acumulados al acercarse por primera vez y se reutilizan después. Ese costo puntual no está incluido en la mediana de navegación ya estabilizada.

El tiempo de navegación cercano fue equivalente en esta GPU; no se extrapola a teléfonos ni a las 253 unidades. La tarea larga máxima aumentó 112 ms y el heap observado 15 MB en esta corrida: se registran, no se atribuyen automáticamente al detalle ni se descartan como ruido sin más mediciones. La carga, las tareas largas, los bytes y los triángulos superan presupuestos ya pendientes en la base; el heap del piloto también excede el tope en esta muestra. El tiempo por cuadro sí cumple.

Informes completos: `reglas/detalle-colonial/rendimiento-{base,piloto}.json`; cámara idéntica en `vistas.json`. Reproducción:

```sh
node tests/e2e/medir-rendimiento.mjs http://localhost:5185/ --gpu --vistas specs/reglas/detalle-colonial/vistas.json --salida /tmp/base.json
node tests/e2e/medir-rendimiento.mjs http://localhost:5183/ --gpu --detalle-casas --vistas specs/reglas/detalle-colonial/vistas.json --salida /tmp/piloto.json
```

- Vitest final aislado: **107 archivos, 1.717 tests aprobados**. Una corrida anterior simultánea con capturas tuvo un timeout de `sombra-shader`; la repetición sin carga concurrente pasó completa.
- Python: **999 tests aprobados**; no se cambió ni regeneró la geometría offline.
- Playwright completo: **87 aprobados, 1 omitido y 2 fallidos (5,2 min)**. Los fallos son los mismos `hitos.spec.js:96` y `:117` ya reproducidos en main, sin modificar esos tests. Esta corrida precedió a la optimización de escritura de buffers; se vuelve a comprobar después el piloto y el acabado de forma focalizada.
- Build aprobado: JS inicial **309,6 KB / 330 KB**, workers **139,7 KB / 150 KB**, service worker **1,3 KB / 3 KB**. El chunk del piloto solo se solicita cuando se activa.
- Capturas cercanas comparables antes/después sin errores de página ni compilación de shaders. Revisión visual humana y prueba en móviles pendientes; el PR se presenta listo para revisión por solicitud del responsable.

Después de la optimización final: **5/5 E2E focalizados de piloto y acabado aprobados**. La prueba del piloto inspecciona primero el paquete servido y se omite de forma explícita si el release todavía no contiene paletas coloniales; con datos coloniales presentes, una extracción vacía sigue siendo un fallo.

## Extensión a 1843 (T82.4)

El mismo piloto se puede abrir en `?sinintro&detallecasas=1&verbalcones=1843`.
Se mantienen las tres áreas del piloto, pero se extraen las fachadas de las casas **vivas en 1843**;
no se prolonga la vida de las casas generadas para 1772. El estilo y el número de pisos se leen del
byte de 1843 en `aHistoria`, como hace el shader nativo. Las fachadas republicanas quedan excluidas
porque sus ventanas no usan el mismo reparto que los balcones coloniales.

En el paquete local hay **115 tramos de fachada y 9 balcones** en 1843 (2, 5 y 2 por cuadra).
Son menos que los 86 de 1772: no se inventan segundos pisos ni vanos para igualar el conteo.
La referencia de calle anotada en `fuentes/imagenes/README.md` sigue siendo orientativa y de fecha
no confirmada; no se incorpora ningún dato histórico nuevo.

Para el contorno irregular procedente del plano, los dos extremos del tramo deben seguir el mismo
lado de la cuadra a menos de 3 m y su normal debe apuntar hacia afuera (producto escalar > 0,9).
Esta distancia es una tolerancia de selección de la geometría rasterizada, no una medida histórica:
las piezas permanecen pegadas a la pared real, sin desplazarla. Se excluyen los muros orientados
hacia patios y los tramos interiores. La selección de 1772 conserva su tolerancia de 30 cm.

Los buffers se separan por cuadra **y época**, con vidas `[1,2)` y `[2,3)` respectivamente.
Durante la ola pueden coexistir ambos lotes; el shader compartido decide cuál existe en cada punto.
Cada época usa hasta seis mallas, o tres en modo liviano; durante la transición pueden ser doce.
Después de visitar ambas épocas, el caché conserva un máximo de doce mallas y se libera al destruir
la capa. El modo mínimo no carga el módulo. Las otras épocas no dibujan este detalle.

Capturas locales de 1843: `../miraflores/entregables/detalle-colonial-1843/`.
La comparación automatizada usa la cámara guardada en `reglas/detalle-colonial/1843/vistas.json`.
La revisión de una persona y la medición en teléfonos siguen pendientes.

### Validación de 1843

La comparación de producción con la base del piloto usa la misma cámara, 1280 × 900, color, relieve y
GPU. **1772, 1889, 1911 y 1936 son idénticos píxel por píxel**. En 1843 cambia el 1,04 % de los canales
RGB de la captura, localizado en los balcones y cornisas. Sin errores de página ni compilación.
El primer intento de 1772 aún interpolaba el color; se repitió con `uColor=1` antes de comparar.
El índice 1578 no está disponible en la interfaz; su exclusión se verifica en la prueba unitaria del
controlador. Resultados en `reglas/detalle-colonial/1843/comparacion.json` y capturas `main-2.png` /
`rama-2.png` en la carpeta local indicada arriba.

Vitest: **107 archivos, 1.723 tests aprobados** con `--maxWorkers=2 --testTimeout=20000`.
Se limitó la concurrencia tras interrumpir una corrida por defecto con timeouts mientras otro proceso
regeneraba el mosaico; no se cambiaron tests ajenos ni sus umbrales en el repositorio.
Python: **1.001 tests aprobados**. Build: JS inicial **309,7 / 330 KB**, workers **139,7 / 150 KB**,
service worker **1,3 / 3 KB**. Los datos de parcelación, techos, árboles e hitos no se regeneran con este
cambio: las mediciones de reglas sobre esos datos permanecen aplicables; los vuelos de detalle conservan
el límite de modelado ya documentado para el piloto.

Playwright completo (GPU, 2 workers): **88 aprobados, 1 omitido y 2 fallidos (9,6 min)**.
Las dos pruebas del piloto pasan, incluida la nueva vista directa de 1843 y su ida y vuelta por
1889, 1911 y 1936. Persisten los dos resultados de `hitos.spec.js` documentados en la base #212:
`:96` pasa aunque está marcado como fallo esperado y `:117` falla al comparar el color de la ciudad
acostada. No se tocaron ni se ocultaron esas pruebas.

### Rendimiento de 1843

RTX 2060, build de producción, misma cámara y datos, una corrida por variante. La base es el piloto
fusionado en #212 sin la extensión de 1843. Otro proceso del equipo regeneraba datos durante las
corridas: los tiempos no están aislados y no permiten afirmar una mejora ni extrapolar a móviles.

| Medición | Base | Con 1843 |
|---|---:|---:|
| Casas listas | 10.000 ms | 6.718 ms |
| Tarea larga máxima | 637 ms | 728 ms |
| Transferencia inicial | 9.996.939 B | 9.997.306 B |
| Heap observado antes del acercamiento | 242 MB | 215 MB |
| Buffers de geometría vivos en JS antes del acercamiento | 144,6 MB | 165,5 MB |
| Centro: mediana / p90 por cuadro | 16,6 / 22,5 ms | 14,2 / 23,7 ms |
| Balcones: mediana / p90 por cuadro | 11,5 / 22,5 ms | 10,9 / 19,2 ms |
| Balcones: llamadas de dibujo, con pases | 129 | 141 |
| Balcones: triángulos dibujados, con pases | 4.094.176 | 4.101.688 |

La diferencia geométrica es **7.512 triángulos dibujados (+0,18 %)** y doce llamadas con sombras.
Las seis mallas contienen 3.756 triángulos y crear sus buffers costó 15,3 ms acumulados la primera vez.
Desde lejos, llamadas y triángulos no cambian. La transferencia crece 367 B en esta comparación.
La tarea larga aumenta 91 ms y los buffers retenidos en JS 20,9 MB; el heap baja 27 MB. Se registran
sin atribuir estos cambios de carga/retención al piloto: dependen también de la concurrencia externa,
la entrega de baldosas, el envío a GPU y la recolección de memoria. El detalle aún no se había construido
al tomar esa muestra de memoria. La ciudad sigue excediendo los presupuestos previos de carga, tareas
largas, bytes y triángulos; no se declara resuelto su rendimiento global.

Informes completos: `reglas/detalle-colonial/1843/rendimiento-{base,piloto}.json`.

```sh
node tests/e2e/medir-rendimiento.mjs http://localhost:5186/ --gpu --detalle-casas --epoca 1843 --vistas specs/reglas/detalle-colonial/1843/vistas.json --salida /tmp/base1843.json
node tests/e2e/medir-rendimiento.mjs http://localhost:5183/ --gpu --detalle-casas --epoca 1843 --vistas specs/reglas/detalle-colonial/1843/vistas.json --salida /tmp/piloto1843.json
```
