# Unidades edificadas sin cara única

`contornos-sin-cara.json` registra la inspección ampliada de las 78 unidades con
ocupación continua, parcial o especial que no aparecen entre las 147 caras únicas.
Incluye U0003, cuyo candidato también abarca U0256. Son 78 registros del censo,
no 78 omisiones demostradas del modelo ni 78 manzanas cerradas.

Se revisaron diez láminas de hasta ocho recortes, tomando cada `bbox_original`
con ocho píxeles de margen del original de 1772. Los recortes sirven para leer
los bordes y cuerpos; no se interpreta su escala de presentación como métrica.
La fuente es la misma, identificada por SHA-256 en el JSON. Para regenerarlos:

```python
import json
from pathlib import Path
from PIL import Image
p = Path('specs/auditoria-1772')
im = Image.open('fuentes/mapas/1772-pares-agi-exato-mapa/original.jpg')
destino = Path('.cache/contornos-sin-cara')
destino.mkdir(parents=True, exist_ok=True)
for u in json.loads((p / 'contornos-sin-cara.json').read_text(encoding='utf-8'))['unidades']:
    x0, y0, x1, y1 = u['bbox_localizacion']
    im.crop((x0-8, y0-8, x1+8, y1+8)).save(destino / (u['unidad'] + '.png'))
```

## Decisiones que condicionan el trazado

- U0097, U0141 y U0173 tienen cuatro bordes aproximadamente rectos y rojo continuo.
  El esbozo incompleto no autoriza convertirlas en manzanas abiertas.
- U0036, U0151, U0185 y U0186 son alargadas. En U0151, el paso que entra desde arriba
  termina antes de la banda roja inferior: no debe atravesarla.
- U0187/U0188, U0155/U0156, U0285/U0286 y U0025/U0277 mantienen sus separaciones.
- U0058/U0059 comparten un espacio abierto con cuerpos aislados: no cerrarlo con casas.
- U0069/U0232 conservan el recodo de la calle; U0013 necesita retrazado del candidato.
- U0035 y U0046 tienen franjas claras junto a la ribera. Queda por distinguir calle,
  retiro y solar antes de aprobar un límite de construcción.
- U0163 y U0267 son conjuntos religiosos; U0215 y U0227 contienen cuerpos interiores.
  No convertir sus cajas en coronas edificadas.

El resto de las observaciones específicas está en el registro por unidad. Ninguna
caja se convierte aquí en un polígono edificable, ni se conecta una calle a través
del agua por proximidad. Las orientaciones de las notas corresponden al escaneo,
cuyo norte está a la derecha.

## Cobertura y pendientes

Las 292 unidades se distribuyen sin duplicados entre 147 con lectura de cara
candidata, estas 78 y otros 67 registros: 45 terrenos libres, 20 cuerpos aislados,
una parte de otra unidad y un registro descartado. Esos 67 conservan su lectura en
`unidades-original.json`; no se han inventado caras para contabilizarlos.

La lectura identifica qué debe conservar el trazado de fase 2. No certifica una
correspondencia métrica con el sistema ni completa el inventario de accesos. La
fase 1 sigue abierta; los límites no resueltos permanecen explícitos.
