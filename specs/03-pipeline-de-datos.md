# 03 · Pipeline de datos: del escaneo a la ciudad

Todo el 3D sale de **un plano base** (el más antiguo y detallado) más **planos posteriores calzados encima**. El trabajo pesado es offline, en `tools/*.mjs` (Node). Lo que sigue combina lo observado en los datos con lo *(inferido)* sobre cómo se generan.

## 0. Requisitos del plano base

El efecto funciona porque el plano de Glade (1867) **dibuja la ocupación interior de cada manzana**. El grabado distingue con convenciones de rayado:
- **rayado cruzado** = edificado,
- **rayado simple** = fondos, patios, huertas,
- papel = calle, plaza, baldío,
- símbolos de árbol = arboledas, quintas,
- agua = río con su línea de costa.

Para otra ciudad, el plano base ideal tiene escala de 1:5.000 o más detallada, manzanas con **edificado y patio** diferenciados, un escaneo de 10.000 px de lado o más y está en dominio público. Sin esa distinción se puede igual, pero lo edificado se inventa por reglas (ver §4).

## 1. Escaneo y teselado

- Fuente original de máxima resolución (Wikimedia Commons, BnF Gallica, LoC, bibliotecas nacionales).
- Recorte y enderezado (leve rotación, deformación del papel). Se definen `marco` (guarda) e `interior`.
- Generar LOD: 1024, 2048, 4096, 8192 y teselas de 3072 px (`f/{i}-{j}.webp`), WebP con calidad ~80.
- Elegir `plaza` (el píxel de la plaza fundacional) y medir `metro` con distancias conocidas (cuadras de largo conocido; en BA, ~130 varas). Validar contra OSM.

## 2. Segmentación (la máscara `suelo`)

Clasificar cada píxel del escaneo como **río / patio / edificado / calle**. *(Inferido: procesamiento de imagen clásico en Node — umbral de tinta, densidad y orientación del rayado por ventana, morfología — con correcciones a mano.)*

Salida: `suelo.webp` (R río, G patio, B edificado). El shader también la usa para pintar en color.

Consejo práctico para el nuevo proyecto: probar primero un **clasificador por textura** (filtros de Gabor u orientación del gradiente para distinguir rayado simple de cruzado). Si falla, pasar a **segmentación asistida** (SAM u otro modelo) y retocar a mano en un editor de capas. El trabajo manual es aceptable: se hace una sola vez.

## 3. Vectorización

- **Manzanas**: polígonos a partir de la máscara (todo lo que no es calle ni río), simplificados con Douglas‑Peucker → parte `manzanas`.
- **Lotes**: subdivisión sintética de cada manzana en lotes de frente angosto y fondo largo, perpendiculares a la calle (en BA, ~8,66 m de frente colonial; 17.143 lotes). *(inferido)* En Caracas: `tools/geo/lotes.py`, lotes rectos de 9–14 m de frente en el marco girado de cada manzana (ver `tools/geo/README.md`, «Los lotes»).
- **Alas (Caracas, `tools/geo/alas.py`, T33b)**: cada casa que da a una calle recibe su **marco** —el rectángulo del lote sin sus salientes, con el frente sobre la línea de fachada de la cuadra— y, si es de patio, sus **alas**. `repartir` corta el lote en bandas hacia el fondo: la crujía del frente (7–8,5 m, fijada por manzana; se acorta hasta un patio del plano que quede a menos de 3,5 m detrás), y después **patio** (4–6 m; con un ala lateral de 3,8–5 m contra una medianera, o con dos en el 60 % de los lotes cuyo ancho interior —sin las alas de esquina— es de 14 m o más; contra la calle de una esquina no va ala lateral: ahí está el ala de esa calle) y **ala cruzada** (5,5–7 m), alternados, hasta agotar los patios que le tocan (3 o 4 a menos de 700 m de la plaza, 2 o 3 hasta 1.500 m, 1 o 2 más lejos); lo que sobra al fondo es el **solar** (4 m o más; si no, el ala se lo queda). En una esquina, el ala de la otra calle tiene el fondo de la crujía (para el inglete); si el fondo da a otra calle, el lote se cierra con un ala y no con solar, y ahí —como en el tramo que va hasta un patio del plano— el tope de patios no rige: sin solar donde terminar, se siguen alternando patios y alas para que ninguna pase de 9 m de fondo. **Los patios que el plano sí dibuja** (huecos de 9 m² o más encerrados en la casa) se conservan donde están, con alas a sus costados. Quedan simples (marco sin alas) los lotes de menos de 7,5 m de ancho, los de menos de ~15 m de fondo y las casas que llenan menos del 80 % de su rectángulo. Todo determinista por la semilla de la casa. El vectorizador escribe además `patios-de-casas.png` (los patios y solares abiertos por regla), que `tools/suelo.mjs` descuenta de lo edificado. Formato en `specs/02`.
- **Edificado por lote**: intersección del lote con la máscara B → la(s) huella(s) construida(s). Cada huella → un **techo** (registro u16: posición, medidas, orientación, pisos, estilo, semilla).
- **Muros**: los bordes de las huellas que dan a la calle o a un patio → **muros** (fachadas y medianeras), con su largo y "desde dónde lo tapa el vecino" (para dibujar avisos en las medianeras que asoman).
- **Árboles**: detectar los símbolos de árbol (o rellenar las zonas de quinta con Poisson disk) → `arboles` (x, y, radio).
- **Iglesias**: detectadas o listadas aparte (`ciudad.json.iglesias`) para darles nave, torres y cúpula.

