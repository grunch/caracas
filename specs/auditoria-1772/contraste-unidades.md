# Contraste de las 292 unidades con las huellas de 1772

T33j.1g. Se proyectaron las 1.811 huellas visibles de B1772-001 al original con el TPS inverso actual y se revisaron los 16 paneles. [El registro completo](contraste-unidades.json) conserva candidatos, decisiones y pendientes por unidad. No sustituye la inspección oblicua/de calle ni aprueba el calce.

## Resultado y alcance

Hay 94 cajas de localización con alguna intersección y 198 sin intersección. De estas últimas, 71 son terrenos libres, 70 ocupaciones parciales, 29 continuas, 20 aisladas, 5 conjuntos especiales, 1 plaza, 1 parte de otra unidad y 1 registro descartado. **No son 198 manzanas omitidas**. Las cajas no son contornos construidos y la proyección sigue un calce que discrepa con los controles del núcleo (I010). Los hitos y descartes del shader no están incluidos en las huellas ordinarias.

Se observan límites extensos de generación junto a unidades rojas del original, especialmente Calvario y Candelaria. También se observan huellas cruzando calles bajo esta proyección; no se pueden atribuir todas a un error de reparto, porque las dos referencias de calce no están reconciliadas. En terrenos libres, U0142 tiene dos intersecciones marginales sin centroides dentro y U0287 tiene siete centroides candidatos: quedan como casos de calce/contorno, no se valida allí edificación histórica.

Las capturas del visor de S1772-12 y S1772-43, registradas en el censo anterior, se volvieron a observar: muestran grandes áreas sin casas levantadas y trazas del plano base en el suelo. Esto respalda I007/I008; no se cuentan esas trazas planas como edificios de 1772. Los paneles nuevos son proyecciones geométricas en planta, no capturas del render.

## La regla temporal oculta edificación temprana

`epocas.nace` exige que la huella esté edificada en una época **y en todas las posteriores**. Una ausencia en 1843 puede retrasar hasta 1889 una huella cuya máscara de 1772 sí está edificada. Esto es una regla de persistencia del pipeline, no evidencia histórica de que el solar estuviera vacío en 1772. Tampoco prueba que deba copiarse en 1772 el edificio de 1936.

Se regeneraron las cuatro máscaras desde los calzados locales, identificados por hash, y se midieron 138 registros candidatos de seis unidades. [Los resultados](ausencias-rastreadas.json) conservan fracciones, índices de ambas etapas, cuadra, junta, vida actual y nacimiento por persistencia. Son una reproducción parcial de la decisión, anterior al cierre de cuadras y a las juntas; no una regeneración completa ni una certificación de que esos calzados produjeran B1772-001.

| Unidad | Registros candidatos | Más de la mitad edificada en máscara 1772 | De ellos, persistencia los retrasa |
|---|---:|---:|---:|
| U0012, Calvario | 16 | 16 | 6 |
| U0035, ribera | 35 | 19 | 6 |
| U0151, manzana alargada | 32 | 26 | 17 |
| U0164 | 24 | 22 | 11 |
| U0182, junto a Candelaria | 16 | 16 | 16 |
| U0214, plaza/conjunto Candelaria | 15 | 5 | 5 |

En U0182, el registro final 14569 corresponde al 14689 anterior a épocas, cuadra 3324: las fracciones son `[1, 0, 1, 1]` y `nace` da 3 (1889). Su vida actual también empieza en 3. Las otras 15 huellas candidatas tienen fracción 1772 entre 0,987526 y 1, pero todas fallan en 1843. La cuadra 3324 tiene 47 registros en total: estos 16 no bastan para reproducir el cierre de toda la cuadra. No se atribuye el resultado final de los 138 casos solo a `nace`.

La corrección de fase 4 debe representar ocupaciones temporales independientes y conservar la edificación documentada de 1772 sin imponer persistencia hasta 1936. Primero necesita el contorno histórico de fases 2–3; cambiar simplemente el año de todas las casas modernas introduciría trazados y edificios posteriores.

## Pendientes concretos

- Reconciliar calce y contorno de las entidades; la intersección de una caja solo propone candidatos.
- Completar los bordes que no forman caras cerradas en la red y clasificar ocupación **por frente**.
- Incorporar hitos y reservas en el contraste; conservar plazas y cuerpos aislados.
- Revisar cubiertas en oblicua y accesos a nivel de calle para los defectos confirmados.
- Regenerar y medir la decisión temporal de la cuadra completa antes de implementar su corrección.

La fase 1 no se declara cerrada por haber completado este barrido espacial. Cada unidad mantiene su estado pendiente explícito.

## Reproducción del sondeo

