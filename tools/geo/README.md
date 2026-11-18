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
```

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

Tests: `.venv/bin/python -m pytest tools/geo/tests -q`.
