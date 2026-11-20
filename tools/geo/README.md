# tools/geo · pipeline del plano DCN 1936

Del escaneo de las dos hojas del plano de la Dirección de Cartografía Nacional (1936, 1:5.000)
a la ciudad en 3D. Todo corre offline, desde la raíz del repo, con el entorno de Python de
`tools/geo/requirements.txt` (`python -m venv .venv && .venv/bin/pip install -r tools/geo/requirements.txt`)
y Node (`npm ci`). Los datos (originales y derivados) no van a git.

Entradas: `fuentes/mapas/1936-archiveorg-caracas-dcn-hoja{1,2}/original.tif` (TIFF sin comprimir).

## Todo de una vez

```sh
npm run datos                  # solo los pasos viejos (como make), verifica conteos y escribe el manifiesto
npm run datos -- --desde costura   # fuerza un paso y todo lo que le sigue
npm run datos -- --forzar          # todo desde cero
npm run datos -- --verificar       # solo verifica conteos (tools/datos-esperados.json) y rehace el manifiesto
npm run datos -- --marcar          # da los datos actuales por generados con el código actual (sin correr nada)
```

`tools/datos.mjs` define los pasos de abajo con sus entradas, salidas y código; un paso corre si le falta
una salida, si alguna entrada es más nueva, si la produce un paso que corre o si **cambió su código**
(se compara el sha256 de sus scripts con el guardado en `.cache/datos/firmas.json`, no la fecha: un
`git checkout` le cambia la fecha a todo). La primera vez no hay firmas y corre todo; si los datos ya
están al día, `--marcar` las guarda sin correr nada. Las teselas de `public/plano/f/` y
`public/datos/ciudad.json` son salidas del paso `plano`. Al final compara los conteos
con `tools/datos-esperados.json` (sale con error si se van de la tolerancia) y escribe
`public/datos/manifiesto.json` con el sha256 de cada archivo publicado. La plaza se lee de `mosaico.json`.

## Pasos

