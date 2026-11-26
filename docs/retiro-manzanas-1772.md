# Piloto: más espacio para las calles de 1772

Propuesta visual solicitada por el responsable del proyecto: retiro **adicional de 1 m por frente**, aproximadamente 2 m más entre dos manzanas ajustadas. No es una medida histórica documentada. Rama de prueba `feat/retiro-manzanas-1772`, basada en main `4e96d9f`.

El piloto reduce los contornos y vuelve a generar las casas con las mismas semillas, cantidades solicitadas, paletas y reservas de edificios. Mantiene fijos los hitos. No transforma ni escala sus modelos. Recalcula patios y árboles sobre las nuevas parcelas. Conserva los solares cuyo retiro produciría varios fragmentos o menos de 25 m²; este umbral es una salvaguarda geométrica, no una clasificación histórica.

## Reproducción

Desde un checkout con los datos completos y `.venv` instalada:

```sh
node tools/retiro-manzanas-1772.mjs fuentes/derivados/1946/ciudad-1946.json public/datos/arboles.bin fuentes/derivados/retiro1772 1
.venv/bin/python tools/geo/verificar_retiro.py fuentes/derivados/1946/ciudad-1946.json fuentes/derivados/retiro1772/ciudad.json public/datos/arboles.bin fuentes/derivados/retiro1772/arboles.bin
```

La última cifra es el retiro adicional, en metros. Usar como entradas la ciudad final y los árboles **originales**, no los resultados de una ejecución anterior. El comando escribe solo en la carpeta de salida. Para visualizar, guardar primero una copia de los datos públicos originales y ejecutar en un checkout de prueba:

```sh
node tools/empacar-ciudad.mjs fuentes/derivados/retiro1772/ciudad.json
cp fuentes/derivados/retiro1772/arboles.bin public/datos/arboles.bin
node tools/suelo-manzanas.mjs fuentes/derivados/1936/mosaico.json fuentes/derivados/retiro1772/manzanas-1772-informe.json fuentes/derivados/epocas/manzanas-1843-informe.json fuentes/derivados/epocas/manzanas-1889-informe.json
npm run dev
```

No ejecutar después los integradores de 1843/1889: heredarían la propuesta. Este piloto sustituye exclusivamente el intervalo de 1772; por tanto, al pasar a 1843 se recuperan los contornos anteriores. La continuidad exacta entre épocas deberá restablecerse si se decide extender el ajuste. No publicar estos datos como release general mientras sea una comparación aislada.

## Resultado observado

- 248 de 253 manzanas retraídas; cinco excepciones enumeradas en `resumen.json`.
- Casas visibles en 1772: 3169 → 3161; el recorte y la reserva de patios eliminan ocho viviendas pequeñas.
- Árboles visibles en 1772: 31582 → 31425; todas las manzanas siguen teniendo árboles.
- Igualdad semántica de geometría, atributos y árboles en todas las demás épocas, incluida 1946. Se comparan multiconjuntos, sin depender de índices renumerados.
- Suelo: solo cambia el canal de 1772 (R); G/B y metadatos idénticos.
- Vitest: 1778 pruebas; Python: 1021 pruebas. Build correcto, con aviso existente de tamaño de bundle.
- Capturas automatizadas antes/después con la misma cámara cenital y oblicua. No sustituyen la revisión visual del responsable.

El generador no añade código al render ni publica datos. El coste de generación es offline; no se ha medido el tiempo por cuadro de esta propuesta.

## Límite detectado en la prueba de navegador

`tests/e2e/detalle-colonial.spec.js` agotó 180 s esperando las mallas de la capa opcional `detallecasas=1`. La inspección encontró que `extraerFrentes` reconoce las fachadas por coincidencia con los bordes estáticos de `PILOTO_COLONIAL`; las nuevas fachadas están a 1 m de esos bordes. Además, la sustitución temporal separa las vidas de las casas, y la capa selecciona nacimientos en el índice 1. Antes de publicar hay que adaptar esa selección a contornos por época y repetir el E2E, conservando el detalle en 1843/1889. No se considera el piloto listo para producción. Las capturas y el comparador muestran el render principal, sin activar esta capa experimental.
