# Frentes candidatos enlazados a la red del original

T33j.1f. Continuación del trazado #78 y del diagnóstico de huellas. Esta entrega enlaza 147 caras candidatas con 590 bordes, conserva los 40 IDs de frente previos y registra los pendientes. No son 147 manzanas aprobadas ni 590 fachadas comprobadas: los polígonos siguen los ejes aproximados de las calles y pueden contener plazas o edificios aislados.

## Revisión del trazado

Se revisaron los 16 paneles del original con las caras superpuestas. Se añadió L1772-0085, la calle visible entre U1772-0012 y U1772-0013, y se completaron extremos en cruces visibles: sectores superiores del damero, Calvario y borde inferior. El tramo vertical de x=570 se prolonga hasta y=395; no se prolonga la calle horizontal a través del espacio abierto del Calvario. Tres extremos de x=1440 pasan a x=1439 para coincidir con el eje ya trazado. No se aplicó un cierre automático por distancia ni se conectaron ríos.

La red pasa de 84 a 85 líneas y de 455 a 470 tramos. Se conservan los IDs de los tramos sin cambios y los desplazamientos de extremo de hasta un píxel en la misma línea; 22 tramos sustituidos o divididos quedan registrados como retirados, sin reutilizar sus IDs. Los 32 tramos C del primer lote conservan correspondencia candidata. El margen de búsqueda de 10 px no es una tolerancia de calce aprobada.

## Cobertura y excepciones

La poligonización produce 148 caras cerradas. De ellas, 147 tienen una única unidad candidata según la intersección con la caja del censo; la otra contiene U1772-0003 y U1772-0256, en el espacio abierto del Calvario. Esa cara se conserva como ambigua y no genera frentes asignados. No se convierte un espacio abierto en una manzana llena de casas.

De los 292 registros del censo, 147 tienen cara única, 2 quedan en la cara ambigua y 143 no tienen cara candidata. Estos últimos incluyen el registro descartado y el que pertenece a otra unidad, además de periferias, cuerpos aislados y bordes no cerrados por la red. Hay 115 tramos sin frente enlazado. Los pendientes permanecen enumerados en el JSON; la fase 1 sigue abierta.

Se mantienen, entre otras, las excepciones ya registradas: la unidad alargada U1772-0036, U1772-0151 sin calle atravesando su área roja, los cuerpos aislados de U1772-0214 (Candelaria) y los bordes de quebradas. La forma del eje no sustituye el entrante de una plaza o el borde construido de un conjunto religioso. La ocupación de la unidad no se propaga automáticamente a todos sus frentes.

## Archivos y controles

- `trazado-calles-original.json`: lectura manual de ejes en píxeles del original.
- `tramos-candidatos-original.json`: división entre cruces, hash de entrada, IDs retirados y correspondencias.
- `frentes-caras-candidatas.json`: 147 caras, 590 bordes, relación con los 470 tramos y pendientes explícitos.

Los IDs nuevos de caras y frentes incorporan el ID U para no depender del orden de enumeración. Los 40 IDs F anteriores se conservan mediante correspondencia con sus calles del primer lote. No se sustituyen las coordenadas curadas de `manzanas.json` con estos ejes.

Se comprueban JSON válidos, IDs únicos, 40 IDs F conservados, referencias existentes, caras válidas, máximo dos unidades por tramo, ausencia de solapes lineales y repetición idéntica de los archivos derivados. Estos controles no certifican fidelidad histórica ni acceso a pie. Solo cambia documentación de auditoría; no cambia el generador ni los datos publicados.

## Reproducción

Desde la raíz del checkout, crear `.cache/` y obtener la base de IDs exacta:

```sh
mkdir -p .cache
git show a94b9b9:specs/auditoria-1772/tramos-candidatos-original.json > .cache/tramos-base.json
```