```sh
PY=.venv/bin/python
D=fuentes/derivados/1936

# 1. cuadrícula: cruces de la cuadrícula de 500 m de cada hoja (GCP) y muestras de sus líneas
#    → tools/geo/gcp/1936-hoja{1,2}.json y 1936-hoja{1,2}-lineas.json (van a git)
$PY tools/geo/cuadricula.py --semillas tools/geo/gcp/semillas-1936.json --hoja 1936-hoja1
$PY tools/geo/cuadricula.py --semillas tools/geo/gcp/semillas-1936.json --hoja 1936-hoja2

# 2. mosaico: rectifica las dos hojas a 0,5 m/px, norte arriba, costura vertical en x = +1720 m
#    → $D/mosaico.tif, mosaico.json, mosaico-vista.jpg, qa-cuadricula.jpg
$PY tools/geo/mosaico.py --config tools/geo/mosaico-1936.json

# 3. segmentar: clases de suelo (códigos en segmentar_clases.py)
#    → $D/segmentacion/mosaico/{clases.png, suelo.png, arboles.json, debug.jpg, meta.json}
$PY tools/geo/segmentar.py $D/mosaico.tif $D/segmentacion/mosaico --escala 0.5

# 4. costura: rellena la franja que no cubre ninguna hoja (ver abajo); los originales quedan
#    → $D/mosaico-costura.tif, $D/costura-mascara.png, $D/costura.json, $D/qa-costura.jpg
#      y $D/segmentacion/mosaico/clases-costura.png
$PY tools/geo/costura.py --mosaico $D/mosaico.tif --meta $D/mosaico.json \
    --clases $D/segmentacion/mosaico/clases.png

# 5. vectorizar: manzanas → lotes rectos (lotes.py) → techos, marcos y alas (--plaza = "plaza" de mosaico.json, en píxeles)
$PY tools/geo/vectorizar.py $D/segmentacion/mosaico/clases-costura.png $D/ciudad-1936.json \
    --escala 0.5 --plaza 8968.2,6839 --patios $D/patios-de-casas.png

# 6. empacar: techos → public/datos/ciudad.pak
node tools/empacar-ciudad.mjs $D/ciudad-1936.json

# 6b. árboles: a los símbolos detectados (arboles.json) se suman los de los canteros de plazas y patios,
#     que el plano dibuja como manchas verdes sin símbolo (jardines.json); después cada uno recibe la
#     época en que aparece (public/plano/crece.png + ciudad.pak) → public/datos/arboles.bin (specs/02)
$PY tools/geo/jardines.py $D/segmentacion/mosaico/clases-costura.png $D/segmentacion/mosaico/arboles.json \
    $D/segmentacion/mosaico/jardines.json
node tools/arboles.mjs $D/segmentacion/mosaico/arboles.json $D/mosaico.json $D/segmentacion/mosaico/jardines.json \
  $D/segmentacion/mosaico/clases-costura.png   # + el monte: los árboles silvestres (crece.png G y B)

# 7. suelo: máscara RGBA para el modo color (R agua · G vegetación · B edificado · A manzana)
node tools/suelo.mjs $D/segmentacion/mosaico/clases-costura.png $D/patios-de-casas.png
# 7b. rótulos: la tinta del plano que es letra, cifra o símbolo (nombres, cotas, letras de parroquia,
#     el punteado del tranvía) y no dibujo → $D/segmentacion/mosaico/rotulos.png (255 = rótulo), y de
#     ahí la textura de un canal del modo color: public/plano/rotulos.webp (4096) y rotulos-2k.webp
$PY tools/geo/rotulos.py $D/mosaico-costura.tif $D/segmentacion/mosaico/rotulos.png --escala 0.5
node tools/rotulos.mjs $D/segmentacion/mosaico/rotulos.png
# 8. plano: LOD y teselas del mosaico cosido → public/plano/, y bloque "plano" de public/datos/ciudad.json
node tools/plano.mjs $D/mosaico-costura.tif $D/mosaico.json

# 8. calce con el mundo: cuadrícula 1936 ⇄ UTM 19N con los puntos de control OSM de
#    gcp/1936-wgs84.json (px/py en el mosaico; reescribe transformación y residuos)
.venv/bin/python tools/geo/gcp1936.py --modelo similitud

# 9. relieve: DEM Copernicus GLO-30 (lo baja si falta) → public/datos/relieve.bin (930×740, 10 m),
#    sin edificios y corregido con las cotas del plano (gcp/1936-cotas.json)
.venv/bin/python tools/geo/relieve.py --dem /tmp/Copernicus_DSM_COG_10_N10_00_W067_00_DEM.tif

# 10. lo de hoy: calles, rieles y agua de OSM (Overpass, una consulta; caché en fuentes/derivados/hoy/osm.json,
#     se baja solo si falta o con --descargar) → public/plano/hoy-lejos.webp (2048), hoy-cerca.webp (8192),
#     public/datos/calles.json y calles.bin (formatos en specs/02). Con --qa: recorte del centro con OSM
#     en rojo y el desfase medido contra las calles de la segmentación (qa-hoy.jpg + qa-hoy.json).
.venv/bin/python tools/geo/hoy.py --qa fuentes/derivados/hoy/qa-hoy.jpg
```

En `npm run datos` son los pasos `hoy-osm` (solo asegura la caché: la única descarga del pipeline, así que
después corre sin red) y `hoy`. `npm run datos -- --descargar` vuelve a pedirle a Overpass. Datos ©
colaboradores de OpenStreetMap, ODbL (`fuentes/datos/osm-hoy/ficha.json`).

El calce y las cotas se midieron sobre `mosaico.tif`; `mosaico-costura.tif` tiene la misma geometría
(solo rellena la franja de la costura), así que valen para los dos. `geo1936.py` es el módulo para
llevar cualquier dato de OSM o WGS84 al plano (`wgs84_a_grid`, `grid_a_px`) y al revés.

Los pasos 1–3 son lentos (minutos); la costura tarda ~20 s, el vectorizador ~45 s y el plano ~1 min.
Si cambia el mosaico (paso 2) hay que repetir todo lo que sigue.

## Los lotes (paso 5)

