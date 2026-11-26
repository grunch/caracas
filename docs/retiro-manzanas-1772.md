# Más espacio para las calles de 1772

Retiro **adicional de 1 m por frente**, aproximadamente 2 m más entre contornos paralelos de dos manzanas ajustadas. Es una propuesta visual solicitada por el responsable del proyecto, no una medida histórica documentada. Los hitos modelados conservan su ubicación y dimensiones.

Se regeneran las casas con las mismas semillas, cantidades solicitadas, paletas y reservas de edificios. Se recalculan patios y árboles sobre las parcelas nuevas. Cinco solares conservan su contorno porque el retiro produciría varios fragmentos o menos de 25 m²; ese umbral es una salvaguarda geométrica, no una clasificación histórica. Sus casas y árboles también se regeneran.

## Pipeline y reproducción

`npm run datos -- --desde empacar-base` ejecuta el cambio dentro del pipeline habitual, desde un checkout con los escaneos, derivados anteriores y `.venv` instalada según `tools/geo/README.md`:

1. `empacar-base` empaqueta la ciudad final original de 1946 en `fuentes/derivados/retiro1772/base.pak`.
2. `arboles-base` regenera los árboles originales desde ese paquete y los informes antiguos, en `base-arboles.bin`.
3. `retiro-1772` modifica exclusivamente el intervalo de 1772 y produce ciudad, árboles, informe, resumen y contornos de detalle.
4. `empacar` y `arboles` instalan las salidas en `public/datos`.
5. `suelo-manzanas` usa el informe retraído para R/1772; mantiene los informes originales de 1843 y 1889 para G/B.

No hay ciclos ni archivos con dos productores. Los árboles posteriores se generan desde la ciudad original, para que la renumeración de casas no cambie sus posiciones o semillas. `empacar-ciudad.mjs` admite una segunda ruta de salida y `arboles.mjs` admite `--ciudad` y `--salida`; conservan sus valores predeterminados para usos independientes.

Para regenerar únicamente el retiro, cuando ya existen las entradas base:

```sh
node tools/retiro-manzanas-1772.mjs fuentes/derivados/1946/ciudad-1946.json fuentes/derivados/retiro1772/base-arboles.bin fuentes/derivados/retiro1772 1
.venv/bin/python tools/geo/verificar_retiro.py fuentes/derivados/1946/ciudad-1946.json fuentes/derivados/retiro1772/ciudad.json fuentes/derivados/retiro1772/base-arboles.bin fuentes/derivados/retiro1772/arboles.bin
node tools/empacar-ciudad.mjs fuentes/derivados/retiro1772/ciudad.json
cp fuentes/derivados/retiro1772/arboles.bin public/datos/arboles.bin
node tools/suelo-manzanas.mjs fuentes/derivados/1936/mosaico.json fuentes/derivados/retiro1772/manzanas-1772-informe.json fuentes/derivados/epocas/manzanas-1843-informe.json fuentes/derivados/epocas/manzanas-1889-informe.json
npm run dev
```

El último argumento del generador es el retiro adicional en metros. No usar los árboles finales como entrada de una ejecución siguiente. No ejecutar después los integradores de 1843/1889: heredarían el cambio. Al pasar a 1843 se recuperan los contornos anteriores; extender el retiro a otras épocas sería otro cambio solicitado.

## Balcones y detalle

La capa opcional `?detallecasas=1&verbalcones` reconoce los contornos originales y los nuevos, sin ampliar su tolerancia de 0,3 m. Usa la vida real de cada fachada, incluida la versión conservada desde 1843, y separa las versiones en la deduplicación. Los balcones continúan sobresaliendo desde la fachada real.

El generador escribe `contornos-piloto.json`. Para el retiro predeterminado de 1 m, falla si difiere de `src/manzanas/retiro-1772-piloto.json`, consumido por el renderer. Si se cambia el parámetro o la fuente, revisar y copiar ese JSON al archivo versionado y repetir las pruebas de detalle. El JSON solo se carga con la capa de detalle.

## Resultado y validación

- 248 de 253 manzanas retraídas; cinco excepciones enumeradas en `resumen.json`.
- Casas visibles en 1772: 3169 → 3161; el recorte y la reserva de patios eliminan ocho viviendas pequeñas.
- Árboles visibles en 1772: 31582 → 31425; todas las manzanas siguen teniendo árboles.
- Igualdad semántica de geometría, atributos y árboles en todas las demás épocas, incluida 1946. El comparador usa multiconjuntos, no índices renumerados.
- Árboles base regenerados: SHA256 idéntico al release original.
- Suelo: solo cambia el canal R/1772; G/B y metadatos idénticos.
- Pruebas de retiro, contornos, vidas de balcones, deduplicación y dependencias del pipeline; E2E de detalle cercano, LOD y apagado desde 1911.
- Capturas automatizadas antes/después con cámara idéntica y detalle activado. No sustituyen la revisión visual de una persona.

Los binarios no se versionan. Tras revisar y fusionar, regenerar/verificar el manifiesto y publicar los datos con el procedimiento habitual de `npm run datos:publicar`; abrir el PR no actualiza el sitio público. Los resultados de tests y rendimiento de la rama se documentan en el PR.
