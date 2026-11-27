# Hospital Vargas — issue #249

**Estado de esta integración:** modelo arquitectónico enlazado a la marca y ficha que ya existían en `main`. El issue permanece abierto: faltan ubicar y documentar las ampliaciones de 1939, si las fuentes permiten hacerlo.

## Evidencia y fechas

- El [plano de Vicente S. Mestre de 1889](https://commons.wikimedia.org/wiki/File:Plano_topografico_de_la_ciudad_de_Caracas,_levantado_en_1889_vajo_la_direccion_-_del_general_don_Vicente_S._Mestre_-_btv1b53027837n.jpg), n.º 43, muestra dos alas de pabellones, un núcleo central y galerías longitudinales. El calce local de 1889 a 1936 usa 479 puntos de control y reporta RMS LOO de 7,64 m.
- La [Guía de Caracas](https://guiaccs.com/obras/hospital-vargas/) describe un edificio de una planta, eje norte-sur, acceso oeste, alas de hombres y mujeres y cinco salas por fila separadas por jardines.
- Roger Escalona, [Sociedad Venezolana de Historia de la Medicina](https://revista.svhm.org.ve/ediciones/2006/1-2/art-3), distingue la inauguración del 1 de enero de 1891 de la admisión de pacientes desde julio. Por eso la marca ya existente continúa indicando «en construcción» para 1889 y el hito no aparece en épocas anteriores.
- El grabado del [Cojo Ilustrado de 1-1-1892](https://www.libroria.com/museo/obras/El%20Cojo%20Ilustrado/1892/pdf/CI_18920101.pdf), p. 12, documenta una galería hospitalaria interior; no es una elevación completa de la fachada.
- [Caracas en 450](https://banesco-prod-2019.s3.amazonaws.com/wp-content/uploads/Caracas-en-450.pdf) resume la sustitución, desde 1930, de techos ojivales de madera por platabandas. El modelo cambia a cubierta plana en 1936 y la conserva en 1946.

Las ampliaciones de los pabellones Carlos J. Bello, Ángel Larralde y de lactantes se fechan en 1939 en una fuente médica de 1953, pero no se ha encontrado una planta que los sitúe inequívocamente. No se añadieron como volúmenes geolocalizados. Las fotografías y el grabado se enlazan como referencia; no se descargaron ni redistribuyeron. La licencia de la imagen de 1892 no está verificada.

## Integración en Caracas

- `src/hitos/datos/hospital-vargas.js` define la huella (100 × 270 m nominales) en el sistema de píxeles de 1936, centrada aproximadamente en (9796, 4503). La ubicación se derivó de la planta de Mestre y del TPS existente. Estas dimensiones son interpretativas, no catastrales.
- `src/hitos/hospital-vargas.js` construye los pabellones en la malla común. Las filas, vanos y galerías simplifican las fuentes; el esquema de 1889 representa la planta que el plano dibuja, no afirma que toda la construcción estuviera terminada.
- `src/hitos/datos/civiles.js` y `src/hitos/partes.js` enlazan el hito con el render, el tiempo y la marca existente `hospital-vargas`; no duplican su ficha ni su cronología.
- La reserva del solar suprime las casas genéricas y árboles dentro del recinto desde 1889, manteniendo intactas las manzanas exteriores. La colisión peatonal se limita a los cuatro pabellones y al núcleo; jardines y corredores quedan transitables.
- `tests/unit/hospital-vargas.test.js` verifica registro único, fases, aparición desde 1889, reservas y geometría finita. `tests/unit/hitos.test.js` incluye el suelo del pabellón en la verificación de apoyos sobre el relieve.
- El conjunto añade 4.800 vértices (2.376 triángulos; ~0,43 MB de atributos CPU), integrado en la malla de hitos compartida.

El hito reconstruye el núcleo y las cuatro filas de salas legibles en 1889. Los edificios que aparecen alrededor en los mapas posteriores siguen como unidades del plano; no se declaran ampliaciones hospitalarias sin una identificación documental del predio.

## Capturas

Las capturas comparables de 1889, 1911, 1936 y 1946 se adjuntan en [`docs/capturas/hospital-vargas/`](capturas/hospital-vargas/) con la misma cámara. Cada año muestra la planta de pabellones; 1936 y 1946 muestran las cubiertas planas descritas por la fuente histórica. `perspectiva-1911.png` muestra las galerías y fachadas desde un ángulo bajo.

## Límites

La planta general deriva del plano de 1889, pero alturas, espesores, materiales, medidas de cada pabellón y diseño de fachada son esquemáticos. La fuente médica de 1953 y las fotografías posteriores no bastan para geolocalizar las ampliaciones de 1939 ni para asignarles una forma individual. El issue #249 no se cierra por esta integración parcial.