`lotes.py` parte cada manzana en solares rectos. La mira en su propio marco (girada según la
dirección dominante de sus lados, con el lado largo a lo largo): a los dos lados cortos dan lotes
de 20–26 m de fondo y el resto da a los lados largos, en tiras que llegan hasta la mitad de la
manzana (o la cruzan, si mide menos de 20 m). Los frentes van de 9 a 14 m, al azar con la semilla
de la manzana. Una casa es lo edificado de un lote: si la manzana está toda edificada en el plano,
las casas salen largas, pero rectas. Las tiras de menos de 3 m de ancho y los pedazos de menos de
30 m² se unen a la casa vecina.

**Casas de patio** (`alas.py`, dentro del paso 5): cada casa que da a una calle recibe su marco (el
rectángulo del lote, con el frente sobre la línea de fachada de su cuadra) y, si el lote da para
patios, sus alas: crujía al frente, patios con alas laterales, alas cruzadas y solar. Van en
`ciudad-1936.json` como `marcos` y `alas` (`specs/02`, `specs/03` §3). Con `--patios <png>` el
vectorizador deja además la máscara de los patios y solares que abrió por regla
(`patios-de-casas.png`), que `tools/suelo.mjs` descuenta de lo edificado.

Las hileras angostas que siguen una calle curva (sin dirección dominante, menos de 15 m de grosor
y que llenan menos de la mitad de su rectángulo mínimo) conservan el método anterior: semillas
cada 12 m sobre el borde y cada punto a la más cercana. Ese método, en las manzanas macizas,
daba cuñas que se juntaban en el centro.

Límites: en una manzana con un lado en diagonal los lotes siguen la dirección dominante, no esa
calle; donde dos manzanas quedaron pegadas por la segmentación, se reparten como una sola.

## La costura (paso 4)

Las dos hojas no se tocan: entre la hoja 1 (cortada por el escaneo) y la hoja 2 (borde del
papel) queda una franja casi vertical, justo al este de x = +1720 m, que `mosaico.py` deja en
papel liso `#f1e6cd`: casi nula al norte, ~20–25 m a la altura de la Plaza Bolívar y ~80 m en
el borde sur del marco. Sin rellenar, la segmentación la ve como calle y en 3D aparece una
avenida N–S que no existe.

`costura.py`:

1. **Hueco por fila**: píxeles exactamente color papel a ±200 px de la columna de la costura,
   agrupados en componentes grandes (es la máscara sin datos de `mosaico.py`). Se ensancha
   6 px por lado (borde mezclado y borde roto de la hoja 2) y, solo en clases, sobre las
   manchas de "cerro" que la segmentación pegó a la franja (hasta 60 m). Solo dentro del marco.
2. **Clases**: con la columna de clases a cada lado del hueco se estima, por ventanas de filas,
   el corrimiento vertical que mejor empareja los dos lados (las calles E–O cruzan oblicuas).
   Lo que casa a los dos lados y es calle o la clase de fondo del lugar cruza la franja entera
   (calles continuas, manzanas cerradas); lo demás (casas sueltas) entra a lo sumo 5 m desde su
   lado y el resto toma el fondo. Al final, un filtro de moda 5×5 dentro del hueco.
3. **Imagen**: cada clase se pinta con su color mediano a cada lado (variando a lo largo de la
   costura y fundiendo de oeste a este), grano de papel, borde de tinta entre calle y manzana y
   rayado en los edificios públicos.
4. **Máscara** `costura-mascara.png` (mismo tamaño que el mosaico): 255 = imagen y clases
   reconstruidas, 128 = solo clases, 0 = original. Sirve para mostrar lo reconstruido como tal.

Límites: es una reconstrucción plausible, no un dato. No inventa rótulos, cotas, árboles ni
curvas de nivel; donde los dos lados no casan (un tramo de calle corrido más de ~15 m entre
hojas) la calle puede quedar cortada; en el sur, donde la franja es ancha y el caserío disperso,
las manzanas reconstruidas son genéricas.

## Calce de los planos viejos sobre 1936 (`calce.py`)

La línea de tiempo se construye hacia atrás desde 1936: cada plano viejo se lleva a la grilla
del mosaico (0,5 m/px). Necesita `clases-costura.png` y `mosaico-costura.tif` (pasos 3 y 4).

