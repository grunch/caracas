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

# 5. vectorizar: manzanas → lotes rectos (lotes.py) → techos (--plaza = "plaza" de mosaico.json, en píxeles)
$PY tools/geo/vectorizar.py $D/segmentacion/mosaico/clases-costura.png $D/ciudad-1936.json \
    --escala 0.5 --plaza 8968.2,6839

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
node tools/suelo.mjs $D/segmentacion/mosaico/clases-costura.png
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

Después de `epocas.py`: a cada casa, el estilo de la época en que nace y del lugar donde está, y sus pisos
según el estilo (determinista por la semilla). `npm run datos` lo corre y empaca su salida.

```sh
$PY tools/geo/estilos.py fuentes/derivados/epocas/ciudad-epocas.json fuentes/derivados/epocas/ciudad-estilos.json \
    --escala 0.5 --plaza 8968.2,6839
node tools/empacar-ciudad.mjs fuentes/derivados/epocas/ciudad-estilos.json
```

| Nace en | Estilo (índice) | Pisos |
|---|---|---|
| 1578, 1772 | colonial (0) | 1 |
| 1843 | colonial 70 % · republicano (1) 30 % | 1 · 1–2 |
| 1889 | republicano 50 % · guzmancista (2) 50 % | 1–2 |
| 1911 | guzmancista 35 % · ecléctico (3) 65 % | 1–2 · 2–3 |
| 1936, a menos de 1,8 km de la plaza | ecléctico 65 % · moderno (4) 35 % | 2–3 · 2–4 |
| 1936, afueras | quinta (5) si ≥ 300 m²; rancho (6) si < 60 m² y a más de 2,5 km; si no, casa de las orillas (7) | 1–2 · 1 · 1 |

Los edificios públicos (9) quedan como los dejó el vectorizador. Con los datos actuales: colonial 2941,
republicano 2074, guzmancista 3066, ecléctico 9139, moderno 3649, quinta 179, rancho 2548, orillas 9764,
público 626.
