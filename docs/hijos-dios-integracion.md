# Cementerio de los Hijos de Dios: integración del estudio Miraflores

Parte de #250, sin cerrar el issue: falta el Cementerio General del Sur. Main0c99f37 tenía marca y ficha (PR234 y cronología280), sin modelo en HITOS. No se repite esa corrección ni se toca Trinidad.

## Evidencia

[Contexturas](https://contexturas.org/el-cementerio-de-los-hijos-de-dios/) reproduce fotografías y pinturas con muros de nichos superpuestos. La fotografía Boulton1934 se identifica con copyright de Alberto Vollmer Foundation: solo consulta local. [FAC](https://fundaayc.com/2018/02/09/1951-desaparece-el-cementerio-de-los-hijos-de-dios/) documenta apertura1856, clausura anterior a1889 y demolición1951. La marca existente ya recoge esta vida.

[Digitalización aproximada](hijos-dios-georreferencia.json): tres campos contiguos y entrante noreste en DCN1936, cotejados con el plano de fotos1946. Razetti1889 muestra tres recintos, con proporciones distintas; no se deduce reforma ni traslado de esa diferencia cartográfica. Se conserva la geometría aproximada1936 en las cuatro épocas1889–1946, explicitando el límite. No hay presencia1772/1843.

## Estudio e instalación

Corregido primero en Miraflores: constructor independiente, sin capilla no documentada, cuatro hileras de nichos, sepulturas dispersas y cipreses. Copia explícita en `src/hitos/hijos-dios-constructor.js`, factoría ciudad y adaptador al lienzo común. Sin GLB ni texturas descargadas en ejecución. La geometría se agrupa por material y se libera tras copiarla.

Origen8620,3670, eje paralelo al frente del dibujo, suelo verde convencional. El recinto sigue la ladera por vértice, sin terraza horizontal rectangular. Las caras extensas se subdividen a4m para evitar intersecciones entre muestras de relieve. No se trata de un levantamiento de los niveles históricos. La malla gruesa del terreno (96m sin GPU) podía atravesar el pavimento fino: el shader oculta exclusivamente su interior poligonal, con margen0,4m, vida3→0 y solo tras completarse la ola de levantamiento. Al acostar la ciudad o volver a1772/1843, vuelve el suelo original. Huella poligonal completa para supresión temporal de casas/árboles; colisión solo sobre muros, sin convertir los campos abiertos en cajas sólidas. Entrada sur interpretativa4m; sin portal situado arbitrariamente a partir de una fotografía. Registro al final de las listas para preservar semillas.

Dimensiones nominales de altura5,5m, espesor0,65m, nichos, sepulturas y vegetación son interpretativas, no levantamiento. Envolvente170×68m aproximada. No se atribuyen nombres a tumbas ni se inventan cambios de abandono por fecha.

## Validación pendiente

Tres pruebas de integración fallaron primero en main. Pasan vida3→0, recinto que excluye calle/seminario/entrante y enlace de marca. Un cuarto test reprodujo el apoyo central que enterraba el campo occidental; ahora comprueba el apoyo por vértice. Un quinto verifica que la subdivisión no cambia el área y limita las caras del suelo a4m. En Miraflores22 pruebas pasan; perspectiva/planta cotejadas con1936/1946, errores de navegador vacíos. Faltan capturas urbanas de seis épocas y comparación de rendimiento contra main, revisión y publicación. Tras fusionar, regenerar datos y publicar el release; no cerrar #250 hasta resolver también General del Sur.

Validación adicional:1844 pruebas unitarias pasan en138 archivos con dos workers (48,83s). El E2E1889–1946 pasa (25,3s), sin errores de shader. Geometría del recinto17.284triángulos; total histórico579.200 y todas las fases1.058.573 sobre main0c99f37. Límites explícitos580.000/1.060.000. Entrada341,4kB y workers161,2kB gzip, topes342/162; no se elevan presupuestos de ejecución. Faltan comparación contra main, mediciones de ejecución, revisión y publicación.
