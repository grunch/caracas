# Cierre de la fase 6 · cubiertas de 1772

Fecha: 22-11-2026. T33j.6a (I1772-005, -011 y -012). Lo genera `tools/geo/cierre_fase6.py` sobre los techos que dibuja el visor: [cierre-fase6.json](cierre-fase6.json).

Los techos los saca `tools/cubiertas.mjs`, que reproduce en CPU la geometría de `src/ciudad.js` con los pisos de 1772, sin los aleros que esconde la fachada de pretil y con el relieve en half-float, como el shader. Es el método de T33j.1l ([cruces-cubiertas-3d.md](cruces-cubiertas-3d.md)), convertido en módulo (`tools/cubiertas-lib.mjs`, con tests). No lee el GPU.

Se miden las casas que el visor deja a la vista en 1772, como en las fases 4 y 5. **Cuenta lo medido; no certifica fidelidad.**

## Qué mide la puerta (specs/08, fase 6)

| Criterio de specs/08 | Medida |
|---|---|
| Sin triángulos degenerados | **Triángulos sin degenerar:** ningún triángulo de techo con menos de 1 cm² de área, o con menos de 1 mm de altura sobre su lado mayor (una aguja). |
| Sin techos cruzados | **Techos sin cruces:** ninguna superficie de una casa atraviesa la de otra. Cuenta el corte estricto de T33j.1l: proyección común de más de 1 cm², y un plano que pasa más de 1 mm por encima y por debajo del otro dentro de ella. Los contactos de borde y los solapes coplanares no cuentan. |
| Cumbreras coherentes con el frente | **Cumbreras con el frente:** en cada frente donde la casa es fachada (los frentes de la puerta de la fase 5: rayos de cada tramo recto medible y la manzana que lo arma), la cumbrera de teja más cercana al eje tiene que ir paralela a él dentro de 20°, el giro que ya se admite para las fachadas. La casa cumple si lo hace en alguno de sus frentes. Las casas sin cumbrera de teja (azotea, zinc) no se miden. |
| Aleros sin bloquear calles | **Aleros fuera de la calle:** ningún techo pisa más de 0,01 m² del núcleo de la calzada de las calles de 1772, los corredores de la fase 3. |
| Mismo trazado y ocupación que en la fase 5 | **Mismo trazado:** las puertas 3, 4 y 5 cierran y midieron esta misma ciudad (el mismo sha256). |

Los umbrales son inferidos y van declarados en el JSON. Se fijaron antes de medir y no se cambian para que algo pase (1A).

## Línea base (después de la fase 5)

Ciudad de `main` e390f0c (#137), con 6319 casas visibles de 1772; 6317 tienen techo.

| Criterio | Resultado | Cumplido |
|---|---|---|
| Triángulos sin degenerar | **268 degenerados** de 75.215, en 165 casas | **no** |
| Techos sin cruces | **813 pares** de casas que se cortan (el mayor, 11,5 m² de proyección común) | **no** |
| Cumbreras con el frente | 4511 casas medidas; **157 desviadas** (105 giradas entre 80° y 90°: la cumbrera va de fondo, no con la calle) | **no** |
| Aleros fuera de la calle | **138 casas** con techo sobre la calzada (49 con más de 1 m²) | **no** |
| Mismo trazado que la fase 5 | las fases 3, 4 y 5 cierran sobre la misma ciudad | sí |

`fase_6_cerrable: false`.

La línea base de T33j.1l (271 pares con corte en 1811 casas) era de B1772-001. Esta ciudad tiene 6317 casas con techo: la reconstrucción de las fases 4 y 5.

## Lo que sigue

- Separar las causas de los 813 cruces: huellas que se pisan en planta tras simplificar (`TOLERANCIA_HUELLA_M`), aleros que montan sobre la vecina y cambios de altura entre casas contiguas.
- Las cumbreras de fondo: casas cuyo marco elige el frente por el lado equivocado (`elegirFrente`).
- Los triángulos degenerados y los aleros sobre la calzada.
- La regla de specs/08 vale: un PR de techos no cambia calles, lotes ni ocupación para que un techo deje de fallar.

## Reproducir

```
npm run datos -- --desde epocas
node tools/cubiertas.mjs
.venv/bin/python tools/geo/cierre_fase6.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json --datos <release o commit>
```