## 4. Completar lo que el plano no dice ("costumbres de la época")

Reglas deterministas con una **semilla por casa** (hash de su posición) para que el resultado sea estable:
- **Pisos**: 1 en la gran mayoría; 2 en el centro y en zonas de comercio; más altos, solo los hitos. Gradiente según la distancia a la plaza.
- **Estilo** (índice 0‑8 que usa el shader): `0 colonial · 1 italianizante · 2 francesa · 3 de comercio · 4 racionalista · 5 galpón · 6 casilla de chapa · 7 de las orillas · 8 rancho`. Depende de la época en que nace la casa y de la zona (centro, orillas, puerto, La Boca).
- **Techo**: azotea con pretil (colonial, italianizante), dos aguas (galpón, casilla, orillas, rancho), mansarda (francesa), terraza con casilla de tanque (racionalista de 5 pisos o más). Las faldas y mansardas son geometría real; el resto se pinta.
- **Tono** de fachada: cal blanca en la mayoría; crema, ocre claro, rosa viejo; paletas por estilo (La Boca con chapa de colores).
- **Fotos de referencia** (Gonnet 1864, la vista de pájaro de Dulin) para calibrar alturas y aspecto general.

## 5. Relieve

`relieve.bin`: grilla de alturas en dm. Fuente: un DEM (SRTM o Copernicus de 30 m, o mejor uno municipal) recortado al área del plano y **reproyectado al espacio de píxeles del plano** con la misma transformación de §6. Se suaviza: interesan la barranca y las lomas, no el detalle. *En Caracas esto es protagonista (valle, Ávila, quebradas).*

## 6. Calce de planos (georreferenciación)

Cada plano posterior y OSM se llevan al **espacio de píxeles del plano base**:
- Puntos de control (GCPs) en esquinas que no cambiaron: de decenas a cientos por plano.
- Transformación: thin‑plate spline o polinomio de orden 2‑3 (los planos antiguos tienen errores locales). El original reconoce que "en el centro calza con pocos metros de error; en las afueras, hasta algunas decenas".
- Herramientas: el Georeferencer de QGIS (exportar los GCPs) + un script propio que aplica la transformación a rasters (GDAL `gdalwarp -tps`) y a vectores.

## 7. Épocas (`tools/crece.mjs`)

Para cada plano posterior, ya calzado:
1. Segmentar (como en §2) → máscaras de urbanizado, fondos y edificado.
2. Comparar con la etapa anterior: lo que aparece **nace** en la etapa `e`; lo que desaparece (una casa bajo una avenida nueva, un árbol bajo una calle) **muere** en `e`.
3. Generar casas nuevas (techos y muros) para lo edificado nuevo, con el estilo de su época. Conteos de ejemplo: `casas: 21220, renovadas: 593` en 1888.
4. Texturas: `crece.webp` (desde cuándo existe cada cosa), `despeje.webp` (demolido / verde nuevo / calzada nueva) y `calles.webp` (pavimento: tierra → empedrado → adoquín → madera/asfalto, por calle y por año, según fuentes históricas).
5. `crece.pak` con los `manzanas, techos, muros` nuevos y `mueT/mueM` (vida de cada elemento: `nace + 8·muere`; 0 = desde siempre / nunca muere).
6. `crece.json` con metadatos y fuentes.

Las avenidas abiertas después (Av. de Mayo, diagonales, 9 de Julio) y los rellenos del puerto se dibujan **a mano** como polígonos con año, porque los planos no siempre coinciden entre sí.

## 8. Hitos (edificios con nombre): curado manual

Para cada edificio importante (`src/hitos.js`): nombre, año(s) en pie, `x,y` (píxeles), eje `ux,uy`, `largo`, `ancho`, `planta` (multipolígono en píxeles), `partes` (cuerpos con altura propia), tipo de techo, cúpula o torres, y tono. Se modelan **a partir de fotos de época**; ver `05`.

## 9. "Lo de hoy"

- Bajar de OSM (Overpass) las calles, las vías férreas y la costa del área.
- Transformarlas al espacio del plano (transformación inversa de §6).
- Rasterizar a `hoy-lejos.webp` (2048, solo avenidas, vías y costa) y `hoy-cerca.webp` (8192, todas las calles).
- `calles.bin/json`: segmentos con nombre para etiquetar en pantalla.
- `hoy.json`: hitos actuales con notas ("Acá estaba…").
- El rayado de "tierra ganada al río" = la tierra de OSM menos el río del plano base.

## 10. Empaquetado

Un script final escribe los `.pak` (cabecera JSON + byte shuffle + gzip nivel 9), los `.bin` y los `.webp`, y calcula el hash `?v=`.

## Checklist de calidad de datos

- [ ] Superposición del plano base con OSM: error menor a 10 m en el centro.
- [ ] Ninguna casa sobre una calle o el río del plano base.
- [ ] Cada elemento de época tiene `nace`/`muere` coherentes (no muere antes de nacer).
- [ ] Conteos por época razonables frente a los censos.
- [ ] Todas las fuentes con licencia compatible (dominio público / CC).
