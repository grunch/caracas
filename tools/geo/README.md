# tools/geo · pipeline del plano DCN 1936

Del escaneo de las dos hojas del plano de la Dirección de Cartografía Nacional (1936, 1:5.000)
a la ciudad en 3D. Todo corre offline, desde la raíz del repo, con el entorno de Python de
`tools/geo/requirements.txt` (`python -m venv .venv && .venv/bin/pip install -r tools/geo/requirements.txt`)
y Node (`npm ci`). Los datos (originales y derivados) no van a git.

Entradas: `fuentes/mapas/1936-archiveorg-caracas-dcn-hoja{1,2}/original.tif` (TIFF sin comprimir).

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

# 5. vectorizar: manzanas → lotes → techos (--plaza = "plaza" de mosaico.json, en píxeles)
$PY tools/geo/vectorizar.py $D/segmentacion/mosaico/clases-costura.png $D/ciudad-1936.json \
    --escala 0.5 --plaza 8968.2,6839

# 6. empacar: techos → public/datos/ciudad.pak
node tools/empacar-ciudad.mjs $D/ciudad-1936.json

# 7. plano: LOD y teselas del mosaico cosido → public/plano/, y bloque "plano" de public/datos/ciudad.json
node tools/plano.mjs $D/mosaico-costura.tif $D/mosaico.json

# 8. calce con el mundo: cuadrícula 1936 ⇄ UTM 19N con los puntos de control OSM de
#    gcp/1936-wgs84.json (px/py en el mosaico; reescribe transformación y residuos)
.venv/bin/python tools/geo/gcp1936.py --modelo similitud

# 9. relieve: DEM Copernicus GLO-30 (lo baja si falta) → public/datos/relieve.bin (930×740, 10 m),
#    sin edificios y corregido con las cotas del plano (gcp/1936-cotas.json)
.venv/bin/python tools/geo/relieve.py --dem /tmp/Copernicus_DSM_COG_10_N10_00_W067_00_DEM.tif
```

El calce y las cotas se midieron sobre `mosaico.tif`; `mosaico-costura.tif` tiene la misma geometría
(solo rellena la franja de la costura), así que valen para los dos. `geo1936.py` es el módulo para
llevar cualquier dato de OSM o WGS84 al plano (`wgs84_a_grid`, `grid_a_px`) y al revés.

Los pasos 1–3 son lentos (minutos); la costura tarda ~20 s, el vectorizador ~30 s y el plano ~1 min.
Si cambia el mosaico (paso 2) hay que repetir todo lo que sigue.

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

Los residuos LOO que se reportan (metros sobre 1936) mezclan el error del calce con el del dibujo
original: un plano 1:10.000 tiene ~10 m por milímetro de dibujo.

Tests: `.venv/bin/python -m pytest tools/geo/tests -q`.
