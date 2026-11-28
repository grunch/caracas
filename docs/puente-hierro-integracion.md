# Puente de Hierro y adaptador de puentes

Avance de [#272](https://github.com/grunch/caracas/issues/272): el primer puente del Guaire que se ve en el mapa.
Trae tres cosas: el calce ([`puentes-guaire-calce.md`](puentes-guaire-calce.md)), el mecanismo para poner un puente
en la malla de los hitos, y el Puente de Hierro de 1875 en 1889, 1911 y 1936. No cierra el issue.

## Por época

| Época | Qué se ve |
|---|---|
| 1772, 1843 | Nada: el puente no existe |
| 1889, 1911 | El puente de 77,4 m con sus nueve apoyos, sobre el cauce abierto de cabeza a cabeza |
| 1936 | La misma estructura. El tramo norte va a ras, sobre un terraplén: el plano dibuja dos edificaciones pegadas a la calzada y se conservan. El cauce es más angosto, para no pisar la manzana del oeste. Se ven seis apoyos |
| 1946 | Nada: lo sustituyó otro puente en 1937, sin alzado. La marca y la ficha siguen; no se reserva un vacío |

## El mecanismo

Un puente no se ancla al relieve vértice a vértice como una casa. Tiene tres piezas:

1. **Rasante común** (`p.rasante(desde, hasta)` en `src/hitos/lienzo.js`; modo `APOYO.RASANTE` en
   `src/hitos/material.js`). El ancla de cada vértice son las dos cabezas, y su piso es la recta entre la cota del
   suelo en una y en la otra. Tablero, vigas, barandas y faroles quedan a la altura del estudio sobre esa recta: no
   se deforman.
2. **Apoyos por separado** (`src/hitos/puente.js`). El modelo trae un grupo por apoyo. El pie de cada uno va con el
   suelo que tiene debajo (`APOYO.SUELO`), hundido lo que mide el lecho ahí, y la columna cubre lo que falte hasta
   la rasante. Una pila con menos de 2 m de lecho quedaría enterrada: no se dibuja. Los estribos van siempre.
3. **Lecho propio.** El relieve del sitio no trae el cauce del Guaire: bajo el puente el terreno baja 0,3 m. El
   puente trae un cuenco verde con la franja del río (`sueloDelPuente`), y el suelo de la ciudad se abre ahí
   (`sueloPropioPorEpoca`, `src/hitos/suelos-propios.js`).

El lecho y la rasante empalman con el suelo **tal como se dibuja** (`sueloDibujado` en `src/relieve.js`): la hoja
es una malla de cuadros de 24 m, o de 96 m sin GPU, y entre vértices se aparta decímetros del relieve fino.
`src/main.js` le pasa el tamaño del cuadro al material (`ponerMallaDelSuelo`).

El tablero es parte de la malla de los hitos. No depende de los techos de las casas.

## Cómo sumar el próximo puente

En `src/hitos/datos/puentes-guaire.js`:

```js
const marco = marcoDeCabezas([[xNorte, yNorte], [xSur, ySur]]) // píxeles del mosaico, del calce
export const puenteSucre = Object.freeze({
  id: 'puente-sucre', ...marco, cabezas, nace: 3, muere: 5, planta: [],
  suprimePorEpoca: cauces, sinArbolesPorEpoca: cauces, sueloPropioPorEpoca: cauces,
  partes: [
    { tipo: 'puente', id: 'sucre', anio: 1889, capa: 'estructura', largo: marco.largo, nace: 3, muere: 4 },
    { tipo: 'puente', id: 'sucre', anio: 1889, capa: 'cauce', largo: marco.largo, vano, anchoCauce, agua, nace: 3, muere: 4 },
  ],
})
```

- `id` y `anio` eligen la estructura del catálogo (`estadoPuente`). Si esa época no tiene alzado (`modelo: null`),
  la parte no dibuja nada.
- `largo`: la distancia entre cabezas. Solo donde el largo del estudio es interpretativo; uno documentado no se toca.
- `capa: 'estructura'` (tablero y estribos) y `capa: 'cauce'` (lecho y pilas) permiten cambiar el cauce de una época
  a otra sin repetir la estructura. Sin `capa`, la parte dibuja todo.
- `vano` = [desde, hasta] en metros desde el centro; `anchoCauce`; `agua` = la franja del río sobre el eje.
  `sesgoAgua`, si el río cruza en diagonal: metros que se corre la franja a lo largo por cada metro a lo ancho.
- `aRas` y `anchoRas`: un tramo a ras sobre terraplén. Hay que sumar su rectángulo a `sueloPropioPorEpoca`.
- Sumarlo a `puentesGuaire` y poner `hito: '<id>'` en su marca.

Un puente de un solo vano (Sucre, Dolores) no tiene pilas: el cauce solo dibuja el lecho.

## Qué es interpretativo

- **El lecho.** Su forma, su fondo de 5 m y su ancho (31 m; 22 m en 1936) no están medidos. La franja de agua va donde el plano
  de 1936 dibuja el río sobre el eje. El río de los lados es el que pinta el suelo, a ras: en el borde del cuenco
  el agua baja 5 m en talud.
- **El largo**, 77,4 m: el del símbolo de Mestre (±3 m). El estudio traía 90 m nominales.
- **Ancho, altura, espesores y colores:** nominales del estudio de Miraflores.
- **El tramo a ras de 1936:** una decisión para conservar lo edificado al lado, no un dato del plano.

Documentado: el puente de 1875, sus nueve apoyos intermedios, las vigas inferiores, las columnas y las barandas
(Silva Contreras, pp. 32–34 y 40), y la sustitución de 1937 (FAC).

## Reserva

- **Casas:** solo el cauce abierto bajo el tablero: 79 × 31 m en 1889 y 1911, 52 × 22 m en 1936. Con los datos del
  release `datos-2026-11-27-eb21bf8` no le cambia la vida a ninguna casa en ninguna época.
- **Árboles:** la huella y los accesos, con la vida del puente. A los lados del cauce, 9,5 m más (lo que mide una
  copa grande: plantada al borde, tapa el tablero); en cada acceso, la calzada (9 m) hasta 12 m más allá de la
  cabeza. En 1936 el margen es de 3 m y, junto al tramo a ras, solo la calzada: los árboles de los patios vecinos
  no se tocan. Con el release actual se retiran ocho árboles, todos anteriores a 1889.
- **Colisión:** ninguna. El puente se cruza.

## Manzanas

Ningún hito va encima de una manzana. Medido sobre el suelo de manzanas del release (`public/plano/suelo-manzanas*.png`,
distancia firmada al borde de cada manzana), cada metro a lo largo y cada medio metro a lo ancho:

| Época | Tablero, cabezas y accesos (9 m de ancho) | Cauce |
|---|---|---|
| 1889 | A más de 16 m de toda manzana | A más de 16 m |
| 1911 | A más de 16 m | A más de 16 m |
| 1936 | Fuera: la más cercana queda a 1,2 m | Fuera: a 1,2 m |

En 1936 el cauce de 31 m entraba hasta 2,1 m en la manzana del oeste. Por eso en esa época mide 22 m, con el talud
más corto. Las dos edificaciones del lado este quedan a 1,2 m del terraplén: no se pisan, pero están pegadas.

## Límites

- Sin GPU el suelo es una malla de 96 m. El lecho empalma con él, pero las casas vecinas siguen apoyadas en el
  relieve fino.
- El puente sustituto de 1937 queda pendiente. Constitución y Sucre metálico:
  [`puente-sucre-integracion.md`](puente-sucre-integracion.md). Dolores y Restaurador (1911), y por qué no el 19 de
  Diciembre ni el Ayacucho: [`puentes-cruces-integracion.md`](puentes-cruces-integracion.md).
