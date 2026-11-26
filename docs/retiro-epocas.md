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