```sh
for m in 1911-princeton-plano-de-caracas-razetti 1889-bnf-mestre \
         1843-nypl-jesurun-facsimil-muller-stapler 1772-pares-agi-exato-mapa; do
  $PY tools/geo/calce.py $m        # ~15 s a ~1 min cada uno
done
# → fuentes/derivados/<año>/calzado.tif (RGBA, alfa 0 fuera del plano), calzado.json, qa-calce.jpg
#   y los GCP con su residuo en tools/geo/gcp/calce-<carpeta>.json (van a git)
```

Para 1919 se usa el Razetti de **1911** (Princeton): dibuja las manzanas en gris liso; el de 1919
(UMN) las dibuja vacías y no deja segmentar lo construido. El Pimentel de 1578 no se calza (es un
esquema): se codifica a mano en `tools/geo/epocas/`.

Cómo funciona:

1. **GCP manuales**: las cuatro esquinas de la Plaza Bolívar (Principal, La Torre, Gradillas,
   Monjas) leídas a ojo en cada plano (`semillas`, por índice de esquina) y en 1936
   (`gcp/plaza-1936.json`), más `anclas` sueltas si hacen falta. El *Exato mapa* de 1772 está
   girado 90° (el poniente arriba): las semillas ya lo resuelven.
2. **Callejidad**: cada plano se reduce a ~2 m/px y a una imagen 0–1 de "es calle" con un
   `perfil` de color (umbrales en CIELAB/HSV; `alguna` = máximo, `condiciones` = producto).
   En 1936 es la clase *calle*. `marco` y `excluir` sacan leyendas y cartelas.
3. **Etapas** (de la plaza hacia afuera, de grueso a fino: radio 0,7 → 4,5 km, ventanas de 140 →
   100 m, búsqueda ±40 → ±12 m): el plano viejo se deforma con el calce actual, en una malla de
   puntos se busca por correlación normalizada el corrimiento entre las dos redes de calles y
   cada pico nítido es un GCP automático. La búsqueda es menor que media manzana, así que no se
   salta a la calle vecina.
4. **Depuración**: se quitan los GCP automáticos con residuo dejando uno fuera (fórmula de Rippa,
   sin reajustar n veces) mayor que `umbral_residuo_m`; se reajusta el TPS (`tps.py`, con
   `suavizado`) en los dos sentidos.

### 1578: el esquema de Pimentel (`epocas_1578.py`)

```sh
$PY tools/geo/epocas_1578.py
# → fuentes/derivados/1578/ciudad-1578.json (65 casas + los 100 solares con su estado) y qa-1578.jpg
```

`tools/geo/epocas/1578-pimentel.json` es la lectura a mano del dibujo: 5 × 5 manzanas con la
plaza al centro y 4 solares cada una (casa, vacío, iglesia, cabildo, convento, plaza); cada
manzana lleva su índice real desde la Plaza Bolívar. Las esquinas de esas 25 manzanas se buscan
en la máscara de calles de 1936 (desde la plaza hacia afuera, ajustadas al cruce más cercano);
cada manzana se parte en cuatro solares y en cada "casa" va una casa de un piso, de 8 m de
fondo, sobre la calle del norte o la del sur, con el corral atrás.

### Épocas: desde cuándo existe cada casa (`epocas.py`)

Después de los calces y de `epocas_1578.py`:

```sh
$PY tools/geo/epocas.py
# → fuentes/derivados/epocas/ciudad-epocas.json (ciudad-1936.json + casas de 1578 + "vida"),
#   crece.json, crece.png (R edificado, G urbanizado, B el monte: tools/geo/valle.py), qa-<año>.jpg y
#   qa-urbano-<año>.jpg; copia crece.json a public/datos/ y crece.png a public/plano/
node tools/empacar-ciudad.mjs fuentes/derivados/epocas/ciudad-epocas.json   # ciudad.pak con la parte vida
```

En cada plano calzado se segmenta lo edificado por color, con un perfil por plano en
`tools/geo/epocas/epocas.json`: rojo en 1772, rayado en 1843, durazno en 1889, gris en 1911.
Después se aplica una apertura para borrar vías y marcos, un cierre para tapar rótulos y se quitan
las manchas chicas y las componentes angostas; la máscara se ensancha unos metros para absorber el
error del calce.

Cada huella se mide entera, aunque otro techo la pise (los polígonos del vectorizador pueden
encimarse). Una casa "está" en una época cuando al menos la mitad (≥ 50 %, `umbral` de
`epocas.json`) de su huella cae en lo edificado de esa época.

