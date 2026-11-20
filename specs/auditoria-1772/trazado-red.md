# Trazado del original y división entre cruces

Continuación de T33j.1c, sobre `main` c2a43ca, después de integrar #76 y #77. **Fase 1 aún abierta**. Este lote registra la lectura de calles en el original; no modifica la ciudad generada.

## Entrega

- [84 líneas de referencia](trazado-calles-original.json), con IDs L estables, coordenadas del original y tipo de circulación. Se recorrieron las sobreposiciones de los 16 sectores a escala 3×. Incluyen los caminos de La Vega, Catia, La Guayra y El Valle; sus extremos no implican puentes.
- [455 tramos candidatos](tramos-candidatos-original.json), con IDs R, divididos en intersecciones geométricas. Los vértices de una curva no se convierten por sí mismos en cruces. No se ajustan extremos próximos automáticamente.
- 32 correspondencias propuestas con los 32 IDs C existentes, sin reutilizar un candidato para dos calles. Se conserva el catálogo previo. La distancia de Hausdorff de hasta 10 píxeles sirve para proponer correspondencias; no mide la exactitud histórica ni sustituye su revisión.
- Tres posibles pasos de agua registrados por su dibujo rectangular. Permanecen separados de la red: falta comprobar sus extremos y ancho.
- Dos trazos de ribera descartados como ejes de calle: la superposición mostró que cruzaban agua y rojo. Se guardan aparte para que el descarte sea auditable.

No son 455 calles históricas certificadas. El resultado incluye subdivisiones del esbozo, espacios abiertos y accesos sin salida. Las discrepancias de algunos extremos, las riberas y la distinción entre plaza y calle siguen pendientes. Los márgenes de lectura propuestos de cada línea no son errores medidos ni autorizan ensanchar calles.

## Excepciones preservadas

| Lugar del censo | Decisión de lectura |
|---|---|
| U1772-0036 | Manzana alargada: interrumpir H660 entre x=370 y x=437; no partirla por analogía con las vecinas. |
| U1772-0151 | Acceso corto desde y=1125 hasta aproximadamente y=1145. No atravesar su frente rojo ni prolongarlo hasta y=1191. |
| U1772-0185/0186 | Conservar su longitud; no agregar una calle intermedia. |
| U1772-0187/0188 | Conservar la separación aproximada x=1067 entre ambas tiras. |
| U1772-0214 | Mantener la plaza de Candelaria y sus cuerpos aislados. |
| Calvario y La Pastora | Trazados oblicuos y espacios abiertos: no forzar el damero regular. |

El particionado detectó además que el acceso corto de U1772-0151 estaba duplicado por la prolongación de V702. Se recortó esta última en y=1125. El resultado ya no tiene solapes lineales entre las 84 líneas. Esto verifica consistencia del inventario, no ausencia de edificios dentro de calles en el modelo.

## Reproducción

Usar el original de 1925 × 1734 cuyo SHA-256 figura en el JSON. Las coordenadas no están rotadas: Poniente arriba, Norte a la derecha. Desde la raíz del checkout, con Pillow instalado, ejecutar:

```python
from PIL import Image,ImageDraw,ImageFont
import json
from pathlib import Path
p=Path('specs/auditoria-1772');sectors=json.load(open(p/'sectores.json'))['sectores'];lines=json.load(open(p/'trazado-calles-original.json'))['lineas'];im=Image.open('fuentes/mapas/1772-pares-agi-exato-mapa/original.jpg');out=Path('.cache/calles-paneles');out.mkdir(parents=True,exist_ok=True)
for s in sectors:
 x,y,x1,y1=s['bbox_lectura'];v=im.crop((x,y,x1,y1)).resize(((x1-x)*3,(y1-y)*3));d=ImageDraw.Draw(v)
 for l in lines:
  ps=[((a-x)*3,(b-y)*3) for a,b in l['puntos']];d.line(ps,fill='#005bff',width=2)
  for a,b in ps:d.ellipse((a-3,b-3,a+3,b+3),fill='blue')
 v.save(out/(s['id']+'.png'))
```

Revisar todos los paneles de `.cache/calles-paneles/`, incluido S1772-41 sin líneas. No interpretar una línea azul como aprobación para generación. Las imágenes quedan fuera de git.

El siguiente procedimiento reproduce los tramos y las correspondencias con Shapely 2.2.0. **Solo reproducir sobre esta versión del trazado**: los IDs asignados quedan fijados en el JSON; al editar una línea se debe reconciliar el registro, no renumerar entidades posteriores.

```python
import json, hashlib
from pathlib import Path
from shapely.geometry import LineString
from shapely.ops import substring
p=Path('specs/auditoria-1772')
source=p/'trazado-calles-original.json'
d=json.loads(source.read_text()); lines=[LineString(l['puntos']) for l in d['lineas']]
tramos=[]; overlaps=[]
for i,line in enumerate(lines):
 cuts={0.,line.length}
 for j,other in enumerate(lines):
  if i==j: continue
  intersection=line.intersection(other)
  if intersection.is_empty:continue
  parts=list(intersection.geoms) if hasattr(intersection,'geoms') else [intersection]
  for part in parts:
   if part.geom_type=='Point':cuts.add(line.project(part))
   elif i<j:overlaps.append([d['lineas'][i]['id'],d['lineas'][j]['id']])
 cuts=sorted(cuts)
 for start,end in zip(cuts,cuts[1:]):
  if end-start<1e-7:continue
  g=substring(line,start,end)
  tramos.append({'id':f'R1772-{len(tramos)+1:04d}','linea':d['lineas'][i]['id'],'original':[[round(x,6),round(y,6)] for x,y in g.coords]})
old=json.loads((p/'calles.json').read_text())['calles']
links=[]
for c in old:
 g=LineString(c['original']); ranked=sorted((g.hausdorff_distance(LineString(t['original'])),t['id']) for t in tramos)
 score,r=ranked[0]
 links.append({'calle':c['id'],'tramo_candidato':r if score<=10 else None,'distancia_hausdorff_px':round(score,3),'estado':'candidato_pendiente_validacion' if score<=10 else 'sin_candidato_en_10_px'})
result={'fuente':'trazado-calles-original.json','fuente_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'completo':False,'metodo':'Partición en intersecciones geométricas exactas mediante Shapely 2.2.0; sin ajustar extremos próximos ni conectar agua. R son candidatos de auditoría: no reemplazan IDs C ni N. Umbral de 10 px solo propone correspondencias, no aprueba calce.','solapes_lineales':overlaps,'correspondencias_primer_lote':links,'tramos':tramos}
(p/'tramos-candidatos-original.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('lineas',len(lines),'tramos',len(tramos),'solapes',len(overlaps),'correspondencias',sum(l['tramo_candidato'] is not None for l in links),'de',len(links))
```

## Comprobaciones y trabajo siguiente

Se verificaron JSON, IDs y claves únicos, coordenadas finitas dentro del original, referencias L/R/C, hash de entrada del particionado, ausencia de tramos de longitud cero, cero solapes lineales y 32 correspondencias distintas. La regeneración produce los mismos bytes. No se cambiaron aplicación, generador ni datos publicados; no se ejecutaron suites de aplicación para esta entrega documental.

La puerta de salida de fase 1 sigue requiriendo enlazar los frentes y accesos, distinguir correspondencias confirmadas de las candidatas y localizar las causas en la geometría generada. El recorrido del original y la clasificación de las 292 unidades ya están documentados en #77; este lote amplía las calles, no reinicia ese censo. Las dudas de calce permanecen explícitas y no impiden diagnosticar numéricamente solapes o frentes quebrados dentro del modelo.