Guardar los siguientes bloques con el nombre indicado y ejecutarlos, en orden, con el Python del proyecto (Shapely 2.2.0). El procedimiento anterior de `trazado-red.md` describe la entrega #78; no debe usarse para renumerar esta ampliación.

### `.cache/dividir-red.py`

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
previous=json.loads(Path('.cache/tramos-base.json').read_text())
used=set(); next_id=max(int(t['id'].split('-')[1]) for t in previous['tramos'])+1
for t in tramos:
 g=LineString(t['original'])
 candidates=[x for x in previous['tramos'] if x['id'] not in used and x['linea']==t['linea'] and g.hausdorff_distance(LineString(x['original']))<1e-6]
 if not candidates:
  candidates=[x for x in previous['tramos'] if x['id'] not in used and x['linea']==t['linea'] and g.hausdorff_distance(LineString(x['original']))<=1.01 and abs(g.length-LineString(x['original']).length)<=1.01]
 if len(candidates)==1:t['id']=candidates[0]['id'];used.add(t['id'])
 else:t['id']=f'R1772-{next_id:04d}';next_id+=1
retired=[{'id':x['id'],'linea':x['linea'],'original':x['original'],'motivo':'Tramo sustituido o subdividido al corregir extremos y completar cruces observados; no reutilizar ID.'} for x in previous['tramos'] if x['id'] not in used]
old=json.loads((p/'calles.json').read_text())['calles']
links=[]
for c in old:
 g=LineString(c['original']); ranked=sorted((g.hausdorff_distance(LineString(t['original'])),t['id']) for t in tramos)
 score,r=ranked[0]
 links.append({'calle':c['id'],'tramo_candidato':r if score<=10 else None,'distancia_hausdorff_px':round(score,3),'estado':'candidato_pendiente_validacion' if score<=10 else 'sin_candidato_en_10_px'})