- **Casas de 1936**: nacen en la primera época (1772…1911) desde la cual están en esa época y en
  todas las siguientes; si no están en 1911, nacen en 1936. No mueren.
- **Casas de 1578** (nacen en 1578): una casa de 1936 les pasa la posta si, ella sola, cubre al
  menos el 30 % (`PISADA_MINIMA`) de la huella de la de 1578. Si hay varias, gana la que nace
  primero: la de 1578 muere en esa época. Si ninguna llega al 30 %, muere en la primera época
  (1772…1911) en que su lugar no está edificado (< 50 %); si sigue edificado hasta 1911, muere
  en 1936.

Los años de la línea de tiempo son 1578 · 1772 · 1843 · 1889 · 1911 · 1936.

Los residuos LOO que se reportan (metros sobre 1936) mezclan el error del calce con el del dibujo
original: un plano 1:10.000 tiene ~10 m por milímetro de dibujo.

Tests: `.venv/bin/python -m pytest tools/geo/tests -q`.

## Esquinas (`esquinas.py`)

En Caracas las direcciones se dan "de esquina a esquina", y el plano de 1936 rotula en rojo
(cursiva terracota, casi siempre en diagonal en el ángulo de la manzana) el nombre de la mayoría
de las esquinas, con la cota (▲ y metros) al lado. `tools/geo/esquinas/1936-esquinas.json` es el
diccionario curado `nombre → píxel del cruce` (va a git):

```json
{"nombre": "La Torre", "px": [9088.0, 6754.0], "fuente": "plano DCN 1936", "verificado": true, "cota_m": 919.549, "notas": ""}
```

`px` es el cruce de los ejes de calle al que pertenece el rótulo (no el centro del texto), en
píxeles del mosaico. `verificado: false` marca lo dudoso (rótulo cortado por la costura o tapado,
cruce ambiguo, nombre que puede ser de lugar o de calle) y `notas` dice por qué. Los nombres se
transcriben como dice el plano, corrigiendo solo erratas evidentes de imprenta ("Sanra" → "Santa",
"Crisro" → "Cristo"); la errata queda anotada.

```sh
# 1. candidatos: rótulos rojos (umbral Lab + letras agrupadas), cruces (esqueleto de la clase calle
#    + terreno libre/desconocido, que es donde caen las cotas) y asociación rótulo → cruce más cercano
#    → $S/candidatos.json, $S/crops/NNNN.png (rótulo enderezado + contexto), $S/hoja-*.jpg, $S/vistas/
$PY tools/geo/esquinas.py detectar --salida $S          # ventana de 3,2 km alrededor de la plaza

# 2. lectura a ojo de las fichas → lecturas.json: {"<id>": {"nombre", "cota_m", "verificado",
#    "notas", "px"} | {"descartar": "…"}, "manual-NNN": {… con "px"}}

# 3. diccionario y lámina de control (la lámina no va a git)
$PY tools/geo/esquinas.py componer --candidatos $S/candidatos.json --lecturas lecturas.json
$PY tools/geo/esquinas.py qa --radio 3000               # → $D/qa-esquinas.jpg
```

El detector no lee: solo propone. La mitad larga del trabajo es mirar las fichas. En la ventana de
1,5 km alrededor de la plaza salen ~450 candidatos; un tercio son trozos de curvas de nivel (también
rojas) y letras de parroquia, que se descartan a mano.

### Estilos y alturas por época (`estilos.py`)

Después de `epocas.py`: a cada casa, su **historia**: un estilo y unos pisos **por época**, desde que nace
(determinista por la semilla). Las reglas salen de las pinturas y fotos de `fuentes/imagenes/README.md`, que
mandan. `npm run datos` lo corre y empaca su salida (`historia` en `ciudad.pak`, ver `specs/02`).

```sh
$PY tools/geo/estilos.py fuentes/derivados/epocas/ciudad-epocas.json fuentes/derivados/epocas/ciudad-estilos.json \
    --escala 0.5 --plaza 8968.2,6839 --tabla      # --tabla imprime el histograma de abajo
node tools/empacar-ciudad.mjs fuentes/derivados/epocas/ciudad-estilos.json
```

