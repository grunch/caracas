# Continuación del retiro por épocas

Se mantiene la propuesta visual de un metro adicional de retiro iniciada en 1772. No representa un ancho histórico documentado. Los hitos modelados conservan sus dimensiones y ubicación.

## 1843

Se conservan las 253 manzanas retraídas de 1772 sin volver a sortear sus casas. Se agregan 146 manzanas con el mismo retiro; veinte contornos en total quedan exceptuados por fragmentación o superficie mínima. Se mantienen 3161 casas heredadas y se generan 1032 nuevas (4193 visibles). Los árboles heredados conservan posiciones y radios; se regeneran solo los de la expansión. Las otras épocas no cambian.

El pipeline lee `src/manzanas/epocas-retiro.json` y aplica una etapa por fecha habilitada. Cada etapa consume la ciudad y los árboles anteriores y produce una carpeta `fuentes/derivados/retiro<AÑO>`. Los informes originales nunca se sobrescriben. `empacar`, `arboles` y los canales del suelo consumen las salidas correspondientes.

```sh
node tools/retiro-manzanas-epoca.mjs 1843 fuentes/derivados/retiro1772 fuentes/derivados/retiro1843
npm run datos -- --desde retiro-1843
```

La ruta normal sigue siendo `npm run datos`. Se requieren los derivados anteriores y fuentes según `tools/geo/README.md`. Los datos pesados se publican después de revisar y fusionar los PRs; no se versionan binarios ni se cambia el release vivo al abrirlos.

Las capturas comparan la misma cámara con main. Las validaciones semánticas comparan cada etapa contra su padre: fuera de la fecha intervenida, geometría, alas, paletas, historia y árboles permanecen iguales. La continuidad entre las fechas coloniales se conserva extendiendo las vidas de los mismos registros, no regenerándolos.

## 1889

Hereda exactamente las 399 manzanas retraídas de 1843 y añade 87 unidades. Se mantienen 4193 casas heredadas y se generan 680 nuevas: 4873 visibles. Hay 27 contornos exceptuados en total. Los balcones usan el contorno retraído durante todo el intervalo colonial, hasta 1911. Solo cambia el canal B del suelo de esta época; se mantienen los informes retraídos de las dos anteriores.

```sh
node tools/retiro-manzanas-epoca.mjs 1889 fuentes/derivados/retiro1843 fuentes/derivados/retiro1889
```

## 1911: tejido vectorizado

Se conserva la cantidad de casas (14240) y de árboles (27740). Se ajustan 7805 casas; las restantes mantienen su geometría por protección de hitos, contornos estrechos/pequeños o concavidades que no admiten el retiro seguro. El resumen enumera los límites; no se eliminan casas ni se regeneran sus estilos.

El generador agrupa primero por las caras de la red clasificada de 1936 que ya utiliza el vectorizador base. Fuera de ellas usa las componentes del plano y los bloques de expansión de 1946. No se digitaliza una red histórica nueva. El retiro es una escala uniforme nominal de un metro sobre la caja orientada de la manzana: huellas, marcos y alas se transforman juntos, conservando ángulos, semillas, paletas, alturas y vida histórica. Se comprueba que no aumente la invasión del contorno, con la tolerancia de vectorización existente de 0,35 m; los casos incompatibles se conservan. Las manzanas que contienen techos de hitos fijos quedan protegidas.

Los árboles de la fecha se trasladan con la misma transformación y ajustan su radio. Los demás intervalos permanecen intactos. Cada fecha consulta la misma ciudad original de 1946 para calcular la transformación: nunca se encoge nuevamente la salida anterior. La compactación elimina vértices/alas sin uso y une versiones idénticas en intervalos contiguos.

```sh
node tools/retiro-moderno.mjs 1911 fuentes/derivados/retiro1889 fuentes/derivados/retiro1911
.venv/bin/python tools/geo/comparar_retiro_epoca.py fuentes/derivados/retiro1889/ciudad.json fuentes/derivados/retiro1911/ciudad.json 4 fuentes/derivados/retiro1889/arboles.bin fuentes/derivados/retiro1911/arboles.bin
```

La comparación exige igualdad semántica completa fuera del intervalo indicado. Los modelos de hitos, las texturas de los planos y el terreno de las épocas modernas no se escalan.

## 1936

Se ajustan 16830 de las 35497 casas y se conservan los 23101 árboles. Utiliza exactamente las matrices originales de 1911; las casas compartidas reciben la misma transformación, sin reducción acumulativa. Las excepciones de contorno y hitos se mantienen.

```sh
node tools/retiro-moderno.mjs 1936 fuentes/derivados/retiro1911 fuentes/derivados/retiro1936
```

## 1946

Se ajustan 19102 de las 45162 casas. Se conservan 22997 árboles del archivo general y los 538 árboles adicionales de expansión (48 ajustan su posición/radio). El informe de 1946 expresa sus polígonos a un metro por unidad: se convierten a píxeles del mosaico antes de buscar las manzanas.

El mapa produce `fuentes/derivados/1946/arboles-base.bin`; el retiro transforma también esos árboles y el paso `arboles-1946` publica el resultado. Cada salida tiene un único productor. El Silencio y los demás modelos históricos quedan fijos. No se cambia ninguna época anterior.

```sh
node tools/retiro-moderno.mjs 1946 fuentes/derivados/retiro1936 fuentes/derivados/retiro1946
npm run datos -- --desde retiro-1946
```
