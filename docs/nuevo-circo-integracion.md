# Nuevo Circo: integración del estudio de Miraflores

Tarea T82.NC, avance de #257. Geometría desde 1936 (índice 5), conservada en 1946
(índice 6); no aparece en 1772, 1843, 1889 ni 1911. Inauguración: 26 de enero de 1919.

## Fuentes y calce

- [Cámara de Caracas](https://camaradecaracas.com/la-camara-caracas-y-sus-historias/cronicas-de-la-ciudad/el-nuevo-circo-de-caracas/):
  fecha inaugural, autores, ruedo sin cubierta total ejecutada y reformas posteriores
  sin fecha suficiente para asignarlas automáticamente a nuestros cortes.
- [FAC, fotografía histórica](https://fundaayc.com/category/crono-arquitectura-venezuela/1910-1919/1919/):
  portada, dos torres, balcones y remates. No se copian sus imágenes al build.
- DCN 1936, mosaico del repo, recorte `(9900,7900)–(10700,8500)`: contorno circular,
  portada diagonal al noroeste, calles San Roque / San Mateo y jardín de San Martín.
  [Documento de procedencia](https://archive.org/details/WCWdb_18053).

Centro medido visualmente: `(10316,8234)` px. Eje local X `(-.83,.56)`; +Z apunta
al noroeste. Escala del mosaico 0,5 m/px. Lectura del diámetro exterior ~88–94 m;
se adopta 88 m para la envolvente procedural. Error estimado de lectura ±3 m,
no precisión catastral. La portada del estudio se retranqueó 4 m nominales y la
planta se escaló uniformemente por 1,10; las alturas no se escalaron.

No se presume permiso de redistribuir escaneos ni fotografías: se mantienen las
licencias de las fichas originales. Las capturas del PR muestran el sitio usando
los datos existentes y el modelo propio.

## Arquitectura y adaptación

`src/hitos/nuevo-circo-modelo.js` conserva el estudio de Miraflores: ruedo abierto,
graderío anular, cubierta solo de la grada alta, portada con dos torres y balcones.
Los detalles no medidos, alturas, materiales y pigmentos siguen siendo interpretativos.
No se inventa una fecha para la reducción del ruedo o ampliación de tendidos que
relata la fuente: el modelo no certifica esas fases interiores.

Se añade al final del catálogo para conservar las semillas de todos los hitos anteriores.
El adaptador usa el lienzo existente, colores lineales y una sola parte compartida
entre épocas. La cubierta tiene espesor y caras inferiores; no depende de DoubleSide.
Gradas con menor subdivisión angular mantienen las 21 filas del estudio. No hay
loader GLB, renderer adicional ni una nueva llamada de dibujo por edificio.

## Solar, relieve y vida

La reserva es la unión de círculo y portada, no una manzana completa. El modo
`solarCompleto` significa intersección estricta con **esos polígonos**: elimina
casas que atraviesan el muro aunque sea menos del 25 % de su huella. Casas sin
intersección se conservan. La misma reserva temporal excluye árboles.

Las colisiones usan 64 sectores de corona y portada, dejando libre el ruedo.
La terraza de 88 × 90 m incluye la portada: aplica el sistema existente
de apoyo en el plano de la ladera y evita que el suelo tape el ruedo. Una plataforma de pavimento cubre todo el rectángulo para evitar huecos; su acabado
es interpretativo. No amplía los polígonos que reservan casas y árboles. El calce fino de 1946 sigue pendiente;
se conserva la implantación de 1936 sin afirmar una medición independiente.

## Instalación y datos

El edificio queda registrado en `hitos.js`, `partes.js` y enlazado a la marca
`nuevo-circo`. El runtime recorta las vidas de casas/árboles con las reservas,
por lo que se comprueba contra el mismo paquete publicado usado en main.

Al regenerar el pipeline, `hitosConPlanta()` transmite también la reserva al
ensamblador de manzanas. Los pasos que incluyen `CODIGO_HITOS` quedan invalidados:
no se modifica a mano `ciudad.pak` ni se publica un manifiesto simulado. Antes de
publicar un próximo release se deben regenerar las salidas dependientes y comparar
las seis épocas. Este PR no publica nuevos datos.

## Validación

- Tests de registro, geometría finita, vida 5–6, reserva temporal, vecinos,
  ruedo transitable y plataforma del solar.
- Capturas antes/después con la misma cámara en seis épocas, datos iguales.
- Presupuesto geométrico: 26.398 triángulos nuevos; total antes de 1946 524.548
  (límite explícito 530.000); incluyendo El Silencio 999.589, dentro del millón.
- Build: entrada 335,1 kB gzip, worker 156 kB. Límite de entrada 332 → 336 kB
  declarado por la geometría y metadatos añadidos; worker permanece bajo 160 kB.
- Medición del navegador en base y rama con el script del repo; el PR incorpora
  las salidas y sus limitaciones. Sin GPU no se certifican FPS.

Pendientes para cerrar #257: contrastar el solar con el documento de 1946,
precisar reformas interiores, alturas y color con evidencia, y revisión humana
cartográfica. No presentar la interpretación procedural como un levantamiento.

[Mediciones completas de main y rama](mediciones/nuevo-circo/README.md), incluyendo excesos y limitaciones.