Índices de estilo (los que lee `src/shader/fachada.js`): 0 colonial · 1 republicano (pretil) · 2 guzmancista ·
3 ecléctico · 4 moderno · 5 quinta · 6 rancho · 7 casa de las orillas (colonial baja de alero) ·
**8 galpón de estación** (zinc) · 9 edificio público.

Cada casa tiene dos números al azar fijos (uno para la fachada, otro para los pisos) y la regla compara cada
uno con probabilidades que **solo suben con las épocas**: una casa nunca vuelve atrás. Las probabilidades
dependen del lugar, en metros desde la Plaza Bolívar:

- **centralidad** `c`: 1 hasta 350 m de la plaza, 0 desde 1100 m (La Pastora), lineal en el medio;
- **núcleo comercial** `n`: 1 hasta 70 m del eje que baja de la plaza al Teatro Municipal, 0 desde 240 m;
- **esquina**: `"esquinas"` del vectorizador (1 si la casa es la más cercana, a 6 m o menos, de un vértice
  saliente y casi a escuadra de su manzana, con dos lados de 12 m o más; las manzanas de menos de 4 casas no
  tienen esquinas). Hoy: 3.123 de 33.921.

| Regla | 1578 | 1772 | 1843 | 1889 | 1911 | 1936 |
|---|---|---|---|---|---|---|
| fachada de pretil o más nueva: centro → barrio | — | — | 15 % → 0 | 55 % → 8 % | 80 % → 35 % | 92 % → 78 % |
| guzmancista o más nueva: centro → barrio | — | — | — | 25 % → 2 % | 45 % → 6 % | 55 % → 14 % |
| ecléctica o moderna: núcleo · centro → barrio | — | — | — | — | 35 % · 8 % → 0 | 70 % · 16 % → 5 % |
| moderna: núcleo · centro → barrio | — | — | — | — | — | 22 % · 3 % → 0 |
| dos pisos, casa de esquina: centro → barrio | — | 35 % → 0 | 50 % → 0 | 60 % → 3 % | 65 % → 5 % | 70 % → 8 % |
| dos pisos, a media cuadra: centro → barrio | — | — | 2 % → 0 | 4 % → 0 | 7 % → 1 % | 10 % → 3 % |
| dos pisos o más en el núcleo | — | — | — | — | 30 % | 50 % |
| tres pisos o más (× núcleo) | — | — | — | — | 4 % | 14 % |
| cuatro pisos (× núcleo) | — | — | — | — | — | 5 % |

Lo que no llega al pretil es colonial; las casas nacidas desde 1843 en los barrios, de un piso, son en su
mayoría (75 % × (1 − c)) **casas de las orillas**. Lo de tres pisos o más es siempre ecléctico o moderno. Aparte:

- **quinta**: nace en 1911 o 1936, a más de 1,8 km, de 200 m² o más y compacta (largo ≤ 2 × ancho); 1 o 2 pisos;
- **rancho**: nace en 1936, a más de 2,5 km y de menos de 45 m²;
- **galpón**: huella de 22 m o más de largo y ≥ 1,8 veces su ancho, en el patio de una estación (`ESTACIONES`:
  Caño Amarillo desde 1889, Palo Grande desde 1911). Los planos de 1889 y 1911 no dibujan esos patios como
  edificados, así que `estilos.py` hace **nacer el galpón con su estación** (corrige su `vida`);
- los **edificios públicos** (9) quedan como los dejó el vectorizador, en todas las épocas.

Con los datos actuales (casas en pie por época; entre paréntesis, por pisos):

