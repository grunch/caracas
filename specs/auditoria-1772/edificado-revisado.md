# Lo edificado de 1772 en el original, revisado a ojo · fase 4

Fecha: 22-11-2026. T33j.4a (I1772-007). **Por decisión del responsable (22-11-2026),** lo edificado de cada unidad se traza automáticamente sobre el original y cada trazado se revisa a ojo antes de usarlo. El censo de la fase 1 prohíbe usar los contornos automáticos sin revisar, porque pueden seguir el color y no lo dibujado.

## Qué se traza

`tools/geo/edificado_original.py` → [edificado-original.json](edificado-original.json). Se trazan 154 unidades, fuera de los sectores límite del calce:
- las pendientes edificadas, que son la periferia que hoy queda sin casas;
- las parciales aprobadas, que el generador rellena.

| Estado | Ocupación | Unidades |
|---|---|---|
| aprobada | parcial | 34 |
| pendiente | aislada | 15 |
| pendiente | conjunto_especial | 8 |
| pendiente | continua | 45 |
| pendiente | parcial | 52 |

En el original, una manzana tiene un borde negro y lo edificado va pintado de rojo dentro de ella, con huertas y solares alrededor. Por eso se traza **lo rojo, no la manzana**: el borde de la manzana ya lo dan las calles de la red, y lo rojo dice dónde estaban las casas.
- Se toman las manchas rojas con al menos la mitad dentro de la caja de la unidad.
- El contorno se lleva al borde real del píxel.
- Los umbrales de color van en el JSON.

## Revisión

[edificado-revisado.json](edificado-revisado.json). Revisé a ojo, una por una, las 13 láminas de 12 recortes. Cada recorte muestra el original ampliado ×3, con la caja de la unidad en azul y lo trazado en verde. Los recortes quedan fuera de git; su sha256 queda en el registro.

| Juicio | Unidades |
|---|---|
| fiel: el trazado sigue lo dibujado en rojo | 143 |
| fiel, solo la mancha mayor: las demás son vecinas que la caja alcanza | 3 |
| corregido: corregido a mano sobre el trazado y revisado de nuevo (T33j.4c) | 4 |
| dudoso: queda pendiente | 4 |

- **U1772-0024** (fiel_solo_la_mayor): la caja alcanza una manzana al otro lado de la quebrada.
- **U1772-0025** (fiel_solo_la_mayor): la caja alcanza el triángulo del otro lado de la diagonal y el puente.
- **U1772-0042** (corregido): el puente oscuro de la esquina queda pegado al contorno. Se recorta a la caja de la unidad.
- **U1772-0044** (fiel_solo_la_mayor): la mancha chica está al otro lado de la quebrada.
- **U1772-0195** (dudoso): el contorno roza el puente de la esquina.
- **U1772-0232** (corregido): el rojo sigue hacia el norte fuera de la caja sin borde que lo separe. Se recorta a la caja de la unidad.
- **U1772-0250** (dudoso): se pega el puente y entra un pedazo del otro lado de la calle.
- **U1772-0254** (dudoso): se pegan el puente y un pedazo del otro lado de la calle.
- **U1772-0264** (corregido): edificio diagonal muy fino: solo se trazaba una parte. Se retraza con saturación y brillo mínimos de 40.
- **U1772-0272** (fiel_solo_la_mayor; dudoso hasta el censo final): la mancha mayor es la franja en L de la unidad al pie del Calvario; la otra es el triángulo del otro lado de la diagonal (U1772-0013), que ya tiene sus casas. Revisado de nuevo a ojo el 23-11-2026 (D8-01, T33j.8c).
- **U1772-0277** (corregido): el triángulo y el puente quedan en una sola mancha. Se recorta a la caja de la unidad.

La revisión queda atada al sha256 del recorte y de los polígonos: si el trazado cambia, deja de valer (`edificado_original.edificado_aprobado`). Una corregida guarda su polígono corregido en la revisión, con el mismo atado al trazado original.

## Qué sigue

El siguiente PR lleva lo edificado aprobado a la referencia y al generador:
- lo lleva a 1936 por el calce por identidad, con el error de su sector declarado;
- las unidades pendientes edificadas entran con sus casas donde el original pinta rojo;
- las parciales dejan de rellenar sus huertas.

## Reproducir

```
.venv/bin/python tools/geo/edificado_original.py specs/auditoria-1772 --recortes <carpeta fuera de git>
.venv/bin/python -m pytest tools/geo/tests/test_edificado_original.py -q
```