result={'fuente':'trazado-calles-original.json','fuente_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'completo':False,'tramos_retirados':retired,'base_ids_commit':'a94b9b9','metodo':'Partición en intersecciones geométricas exactas mediante Shapely 2.2.0; sin ajustar extremos próximos ni conectar agua. R son candidatos de auditoría: no reemplazan IDs C ni N. Umbral de 10 px solo propone correspondencias, no aprueba calce.','solapes_lineales':overlaps,'correspondencias_primer_lote':links,'tramos':tramos}
(p/'tramos-candidatos-original.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('lineas',len(lines),'tramos',len(tramos),'solapes',len(overlaps),'correspondencias',sum(l['tramo_candidato'] is not None for l in links),'de',len(links))
```

### `.cache/caras-original.py`

```python
import json
from pathlib import Path
from shapely.geometry import LineString,box
from shapely.ops import unary_union,polygonize
p=Path('specs/auditoria-1772');lines=json.loads((p/'trazado-calles-original.json').read_text())['lineas'];units=json.loads((p/'unidades-original.json').read_text())['unidades']
faces=sorted(polygonize(unary_union([LineString(l['puntos']) for l in lines])),key=lambda f:(round(f.centroid.y,6),round(f.centroid.x,6)))
rows=[]
for i,f in enumerate(faces):
 matches=[]
 for u in units:
  if u['revision_original']['ocupacion'] in ['parte_de_otra_unidad','descartada_no_edificacion']:continue
  b=box(*u['bbox_original']);area=f.intersection(b).area
  if area/b.area>.5:matches.append({'unidad':u['id_fuente'],'fraccion_caja':round(area/b.area,4),'ocupacion':u['revision_original']['ocupacion']})
 rows.append({'id':f'G1772-{i+1:04d}','original':[list(v) for v in f.exterior.coords][:-1],'unidades_candidatas':matches})
linked={u['unidad'] for r in rows for u in r['unidades_candidatas']}
result={'completo':False,'metodo':'Caras cerradas por intersecciones exactas de las líneas registradas. Sin snapping, prolongaciones ni puentes. Solape >50% de caja solo propone correspondencia. No equivale a manzana aprobada.','caras':rows,'unidades_sin_cara_candidata':[u['id_fuente'] for u in units if u['id_fuente'] not in linked]}
Path('.cache/caras-original.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print('caras',len(rows),'unidades enlazadas',len(linked),'sin cara',len(result['unidades_sin_cara_candidata']));print('caras con varias',[(r['id'],[u['unidad'] for u in r['unidades_candidatas']]) for r in rows if len(r['unidades_candidatas'])!=1])
```

### `.cache/enlazar-frentes.py`

```python
import json
from pathlib import Path
from shapely.geometry import LineString,Polygon
p=Path('specs/auditoria-1772');candidates=json.loads(Path('.cache/caras-original.json').read_text());old=json.loads((p/'calles.json').read_text())['calles'];streets={x['id']:LineString(x['original']) for x in old};ms=json.loads((p/'manzanas.json').read_text())['manzanas'];byunit={m['id_fuente']:m for m in ms};tramos=json.loads((p/'tramos-candidatos-original.json').read_text())['tramos'];rows=[]
def clean(v):
 changed=True
 while changed:
  changed=False
  for i,b in enumerate(v):
   a=v[i-1];c=v[(i+1)%len(v)]
   if abs((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]))<1e-7:
    v=v[:i]+v[i+1:];changed=True;break
 k=min(range(len(v)),key=lambda i:(v[i][1],v[i][0]));return v[k:]+v[:k]
for face in candidates['caras']:
 if len(face['unidades_candidatas'])!=1:continue
 uid=face['unidades_candidatas'][0]['unidad'];points=clean(face['original']);frentes=[]
 for k,a in enumerate(points):
  b=points[(k+1)%len(points)];edge=LineString([a,b]);fid=f'F1772-U{uid[6:]}-{k}';previous=None
  if uid in byunit:
   ranked=sorted((edge.hausdorff_distance(streets[f['calle']]),f['id']) for f in byunit[uid]['frentes'])
   if ranked[0][0]<=10:fid=ranked[0][1];previous='manzanas.json'
  rs=[r['id'] for r in tramos if edge.buffer(1e-5).intersection(LineString(r['original'])).length>1e-4]
  assert rs,(uid,k)
  frentes.append({'id':fid,'original':[a,b],'tramos_candidatos':rs,'procedencia_id_previo':previous,'estado':'borde_de_cara_pendiente_validacion_de_ocupacion_y_acceso'})
 rows.append({'id':'G1772-U'+uid[6:],'unidad':uid,'original':points,'ocupacion_unidad':face['unidades_candidatas'][0]['ocupacion'],'frentes':frentes,'estado':'cara_cerrada_candidata_no_geometria_aprobada'})
links=[]
for r in tramos:
 borders=[f['id'] for row in rows for f in row['frentes'] if r['id'] in f['tramos_candidatos']]
 assert len({row["unidad"] for row in rows for f in row["frentes"] if f["id"] in borders})<=2
 links.append({'tramo':r['id'],'frentes_candidatos':borders,'estado':'pendiente_contraste_sistema'})
result={'completo':False,'metodo':'Caras cerradas del esbozo sin unir extremos por proximidad. Una caja con >50% de área dentro propone unidad; no certifica contorno ni ocupación por frente. Se eliminan solo vértices colineales. Los IDs previos de los 40 frentes se conservan por correspondencia geométrica.','caras':rows,'caras_ambiguas':[f for f in candidates['caras'] if len(f['unidades_candidatas'])!=1],'tramos':links,'unidades_sin_cara_candidata':candidates['unidades_sin_cara_candidata']}
(p/'frentes-caras-candidatas.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print('caras',len(rows),'frentes',sum(len(r['frentes']) for r in rows),'ids_previos',sum(bool(f['procedencia_id_previo']) for r in rows for f in r['frentes']),'tramos dos frentes',sum(len(l['frentes_candidatos'])==2 for l in links))
```