Desde un checkout que contenga los derivados locales, crear `.cache/` y ejecutar los bloques siguientes con el Python del proyecto. Las imágenes quedan fuera de git. Los hashes del JSON de ciudad, GCP, configuración y calzados están registrados; no usar un release distinto como si fuera esta baseline.

### `.cache/contrastar-unidades.py`

```python
import json,sys,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from shapely.geometry import Polygon,box
from shapely.strtree import STRtree
sys.path.insert(0,'tools/geo')
from calce import Calce
root=Path.cwd();p=Path('specs/auditoria-1772');source=root/'fuentes/derivados/epocas/ciudad-estilos.json';city=json.loads(source.read_text());gcp=Path('tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json');g=json.loads(gcp.read_text());c=Calce.ajustar(g['gcps'],.5,g['suavizado']);vs=np.array(city['vertices']).reshape(-1,2);ids=[i for i,(n,m) in enumerate(city['vida']) if n<=1 and (not m or m>1)];allidx=sorted({j for i in ids for j in range(city['techos'][i][0],sum(city['techos'][i][:2]))});v=vs[allidx];x,y=c.al_viejo(v[:,0],v[:,1]);mapped={idx:(float(xx),float(yy)) for idx,xx,yy in zip(allidx,x,y)};shapes=[];raw=[]
for i in ids:
 a,n=city['techos'][i][:2];points=[mapped[j] for j in range(a,a+n)];raw.append({'techo':i,'original_tps':points});shapes.append(Polygon(points))
assert all(s.is_valid for s in shapes)
tree=STRtree(shapes);units=json.loads((p/'unidades-original.json').read_text())['unidades'];rows=[]
for u in units:
 b=box(*u['bbox_original']);inside=[];touch=[]
 for j in sorted(tree.query(b,predicate='intersects')):
  area=b.intersection(shapes[j]).area
  if area>1e-4:touch.append({'techo':ids[j],'area_original_px2':round(area,4)})
  if b.covers(shapes[j].centroid):inside.append(ids[j])
 rows.append({'unidad':u['id_fuente'],'sector':u['sector'],'ocupacion_original':u['revision_original']['ocupacion'],'bbox_original':u['bbox_original'],'techos_centro_en_caja':inside,'techos_intersectan_caja':touch,'estado':'candidato_espacial_no_correspondencia_aprobada'})
result={'baseline':'B1772-001','ciudad_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'gcp_sha256':hashlib.sha256(gcp.read_bytes()).hexdigest(),'metodo':'Huellas de época 1 proyectadas al original con TPS inverso actual; caja de localización del censo, no contorno. No incluye mallas de hitos ni descartes del shader. Un conteo cero no demuestra una omisión histórica: calce incompatible con referencias curadas en el núcleo.','unidades':rows}
Path('.cache/contraste-unidades.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');Path('.cache/huellas-original-tps.json').write_text(json.dumps(raw)+'\n')
original=Image.open(root/'fuentes/mapas/1772-pares-agi-exato-mapa/original.jpg').convert('RGB');sectors=json.loads((p/'sectores.json').read_text())['sectores'];folder=Path('.cache/contraste-paneles');folder.mkdir(parents=True,exist_ok=True);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
for s in sectors:
 x0,y0,x1,y1=s['bbox_lectura'];scale=3;im=original.crop((x0,y0,x1,y1)).resize(((x1-x0)*scale,(y1-y0)*scale));draw=ImageDraw.Draw(im,'RGBA')
 for j in tree.query(box(x0,y0,x1,y1),predicate='intersects'):
  pts=[((x-x0)*scale,(y-y0)*scale) for x,y in shapes[j].exterior.coords];draw.polygon(pts,fill=(20,70,255,90),outline=(0,40,255,255))
 for u in units:
  a,b,cc,d=u['bbox_original'];cx=(a+cc)/2;cy=(b+d)/2
  if x0<=cx<=x1 and y0<=cy<=y1:
   label=u['id_fuente'][6:];q=((cx-x0)*scale,(cy-y0)*scale);draw.text(q,label,fill='white',stroke_width=2,stroke_fill='black',font=font)
 im.save(folder/(s['id']+'.png'))
print('Unidades',len(rows),'sin centros',sum(not r['techos_centro_en_caja'] for r in rows),'sin intersecciones',sum(not r['techos_intersectan_caja'] for r in rows))
```

### `.cache/sondear-vidas.py`

