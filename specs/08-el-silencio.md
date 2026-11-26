# El Silencio · vista parcial de1945

Solicitud del responsable: integrar el conjunto del estudio Miraflores en su emplazamiento y retirar las manzanas sustituidas. La cronología del sitio terminaba en1936; se añade1945 **como reconstrucción parcial sobre esa base**, sin afirmar que toda Caracas fue reconstruida para1945. El selector y la ficha lo explican. No se regeneran ni publican paquetes históricos.

## Ubicación y geometría

Control: © OpenStreetMap contributors, ODbL1.0 ([licencia](https://www.openstreetmap.org/copyright)). Consulta26-11-2026. Datos y licencia en `fuentes/datos/el-silencio-osm/`. Bloques1–5: ways282990561,282978613,272916304,221275569,282990560. Bloques6/7: relaciones3828292/3828291; exteriores282978611/282978609 e interiores288517439/282978610. PlazasMiranda/O’Leary: ways215101087/1189313824.

Las coordenadas WGS84 se convierten al plano con `geo1936.wgs84_a_utm → utm_a_grid(cargar()) → grid_a_px`. El ajuste del proyecto tiene RMS5,09m (máximo8,77m; validación dejando un punto fuera RMS6,86m). Es un **emplazamiento georreferenciado**, no un levantamiento catastral exacto.

El estudio inicial era esquemático: se descartó escalar cada bloque por su caja, porque invadía parcelas sesgadas. La integración construye los volúmenes sobre los polígonos geográficos y conserva su lenguaje arquitectónico: columnas ensanchadas, galerías de arco, comercio retranqueado, balcones proyectados, cubiertas planas y la paleta crema/piedra. Los patios6/7 proceden de los anillos interiores de OSM. El bloque4 sigue su eje norte-sur real. El bloque5 conserva el contorno quebrado/curvo aproximado por OSM. Los cinco patios del bloque1 y la delimitación de su cuerpo alto son interpretativos: el contorno OSM no describe sus alas interiores. Se conserva el cuerpo central de siete niveles y los bajos de cuatro; no se adoptan las etiquetas modernas de pisos OSM.

`tools/el-silencio-plantas.py` regenera los polígonos de vivienda/comercio y jardines desde el control geográfico. Requiere el entorno Python del proyecto con Shapely. El módulo de datos almacena sólo coordenadas, no fotos ni texturas. Los balcones sobresalen hasta1,3m, sobre las galerías; no cambian el volumen principal de la planta.

## Sustitución histórica

Índice6 =1945; los seis índices existentes y sus bytes de historia permanecen intactos. La nueva vista hereda los estilos de1936 por el límite existente del shader. `uEtapas` conserva6: corresponde a la codificación de la imagen de crecimiento, no al número de botones. `NUNCA=7` continúa reservado.

Las reservas nacen en6. Una reserva del recinto sustituye también los solares vacíos de patios, no sólo las crujías, mediante `solarCompleto`. Las casas y árboles anteriores conservan su vida hasta1936. El suelo nuevo sigue el relieve mediante teselas pequeñas y anclas por vértice; plazas y jardines quedan sobre él. La envolvente convexa de parcelas y plazas define el recinto de sustitución; los patios/calles interiores se liberan. No se coloca el tablero rectangular del visor de estudio.

## Fuentes históricas y límites

- [Wikipedia: Reurbanización El Silencio](https://es.wikipedia.org/wiki/Reurbanizaci%C3%B3n_El_Silencio).
- [Entre Rayas, Jesús Yépez](https://entrerayas.com/a-66-anos-de-la-inauguracion-de-la-reurbanizacion-el-silencio/):5julio1944 primer bloque7;26agosto1945 conjunto terminado.
- [Cámara de Caracas, primer bloque](https://camaradecaracas.com/la-camara-caracas-y-sus-historias/cronicas-de-la-ciudad/inauguracion-del-primer-bloque-de-el-silencio/): reproducción de Élite8julio1944.
- [Stavros Stavrides, p.2, perspectiva histórica numerada](https://stavrosstavrides.com/wp-content/uploads/2023/07/Housing-Venezuela.pdf): relaciones entre bloques, patios y plazas.
- [El Archivo: fotografías de1945](https://elarchivo.org/retratos-hitos-y-bastidores-el-silencio-entre-el-proyecto-y-la-cronica/).

Las fotografías se consultaron como referencias; no se redistribuyen. Colores, vanos y escultura son interpretativos. Las fuentes de Narváez tienen siluetas simplificadas. El urbanismo fuera del recinto sigue en1936; no se incluyen las torres del Centro Simón Bolívar ni un estado completo de la avenida Bolívar posterior. No se representa la fase de demolición1942–1944. La remodelación del terreno y las cotas históricas de las aceras no están levantadas; se utiliza el DEM del proyecto.

## Revisión

Comparar1936 y1945 desde la misma cámara. Verificar retorno a1772/1843/1889/1911/1936, ausencia de nueva geometría en esas fechas, plazas sin casas, fachadas dentro de la parcela y patios abiertos. Las mediciones geométricas son pruebas automáticas; la prueba manual del responsable queda pendiente. `tools/geo/reglas_mapa.py` todavía no existe en la rama base: no se presenta como ejecutado.

### Evidencia final

- Supresión sobre el paquete local:333casas dejan de verse desde1945; cero diferencias de visibilidad en los índices0–5 y cero casas antiguas solapadas con el recinto después de sustituirlo. Informe `specs/reglas/el-silencio/supresion.json`.
- La geometría nueva se construye en un segundo worker sólo al elegir1945; no se añade al arranque histórico. El render apaga su malla fuera de esa época. Los índices conservan vértices compartidos:166MB de geometría en JS en1945, frente a210,6MB antes de esta optimización. La ciudad base conserva92,7MB.
- GPU RTX2060, build de producción,1280×800: mediana centro main1936=10,4ms; rama1936=9,8ms; rama1945=10,4ms. Una pasada, no un estudio estadístico. Los JSON completos conservan también los presupuestos que ya fallaban en main (descarga, carga, triángulos). Heap instantáneo125/257/202MB; no se forzó GC ni se atribuye esa diferencia a memoria retenida. JSON en la misma carpeta.
- El worker fallido devuelve la selección a la época anterior y permite reintentar. Sin `crece.json`, se conserva1936 para no dejar el recinto vacío.
- [Galería de capturas](https://gist.github.com/grunch/c665064c266dc49e7f23621a7f2ff509).
