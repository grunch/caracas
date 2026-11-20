# Contrato de referencia histórica antes de habilitar generación

`tools/geo/referencias/1772-nucleo.json` reúne los 23 nodos compartidos y las diez
unidades del núcleo ya documentadas. Conserva IDs N/U/M y las coordenadas de la
referencia curada: no reajusta el TPS ni modifica `cuadras-1772.json`. **Las diez
unidades permanecen pendientes y la selección para generación devuelve cero.**

Los nodos describen cruces y los polígonos están delimitados por **ejes de calle**,
no por fachadas o bordillos. Aprobar una unidad no autoriza a ocupar todo ese
polígono: la fase de calles debe reservar la calzada antes de repartir casas.

Una unidad pendiente puede declarar `nodos: null` cuando su geometría sigue sin
resolver. Una unidad aprobada requiere geometría válida; no se inventan contornos
para satisfacer el validador.

El contrato evita resolver una contradicción promediando dos esquinas o activando
un candidato porque tiene un polígono válido. `tools/geo/referencia_historica.py`
comprueba, en original y mosaico:

- IDs únicos, coordenadas finitas y una única identidad por coordenada de cruce.
- Referencias a nodos existentes, anillos simples, orientación conservada y ausencia
  de intersección de área entre unidades.
- Fuente identificada por SHA-256, procedencia por unidad y estados explícitos.
- Ocupación separada de aprobación: aprobar una plaza o terreno libre no lo convierte
  en una manzana de casas.

La tolerancia de intersección es 1e-8 píxeles cuadrados, exclusivamente numérica;
no sustituye tolerancias históricas ni permite compensar errores de calce. El
validador no comprueba que una afirmación documental sea cierta: la aprobación
requiere contrastar las fuentes. Tampoco reconstruye frentes ni reparte parcelas.

```sh
PYTHONPATH=tools/geo .venv/bin/python - <<'PY'
import json
from pathlib import Path
from referencia_historica import validar_referencia, unidades_aprobadas
p = Path('tools/geo/referencias/1772-nucleo.json')
r = json.loads(p.read_text(encoding='utf-8'))
validar_referencia(r)
assert unidades_aprobadas(r) == []
print(len(r['nodos']), 'nodos;', len(r['unidades']), 'unidades pendientes')
PY
```

El módulo todavía no está conectado al generador. Es preparación verificable para
T33j.2a; no cierra fase 1 ni adelanta la aprobación de los controles métricos. En
fase 2 deben reconciliarse las discrepancias documentadas en I010 y conservar
controles independientes antes de cambiar estados. Las fases siguientes consumirán
la referencia validada; no deben importar las cajas o sondeos de la auditoría.
