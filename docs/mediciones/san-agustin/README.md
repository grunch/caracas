# Medición de San Agustín

27-11-2026. Build main0c99f37 (`/disco/dev/caracas-base-san-agustin`) frente a rama d79f0ff; geometría/build equivalentes a0c1a92e (último commit solo tests). Capturas y medición utilizan copias independientes de los mismos datos completos del release anterior. No se mezclaron con los derivados en regeneración.

`node tests/e2e/medir-rendimiento.mjs http://127.0.0.1:PUERTO --epoca 1946 --salida ARCHIVO` sobre `vite preview`, puertos5274/5275. Base y rama en serie. Los E2E terminaron antes; se suspendió temporalmente el proceso propio de regeneración y sus hijos durante ambas mediciones, y se reanudaron al terminar. Sin otras tareas propias de pruebas/render simultáneas. SwiftShader,1280×800; **no se midió GPU ni tiempo por cuadro real**.

| Métrica | main | rama | Diferencia |
|---|---:|---:|---:|
| casasMs | 12919 | 13890 | +971 |
| tareaMasLargaMs | 942 | 858 | -84 |
| bytesAlAbrir | 17964471 | 17966287 | +1816 |
| heapMB | 228 | 228 | +0 |
| triangulosCentro | 3858375 | 3870942 | +12567 |
| Geometría en JS (MB) | 177 | 180,3 | +3,3 |
| Llamadas en vista centro | 90 | 90 | 0 |

El tiempo hasta las casas sube971ms (+7,5%) en esta pareja; no se oculta ni se atribuye automáticamente a ruido. El nuevo constructor agrega geometría al worker y a la malla compartida; una sola pareja no permite separar cuánto de la variación temporal corresponde a esa carga y cuánto al entorno. La tarea máxima baja942→858ms; el heap reportado no cambia. No se afirma ausencia de impacto ni mejora de FPS.

La malla completa agrega12.822 triángulos; el contador visible del centro agrega12.567 por visibilidad/recorte. Los presupuestos de ejecución de carga, tarea larga, bytes y triángulos ya fallan en main y siguen fallando en rama; **no se elevaron**. Los límites unitarios de geometría cambian explícitamente a580.000/1.060.000 para574.738/1.054.111 medidos. Build gzip: entrada339,2→341,0kB, workers159,5→161,0; topes explícitos342/162, servicio1,3<3.

Informes sin modificar: [base.json](base.json), [rama.json](rama.json).
