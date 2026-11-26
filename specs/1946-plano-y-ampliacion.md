# Época 1946: plano DCN y continuidad urbana

Tarea T40d, continuación de #219. La línea de tiempo ofrece **1946**, sustituyendo
la vista parcial1945. El Silencio conserva su fecha histórica de inauguración1945.

## Fuente y alcance

[Plano de Caracas, University of Alberta / Internet Archive](https://archive.org/details/WCWdb_18051),
carpeta `fuentes/mapas/1950-archiveorg-plano-de-caracas-dcn`. El título impreso indica
fotografías aéreas de1946 y escala1:10.000. El catálogo fecha la edición hacia1950;
no prueba que todo lo dibujado estuviera terminado en1946. Se conserva la ficha y su
licencia no declarada, sin atribuirle dominio público.

La Ciudad Universitaria aparece «en construcción». Las vías dibujadas pueden ser
proyectos o incorporaciones posteriores. No se modelan como terminadas la autopista
ni la Ciudad Universitaria a partir de esta sola hoja. La fecha1946 corresponde
al levantamiento aéreo, no a una certificación de cada detalle de la edición.

## Georreferenciación

Se usan40 cruces de la cuadrícula impresa y el marco métrico del plano1936.
`tools/geo/gcp/1946-cuadricula.json` permite repetir el calce TPS. Validación dejando
un punto fuera: RMS2,07m, percentil90 de3,53m y máximo5,06m. Cinco hitos independientes
(Bolívar, Panteón, Pastora, Teatro Municipal y plaza Sucre) dan RMS3,36m;
la lectura manual tiene incertidumbre aproximada de4 píxeles del original.
El raster queda a1m por píxel en el marco común y se publica en tres resoluciones.

## Qué se conserva y qué se infiere

Los ocho arreglos originales de la ciudad se mantienen íntegros como prefijos:
vertices, techos, vida, historia, marcos, alas, vuelos y paletas. Toda casa añadida
nace en el índice6; las seis épocas anteriores mantienen geometría y vida.
Una manzana que contenga alguna casa anterior se conserva entera. Este paso no
inventa demoliciones ni densificación sobre el centro ya construido.

El relleno amarillo identifica sectores edificados, no un catastro de viviendas.
En los sectores nuevos se generan crujías bajas de1–2 pisos, frente orientativo14m
y fondo8m. **Cantidad, división, altura, colores y árboles son interpretativos**;
no se presentan como un censo histórico. Las geometrías se recortan dentro de cada
contorno y se sustraen entre sí para no superponerse. Se excluyen los hitos y
reservas aproximadas de hospitales, estadios, hipódromo, cementerio y universidad.
Los polígonos de reserva están en `tools/geo/referencias/1946-reservas.json`.

El nuevo suelo y los árboles se cargan al elegir1946. El canal alfa de una copia
del campo de crecimiento distingue suelo, techo y jardín sin añadir un sampler
al shader. Las épocas anteriores usan los canales RGB originales sin cambios.
Los árboles antiguos bajo techos nuevos dejan de existir desde1946.
En color se oculta la rotulación impresa; tinta y el visor conservan el documento.

## Regeneración e instalación

Desde la raíz de caracas, con los originales, los derivados anteriores y dependencias:

```sh
.venv/bin/python tools/geo/mapa_1946.py
node tools/empacar-ciudad.mjs fuentes/derivados/1946/ciudad-1946.json
node tools/planos-epocas.mjs
node tools/creditos.mjs
npm run datos -- --verificar
npm run dev
```

El pipeline normal `npm run datos` incluye el paso `mapa-1946` antes de empacar.
`--reusar-calce` sólo sirve para iterar sobre una salida existente; la regeneración
completa debe ejecutar el comando sin esa opción. No modificar archivos enlazados
a otro checkout. Los binarios no entran en git: deben viajar con el paquete de datos
completo y su manifiesto. Una rama de código sin los datos nuevos no basta.

## Validación y límites

`specs/reglas/1946/continuidad.json` registra igualdad exacta de los ocho prefijos y
solapes entre casas nuevas mayores a0,05m². Los tests Python comprueban máscara,
contención, determinismo y reservas; Vitest comprueba vida6 y retirada de árboles.
Playwright comprueba selección1946, apertura del documento, invisibilidad de
El Silencio en1936 y recuperación tras un error del worker.

Esto no declara cerradas R1–R12 de T82: faltan censos, anchuras de calle y un catastro
para certificar todas las tipologías. La conservación exacta demuestra ausencia de
regresiones de datos anteriores; no corrige defectos históricos previos.

## Salida comprobada

La salida final contiene9.665 casas nuevas en934 componentes edificados y538árboles.
Se reservaron371 componentes;2.015 con tejido anterior se dejaron intactos.
Pruebas tras sincronizar `main`69a2ea2:1.773unitarias y1.016Python pasan.
Los informes de rendimiento completos están en `specs/reglas/1946/rendimiento-*.json`;
se repitieron secuencialmente con GPU, sin la suiteE2E concurrente. El paquete de datos y la muestra se publicaron como
[datos-2026-11-26-751318f](https://github.com/grunch/caracas/releases/tag/datos-2026-11-26-751318f).
