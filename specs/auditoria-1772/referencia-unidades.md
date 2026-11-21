# Unidades de la referencia histórica de 1772 · fase 2

Fecha: 21-11-2026. T33j.2b, segunda parte (specs/08, fase 2). Generado por `tools/geo/referencia_unidades.py` sobre la [red de la referencia](referencia-red.md): [`tools/geo/referencias/1772-unidades.json`](../../tools/geo/referencias/1772-unidades.json). **Valida coherencia, no fidelidad. Los anillos son ejes de calle, no fachadas, y aprobar una unidad no habilita la generación (fase 3).**

## Qué contiene

Las **292 unidades del censo**, cada una una sola vez. Cada registro trae:

- ocupación y lectura del original (fase 1);
- correspondencia con 1936: clase y cuadras ([correspondencias-identidad.md](correspondencias-identidad.md));
- celda del damero y cara candidata, si la tiene;
- excepciones del trazado;
- estado, motivos y procedencia.

**97 aprobadas y 195 pendientes.** Las aprobadas tienen geometría: el anillo de los cuatro cruces de su celda en la red, con su pareja en 1936. Dos aprobadas vecinas comparten los mismos tramos de calle.

## Criterio de aprobación

Una unidad se aprueba solo si se cumplen todas estas condiciones. Si falta alguna, queda pendiente, sin geometría inventada, y el motivo queda escrito:

| Motivo si falta | Unidades | Condición |
|---|---|---|
| `sin_celda_del_damero` | 149 | ninguna celda del damero contiene el 85 % de la unidad (periferia, forma irregular o varias celdas): su contorno se cierra en la fase 3 (T33j.3b) |
| `esquina_sin_pareja_en_1936` | 37 | una esquina de la celda no tiene pareja por identidad en 1936 |
| `sector_limite_del_calce` | 25 | su sector es un límite documentado del calce (limites-calce.json) |
| `lado_sin_calle` | 11 | un lado de la celda no es un tramo de calle de la red |
| `celda_compartida` | 8 | otra unidad cae en la misma celda: el anillo de la celda no es de ninguna de las dos |
| `excepcion_registrada` | 7 | tiene una excepción registrada en el trazado que la fase 3 debe respetar |
| `correspondencia_incierta` | 6 | su correspondencia con 1936 es incierta (correspondencias-identidad.md) |
| `ocupacion_sin_unidad_propia` | 2 | el censo la lee como parte de otra unidad o la descarta como edificación |

Una unidad puede tener varios motivos. La cara candidata (`contorno_candidato`, de [frentes-caras-candidatas.json](frentes-caras-candidatas.json)) solo sirve para decidir en qué celda cae la unidad: se cita, pero nunca se aprueba como contorno.

Las aprobadas:
- **Por ocupación:** continua 41, parcial 34, conjunto_especial 11, terreno_libre 10, plaza 1.
- **Por correspondencia:** ausente 44, uno_a_uno 36, vacio_coincide 11, fusionada 6.
- **Ausentes:** una aprobada `ausente` tiene referencia, pero el sistema no la construye. Corregirlo es trabajo de las fases 3 y 4.

## Por sector

| Sector | Unidades | Aprobadas | Pendientes |
|---|---|---|---|
| S1772-11 | 14 | 2 | 12 |
| S1772-12 | 9 | 0 | 9 |
| S1772-13 | 12 | 6 | 6 |
| S1772-14 | 6 | 0 | 6 |
| S1772-21 | 19 | 6 | 13 |
| S1772-22 | 35 | 18 | 17 |
| S1772-23 | 35 | 17 | 18 |
| S1772-24 | 17 | 0 | 17 |
| S1772-31 | 18 | 4 | 14 |
| S1772-32 | 32 | 19 | 13 |
| S1772-33 | 42 | 15 | 27 |
| S1772-34 | 22 | 4 | 18 |
| S1772-42 | 11 | 2 | 9 |
| S1772-43 | 18 | 4 | 14 |
| S1772-44 | 2 | 0 | 2 |

Las pendientes se concentran en la periferia y en los tres sectores de límite documentado del calce (S1772-14, -24 y -44). En S1772-24, I1772-014 pide no ubicar la ocupación por cercanía al calce.

## Excepciones del trazado

Estas 7 unidades tienen una excepción registrada en [trazado-calles-original.json](trazado-calles-original.json) y quedan pendientes con ella a la vista:

- **U1772-0036:** Sin calle horizontal intermedia: H660 queda interrumpida entre x=370 y x=437.
- **U1772-0151:** Entrada corta desde y=1125; no atravesar el frente rojo hasta y=1191.
- **U1772-0185:** Manzanas alargadas; no insertar una fila intermedia.
- **U1772-0186:** Manzanas alargadas; no insertar una fila intermedia.
- **U1772-0187:** Conservar la calle intermedia aproximada x=1067.
- **U1772-0188:** Conservar la calle intermedia aproximada x=1067.
- **U1772-0214:** Plaza de Candelaria con cuerpos aislados; no prolongar frentes sobre su espacio público.

La fase 3 tiene que respetarlas: no insertar calles intermedias, no atravesar frentes y conservar las calles intermedias registradas.

## Qué valida `validar_unidades`

- Toda unidad del censo aparece una sola vez.
- Una aprobada no tiene motivos y sí geometría. Cada lado de su anillo es un tramo de calle de la red y cada esquina tiene pareja por identidad en 1936.
- Una pendiente tiene motivos, y todos son del criterio.
- La geometría pasa por el contrato de [contrato-referencia.md](contrato-referencia.md) (`referencia_historica.validar_referencia`): anillos simples, sin solapes entre unidades y con la misma orientación en el original y en 1936.

La referencia real pasa todas estas comprobaciones. El JSON va con una entidad por línea (el diff se revisa por ID) y guarda el SHA-256 de la red y la huella del calce: si cambian, hay que regenerarla.

## Reproducir

```
.venv/bin/python tools/geo/referencia_unidades.py specs/auditoria-1772
.venv/bin/python -m pytest tools/geo/tests/test_referencia_unidades.py -q
```
