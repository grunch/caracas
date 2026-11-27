# Cementerio de los Hijos de Dios: integración del estudio Miraflores

Parte de #250, sin cerrar el issue: falta el Cementerio General del Sur. Main0c99f37 tenía marca y ficha (PR234 y cronología280), sin modelo en HITOS. No se repite esa corrección ni se toca Trinidad.

## Evidencia

[Contexturas](https://contexturas.org/el-cementerio-de-los-hijos-de-dios/) reproduce fotografías y pinturas con muros de nichos superpuestos. La fotografía Boulton1934 se identifica con copyright de Alberto Vollmer Foundation: solo consulta local. [FAC](https://fundaayc.com/2018/02/09/1951-desaparece-el-cementerio-de-los-hijos-de-dios/) documenta apertura1856, clausura anterior a1889 y demolición1951. La marca existente ya recoge esta vida.

[Digitalización aproximada](hijos-dios-georreferencia.json): tres campos contiguos y entrante noreste en DCN1936, cotejados con el plano de fotos1946. Razetti1889 muestra tres recintos, con proporciones distintas; no se deduce reforma ni traslado de esa diferencia cartográfica. Se conserva la geometría aproximada1936 en las cuatro épocas1889–1946, explicitando el límite. No hay presencia1772/1843.

## Estudio e instalación

Corregido primero en Miraflores: constructor independiente, sin capilla no documentada, cuatro hileras de nichos, sepulturas dispersas y cipreses. Copia explícita en `src/hitos/hijos-dios-constructor.js`, factoría ciudad y adaptador al lienzo común. Sin GLB ni texturas descargadas en ejecución. La geometría se agrupa por material y se libera tras copiarla.

Origen8620,3670, eje paralelo al frente del dibujo, suelo verde convencional. El recinto sigue la ladera por vértice, sin terraza horizontal rectangular. Las caras extensas se subdividen a4m para evitar intersecciones entre muestras de relieve. No se trata de un levantamiento de los niveles históricos. La malla gruesa del terreno (96m sin GPU) podía atravesar el pavimento fino: el shader oculta exclusivamente su interior poligonal, con margen0,4m, vida3→0 y solo tras completarse la ola de levantamiento. Al acostar la ciudad o volver a1772/1843, vuelve el suelo original. Huella poligonal completa para supresión temporal de casas/árboles; colisión solo sobre muros, sin convertir los campos abiertos en cajas sólidas. Entrada sur interpretativa4m; sin portal situado arbitrariamente a partir de una fotografía. Registro al final de las listas para preservar semillas.

Dimensiones nominales de altura5,5m, espesor0,65m, nichos, sepulturas y vegetación son interpretativas, no levantamiento. Envolvente170×68m aproximada. No se atribuyen nombres a tumbas ni se inventan cambios de abandono por fecha.

## Validación

Las pruebas específicas verifican vida3→0, recinto que excluye calle/seminario/entrante, enlace de marca, apoyo del relieve por vértice y subdivisión que conserva el área con caras de suelo de hasta4m. En Miraflores22 pruebas pasan; perspectiva/planta cotejadas con1936/1946, sin errores de navegador. Las capturas urbanas comparables de las seis épocas y la comparación de rendimiento están en los artefactos enlazados abajo. Esta integración no cambia datos cartográficos ni requiere regenerar el paquete. No cerrar #250 hasta resolver también General del Sur.

Validación tras rebasar sobre main d99e17d (incluye San Agustín): npm test -- --maxWorkers=2, 1.848 pruebas en139 archivos; build y node tools/rendimiento/presupuesto-build.mjs pasan; E2E 1889–1946 pasa sin errores de shader. La geometría aislada del recinto suma17.284triángulos; total histórico592.022 y todas las fases1.071.395. Topes explícitos de hitos600.000/1.080.000. Build combinado343,2kB inicial y162,7kB workers gzip; límites344/163, sin elevar presupuestos de ejecución. Las mediciones emparejadas y sus límites constan en [mediciones de rendimiento](mediciones/hijos-dios/README.md).

### Reglas de construcción aplicables y límites de auditoría

Se revisaron las reglas T82 de `specs/13-reglas-de-construccion.md` para no presentar las pruebas locales como una auditoría completa del mapa:

| Regla | Estado en este cambio |
|---|---|
| R1, R3–R8 | No aplican al cementerio: la geometría no genera casas, frentes de manzana, patios domésticos ni suelo residencial. Esto no certifica esas reglas para las otras geometrías del mapa. |
| R2 · Calles libres | Parcial: una prueba unitaria comprueba que la huella no cubre puntos de referencia de la calle y el seminario. No se midieron todas las caras frente a la calzada ni se ejecutó `reglas_mapa.py` para certificar calles de la ciudad. |
| R9 · Cada nombre en su lugar | Parcial: prueba unitaria comprueba que la marca enlaza al hito en vez de conservar una coordenada aislada. No prueba distancia de la etiqueta a la geometría ni es un catastro. |
| R10 · Agua continua | No se altera la red hidrográfica; la continuidad de cauces no se volvió a medir en este PR. |
| R11 · Sin anacronismos | Verificada en pruebas unitarias: ausente en 1772/1843, presente desde 1889 en las cuatro épocas siguientes, de acuerdo con la vida ya documentada de la marca. No se proponen cambios arquitectónicos por época sin evidencia. |
| R12 · Las otras épocas intactas | Comparación pixel a pixel de las vistas 1772/1843 antes/después sin diferencias; la prueba unitaria verifica la vida 1889–1946 y el E2E renderiza las cuatro épocas con el hito. No equivale a correr todas las puertas `reglas_mapa.py --todas` ni prueba por sí sola la visibilidad por píxeles. |

La revisión completa de las reglas globales del mapa queda pendiente de sus herramientas de auditoría; no se afirma como criterio satisfecho por este cambio aislado.

Capturas comparables de seis épocas antes/después: [gist secreto](https://gist.github.com/grunch/83d11c415ad724a4ea3ae720a0dffaec). La sesión actual no tiene un navegador interactivo conectado; la revisión visual automatizada y el E2E sí se corrieron, pero no se afirma una prueba manual. Issue #250 sigue parcialmente abierto: falta integrar General del Sur.
