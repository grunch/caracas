# Correspondencias por identidad · T33j.2a

Fecha: 21-11-2026. Reclasificación de las 292 unidades del original frente a las cuadras del sistema en 1772, sobre el calce vigente por identidad ([calce-identidad.md](calce-identidad.md)). Generado por `tools/geo/controles_damero.py`; datos en [correspondencias-unidades.json](correspondencias-unidades.json), muestra visual en [verificacion-damero.json](verificacion-damero.json). Reemplaza la clasificación de la entrega 1D ([controles-damero.md](controles-damero.md)). **Clasifica la correspondencia; no corrige geometría ni certifica el sistema.**

## Qué cambia

- **Calce:** el de control deja de ser un TPS propio sobre los 168 cruces (que incluía las 9 esquinas de 1936 que son rótulos) y pasa a ser el calce vigente: 170 anclas por identidad, LOO rms 18,9 m.
- **Fusionadas:** una cuadra del sistema que contiene enteras (≥ 85 %) a dos o más unidades, y que entre todas cubren al menos la mitad de la cuadra, es una fusión aunque ninguna unidad llegue sola al 50 % (`clasificar_correspondencias`). Así salen 3 pares que antes figuraban como desplazadas o parciales: cuadra 8079 (U1772-0055 y U1772-0199, Laguno y Correos), 8091 (U1772-0082 y U1772-0096) y 8103 (U1772-0123 y U1772-0140). El sistema une en una cuadra dos manzanas que el original separa por una calle.
- **Identidad por pareja de las uno a uno** (`confirmar_uno_a_uno`): la unidad y su cuadra tienen que caer en la misma celda del damero, la del mismo par de calles contado desde Las Monjas. En el original la celda sale de los cruces del trazado; en 1936, de las esquinas por identidad (sin rótulos, con los cruces por topología). Cada uno a uno lleva su `identidad_pareja`. Sin esa evidencia la unidad pasa a `incierta` con su motivo.

## Resultado

| Clase | 1D (20-11) | Ahora |
|---|---|---|
| uno_a_uno | 42 (provisionales) | 36, con identidad por pareja |
| fusionada | 0 | 6 |
| incierta | — | 6 |
| desplazada_o_parcial | 6 | 0 |
| ausente | 168 | 168 |
| vacio_coincide | 76 | 76 |

- **U1772-0055** queda reclasificada: es una de las dos unidades de la cuadra 8079 (fusionada), no una uno a uno subestimada. La muestra anterior acertó la identidad (la unidad cae sobre su manzana) y la nueva explica por qué la fracción quedaba bajo el umbral: la cuadra se reparte entre dos unidades.
- **Las 6 inciertas** (U1772-0092, U1772-0093, U1772-0097, U1772-0107, U1772-0108, U1772-0125) calzan a ojo con su cuadra, pero falta la celda completa del damero en 1936, casi siempre por la costura del mosaico. Quedan visibles con decisión pendiente: no se pasan a uno a uno por intuición (specs/08 1D).
- **Las 168 ausentes** se reubicaron con el calce por identidad (su `mosaico_poligono` es el del calce vigente) y siguen sin cuadra del sistema: el sitio de 1772 tiene 45 cuadras. Ninguna se inventa; 68 están fuera del casco de las anclas (`extrapolada`).

## Muestra visual

Los 30 recortes de correspondencias que genera el programa (6 por clase), todos juzgados el 21-11-2026: **18 coinciden, 12 compatibles, 0 contradicen**. Las 6 ausentes y las 6 vacías se confirman (no hay cuadras del sistema encima). De las uno a uno, 4 coinciden y 2 son compatibles (Santa Teresa, donde la cuadra cubre parte del conjunto, y una de contorno irregular). De las fusionadas, U1772-0055 y U1772-0199 coinciden (se ve la cuadra cruzar la calle) y las otras 4 son compatibles. Las 6 inciertas son compatibles. Los recortes de controles de cruce no se juzgan: el control por sector es el LOO del calce (decisión del 21-11-2026).

## Reproducir

```
.venv/bin/python tools/geo/controles_damero.py --ciudad fuentes/derivados/epocas/ciudad-estilos.json \
  --original fuentes/mapas/1772-pares-agi-exato-mapa/original.jpg --mosaico fuentes/derivados/1936/mosaico.tif \
  --recortes .cache/damero-1772 --muestra 2
.venv/bin/python tools/geo/cierre_fase1.py specs/auditoria-1772 tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json
```