```python
import json,sys
from pathlib import Path
from collections import Counter
import numpy as np
from shapely.geometry import Polygon,Point,box
from shapely.strtree import STRtree
sys.path.insert(0,'tools/geo');from calce import Calce
p=Path('specs/auditoria-1772');d=json.loads(Path('fuentes/derivados/epocas/ciudad-estilos.json').read_text());g=json.loads(Path('tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json').read_text());c=Calce.ajustar(g['gcps'],.5,g['suavizado']);v=np.array(d['vertices']).reshape(-1,2);centers=np.array([Polygon(v[a:a+n]).centroid.coords[0] for a,n,*rest in d['techos']]);mapped=[]
for chunk in np.array_split(centers,20):
 x,y=c.al_viejo(chunk[:,0],chunk[:,1]);mapped.extend(zip(x,y))
points=[Point(x,y) for x,y in mapped];tree=STRtree(points);rows=[]
for u in json.loads((p/'unidades-original.json').read_text())['unidades']:
 ids=sorted(map(int,tree.query(box(*u['bbox_original']),predicate='covers')));counts=Counter(d['vida'][i][0] for i in ids);rows.append({'unidad':u['id_fuente'],'centros_candidatos_por_nacimiento':dict(sorted(counts.items())),'techos_candidatos':ids})
Path('.cache/vidas-candidatas.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
for r in rows:
 if r['unidad'] in ['U1772-0012','U1772-0035','U1772-0164','U1772-0182','U1772-0001','U1772-0151','U1772-0214']:print(r['unidad'],r['centros_candidatos_por_nacimiento'])
```

### `.cache/rastrear-ausencias.py`

```python
import json,sys,hashlib
from pathlib import Path
import numpy as np
sys.path.insert(0,'tools/geo');from epocas import construido_de_epoca,_huella,fracciones,nace,vida_de_1936,apertura_de_juntas,huellas
root=Path.cwd();p=Path('specs/auditoria-1772');cfg=json.loads(Path('tools/geo/epocas/epocas.json').read_text());d=json.loads((root/'fuentes/derivados/epocas/ciudad-estilos.json').read_text());stage=json.loads((root/'fuentes/derivados/1936/ciudad-1936.json').read_text());rows=json.loads(Path('.cache/vidas-candidatas.json').read_text());wanted={'U1772-0012','U1772-0035','U1772-0164','U1772-0182','U1772-0151','U1772-0214'}
def key(city,t):
 a,n,*rest=t;return rest[-1],tuple(city['vertices'][2*a:2*(a+n)])
lookup={key(stage,t):i for i,t in enumerate(stage['techos'])};selected=[]
for r in rows:
 if r['unidad'] not in wanted:continue
 for i in r['techos_candidatos']:
  k=lookup.get(key(d,d['techos'][i]));
  if k is not None:selected.append({'unidad':r['unidad'],'techo_final':i,'techo_1936':k,'vida_actual':d['vida'][i]})
scale=cfg['escala'];shape=(7400,9300);v=np.array(stage['vertices']).reshape(-1,2);foot=[]
for r in selected:
 a,n=stage['techos'][r['techo_1936']][:2];foot.append(_huella(v[a:a+n],shape,scale))
fra=[];hashes=[]
for e in cfg['epocas'][1:5]:
 print('Máscara',e['año'],flush=True);m=construido_de_epoca(root,e,shape,scale,.5);fra.append(fracciones(foot,[m])[:,0]);hashes.append({'año':e['año'],'calzado_sha256':hashlib.sha256((root/f"fuentes/derivados/{e['año']}/calzado.tif").read_bytes()).hexdigest(),'mascara_sha256':hashlib.sha256(m.tobytes()).hexdigest()})
fr=np.array(fra).T;born=nace(fr,1,.5)
for r,fs,b in zip(selected,fr,born):
 r['fracciones_edificado']=[round(float(x),6) for x in fs];r['nacimiento_por_persistencia']=int(b);r['antes']=stage['antes'][r['techo_1936']];r['junta']=stage['junta'][r['techo_1936']];r['cuadra']=stage['cuadras'][r['techo_1936']]
Path('.cache/ausencias-rastreadas.json').write_text(json.dumps({'metodo':'Máscaras regeneradas desde calzados locales, no presumidas iguales a las usadas para B1772-001. Índices enlazados por semilla y vértices completos. Nacimiento por persistencia antes de cerrar cuadras/juntas, no vida final.','hashes':hashes,'casos':selected},ensure_ascii=False,indent=2)+'\n')
for u in sorted(wanted):
 rr=[r for r in selected if r['unidad']==u];print(u,len(rr),'1772>=.5',sum(r['fracciones_edificado'][0]>=.5 for r in rr),'de esos nacen después',sum(r['fracciones_edificado'][0]>=.5 and r['nacimiento_por_persistencia']>1 for r in rr))
```

Los resultados de `.cache/contraste-unidades.json` y `.cache/vidas-candidatas.json` se enlazan por ID U en el registro publicado, al que se añaden las observaciones de revisión. Las áreas de intersección están en píxeles del original y no son medidas métricas de edificios.