| Estilo | 1578 | 1772 | 1843 | 1889 | 1911 | 1936 |
|---|---|---|---|---|---|---|
| colonial (0) | 65 | 1954 (1p: 1937 · 2p: 17) | 2359 (1p: 2298 · 2p: 61) | 2721 (1p: 2610 · 2p: 111) | 2405 (1p: 2203 · 2p: 202) | 2178 (1p: 1857 · 2p: 321) |
| republicano (1) | — | — | 271 (1p: 263 · 2p: 8) | 1055 (1p: 1009 · 2p: 46) | 3280 (1p: 3085 · 2p: 195) | 18114 (1p: 17249 · 2p: 865) |
| guzmancista (2) | — | — | — | 727 (1p: 708 · 2p: 19) | 1495 (1p: 1385 · 2p: 110) | 3876 (1p: 3618 · 2p: 258) |
| eclectico (3) | — | — | — | — | 362 (1p: 305 · 2p: 38 · 3p: 19) | 2015 (1p: 1779 · 2p: 175 · 3p: 39 · 4p: 22) |
| moderno (4) | — | — | — | — | — | 190 (1p: 147 · 2p: 34 · 3p: 5 · 4p: 4) |
| quinta (5) | — | — | — | — | 133 (1p: 78 · 2p: 55) | 987 (1p: 592 · 2p: 395) |
| rancho (6) | — | — | — | — | — | 1810 |
| orillas (7) | — | — | 689 | 2176 | 2905 | 4050 |
| galpon (8) | — | — | — | 48 | 75 | 75 |
| publico (9) | — | 14 (2p: 8 · 3p: 6) | 20 (2p: 14 · 3p: 6) | 42 (2p: 34 · 3p: 8) | 91 (2p: 81 · 3p: 10) | 626 (2p: 610 · 3p: 16) |
| **casas en pie** | 65 | 1968 | 3339 | 6769 | 10746 | 33921 |
| de un piso | 100 % | 98 % | 97 % | 97 % | 93 % | 92 % |
| de 3 o 4 pisos | 0 | 0 | 0 | 0 | 19 | 70 |

Para mirar el resultado contra las referencias: `GPU=1 node tests/e2e/capturas-estilos.mjs <url> <carpeta>`
(desde El Calvario, sobre el centro y a nivel de calle en La Pastora, en 1843, 1889, 1911 y 1936).

### Calles y cuadras verificadas (T33g)

`calles-historicas.json` documenta calles comprobadas en los planos de **1772 y 1936**
que faltan en OSM o que la clasificación automática descarta. Cada tramo conserva
sus coordenadas en el original, anclajes en el mosaico y una explicación. El paso
`calles-nuevas` los conecta a nudos de la red a menos de 5 m; si el anclaje deja de
coincidir, falla para que se revise. No se usa este archivo para calles que solo
existían en una época: hace falta modelar su vida por separado.

Regenerar con `npm run datos`. Los binarios quedan locales;
publicarlos requiere la decisión del responsable del proyecto.

`cuadras-1772.json` documenta diez cuadras cerradas del centro: rectángulos en el
original y sus cuatro cruces correspondientes en el mosaico, leídos por posición
en el damero respecto de Plaza Mayor. Se excluyen las plazoletas de San Jacinto y
San Pablo. Solo se aplica cuando hay una cara individual de la red que coincide;
una cara que agrupa varias cuadras se rechaza. La cuadra cerrada reemplaza a la de
1936 en 1772 y se conserva hasta la primera época posterior cuyo plano muestra
la apertura. La evidencia directa fija que no puede desaparecer ya en 1772 por
un error del raster calzado (`juntas_minimo`). Los lotes siguen siendo sintéticos.

La línea de fachada queda al menos a 3 m del eje reconocido de la calle: una
reserva de modelado para que un error de la máscara no una dos cuadras. No es una
medición histórica del ancho de cada vía. Se conservan los retiros mayores medidos
en el plano; el reparto irregular también se recorta al contorno de la cuadra.

### Frentes y medianeras exactos (T33h)

`huellas.py` reparte las cuadras convexas mediante bisectrices de sus lados y cortes
por los frentes de cada casa. Las medianeras salen de las mismas rectas, sin volver
a rasterizar y dilatar cada lote. Solo sustituye la máscara cuando sus diferencias
están a menos de 2 m del borde exterior; conserva el reparto anterior cuando hay
plazas, pasajes, huecos interiores o contornos cóncavos. Es una corrección geométrica,
no una identificación de las parcelas históricas individuales.

### Frentes junto a monumentos (T33i)

En el visor, `src/hitos/suprimir.js` comprueba las alas techadas de una casa de
patio antes de apagarla por un monumento. Un solar que toca la Catedral no borra
el frente de la calle opuesta. Si una época posterior ocupa ese solar con una
cubierta de lote entero, la supresión vuelve a aplicarse desde esa época.
