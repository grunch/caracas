# Diagnóstico de las huellas y cubiertas de 1772

T33j.1e, continuación de #78. Código geométrico de `main` a94b9b9 y datos B1772-001. **No corrige la ciudad ni completa la fase 1**. Se añade una herramienta de medición que permitirá comprobar las futuras correcciones, junto con [los resultados y casos trazados](diagnostico-huellas.json).

## Qué quedó demostrado

El JSON `fuentes/derivados/epocas/ciudad-estilos.json` contiene exactamente las huellas, los registros de techo y las vidas del paquete B1772-001 al convertirlos a sus tipos binarios. No se presupuso que los derivados locales fueran los del sitio: se compararon sus arrays con el paquete fijado por hash.

De 1.811 huellas visibles en época 1, ninguna es inválida según Shapely. Hay 2.350 pares con intersección mayor de 0,01 m²; el máximo es 9,763017 m². Cada par pertenece a una misma cuadra de la etapa anterior a épocas. Una medianera compartida de área cero queda excluida. El umbral es de detección, no de aceptación histórica ni geométrica.

El visor produce cubiertas para esas 1.811 entradas. Sus proyecciones tienen 1.020 pares con área común mayor de 0,01 m²; no se encontraron triángulos con área 3D menor de 1e-8 m². Estos datos **no** demuestran que todos los pares sean errores: falta comprobar alturas, aleros y descartes de shader junto a hitos. Un techo puede tener forma incorrecta sin contener triángulos degenerados.

Las vistas en planta de Norte de Plaza y Seminario permitieron localizar dos defectos visibles ya registrados:

| Incidencia | Registros finales | Registros anteriores a épocas | Localización de la causa |
|---|---|---|---|
| I1772-001 | 33285–33287 | 34071–34073 | Cuadra 8090, junta 22, `antes=1`: la abertura y contornos quebrados están en las huellas reconstruidas, antes de hacer cubiertas. |
| I1772-003 | 33079, 33080, 33084 | 33865, 33866, 33870 | Cuadra 8085, junta 17, `antes=1`: el quiebre y el cuerpo diagonal también están en la huella. |

No son IDs permanentes: cada número depende del hash de entrada. La correspondencia entre etapas usa semilla **y todos los vértices**; la semilla sola no identifica una casa. Los atributos de estilos cambian entre etapas y no se usan para esa correspondencia.

La operación concreta aún requiere reproducción: `vectorizar._cuadras_de_antes` construye máscaras históricas a partir de clases de 1936 y después `casas_por_lados` elige entre reparto vectorial y raster. `poligono_de` aplica un buffer independiente y simplifica los contornos raster. Son puntos de investigación, no una atribución ya probada de todos los defectos al buffer.

## Medición reproducible

Desde la raíz del repo, con los derivados y datos de B1772-001:

```sh
.venv/bin/python tools/geo/auditar_huellas.py fuentes/derivados/epocas/ciudad-estilos.json .cache/huellas-1772.json --epoca 1 --metro .5
```

El informe incluye hash del JSON, época, escala, umbral, índices originales, áreas y motivos de invalidez. No repara polígonos ni modifica la entrada. El CLI crea directorios y genera bytes idénticos al repetir con los mismos datos. Tests cubren contacto sin solape, filtro temporal, unidades, polígonos inválidos, intervalos incorrectos, coordenadas no finitas, límites y reproducción del CLI.

Para verificar correspondencia con el paquete y rastrear las mayores intersecciones, guardar este bloque como `.cache/trazar-solapes.py` y ejecutar con Python del proyecto:

```python
import gzip,json,struct,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon
r=Path.cwd(); p=Path('public/datos/ciudad.pak');raw=gzip.decompress(p.read_bytes());n=struct.unpack('<I',raw[:4])[0];h=json.loads(raw[4:4+n]);off=4+n;parts={}
for t in h['partes']:
 b,reg=t['bytes'],t['registro'];a=np.frombuffer(raw[off:off+b],np.uint8).reshape(reg,-1).T.copy();off+=b
 if t['nombre'] in ['vertices','techos','vida']:parts[t['nombre']]=a.view('<f4' if t['nombre']=='vertices' else '<u4').ravel()
d=json.loads((r/'fuentes/derivados/epocas/ciudad-estilos.json').read_text());s=json.loads((r/'fuentes/derivados/1936/ciudad-1936.json').read_text())
expected=np.array([[a,b,c+(e<<8),f] for a,b,c,e,f in d['techos']],dtype='<u4').ravel()
assert np.array_equal(expected,parts['techos']);assert np.array_equal(np.array(d['vertices'],dtype='<f4'),parts['vertices']);assert np.array_equal([n+8*m for n,m in d['vida']],parts['vida'])
print('Huellas, techos y vida coinciden con pak',hashlib.sha256(p.read_bytes()).hexdigest())
# Match source using complete polygon bytes and metadata, not nonunique seeds.
def key(city,t):
 a,n,*rest=t;return (rest[-1],tuple(city['vertices'][a*2:(a+n)*2]))
lookup={key(s,t):i for i,t in enumerate(s['techos'])};report=json.loads(Path('.cache/huellas-1772.json').read_text());pairs=sorted(report['solapes'],key=lambda x:-x['area_m2']);marcos={m[0]:m for m in d['marcos']}
for pair in pairs[:8]:
 print(pair)
 for i in pair['techos']:
  source=lookup.get(key(d,d['techos'][i]));m=marcos.get(i);print(' final',i,'1936',source,'cuadra',s['cuadras'][source] if source is not None else None,'marco',m[:9] if m else None)
```

Para medir la salida real de `extruirTechos`, guardar como `.cache/medir-cubiertas.mjs` y ejecutar `node --max-old-space-size=8192 .cache/medir-cubiertas.mjs`. Se extruyen **todas** las épocas para conservar el índice de vecinos del visor y se filtran después los triángulos de época 1. Se excluyen paredes, patios y solares. Los hitos no forman parte de esa malla.

```javascript
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {decodificarPak} from '../src/pak.js';
import {extruirTechos} from '../src/ciudad.js';
import {crearCoords} from '../src/coords.js';
const raw=gunzipSync(readFileSync('public/datos/ciudad.pak'));
const datos=decodificarPak(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),{vertices:Float32Array,techos:Uint32Array,vida:Uint32Array,historia:Uint8Array,marcos:Float32Array,alas:Float32Array});
const coords=crearCoords({ancho:20000,alto:20000,metro:.5,plaza:[8968.2,6839]});
const key=(x,z)=>`${Math.fround(x)},${Math.fround(z)}`;
const ids=new Map();
for(let t=0;t<datos.techos.length;t+=4){let x=0,z=0;const s=datos.techos[t],n=datos.techos[t+1];for(let k=0;k<n;k++){const p=coords.aMundo(datos.vertices[(s+k)*2],datos.vertices[(s+k)*2+1]);x+=p.x/n;z+=p.z/n;}const tag=key(x,z);if(ids.has(tag))throw Error('Ancla duplicada');ids.set(tag,t/4);}
const g=extruirTechos(datos,coords);const groups=new Map();let degenerados=0;
for(let j=0;j<g.indices.length;j+=3){const vs=[...g.indices.slice(j,j+3)],v=vs[0],n=g.vidas[v*2],m=g.vidas[v*2+1];if(n>1||(m&&m<=1)||![1,2,3,4,8].includes(g.cubiertas[v*4+3]))continue;const id=ids.get(key(g.anclas[v*2],g.anclas[v*2+1]));if(id===undefined)throw Error('Ancla sin índice');const ps=vs.map(i=>[g.posiciones[i*3],g.posiciones[i*3+1],g.posiciones[i*3+2]]);const [a,b,c]=ps;const u=b.map((x,k)=>x-a[k]),w=c.map((x,k)=>x-a[k]);const cross=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];if(Math.hypot(...cross)/2<1e-8)degenerados++;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(ps);}
writeFileSync('.cache/cubiertas-1772.json',JSON.stringify({degenerados,casas:[...groups].map(([id,triangulos])=>({id,triangulos}))}));console.log({casas:groups.size,degenerados});
```

Después, guardar como `.cache/solapes-cubiertas.py` y ejecutar con Python del proyecto:

```python
import json
from pathlib import Path
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.strtree import STRtree
p=Path('.cache');d=json.loads((p/'cubiertas-1772.json').read_text());ids=[];figuras=[]
for casa in d['casas']:
 triangulos=[Polygon([(x,z) for x,y,z in t]) for t in casa['triangulos']]
 figuras.append(unary_union([t for t in triangulos if t.area>1e-10]));ids.append(casa['id'])
arbol=STRtree(figuras);pares=[]
for i,f in enumerate(figuras):
 for j in arbol.query(f,predicate='intersects'):
  if j<=i:continue
  a=f.intersection(figuras[j]).area
  if a>.01:pares.append({'techos':[ids[i],ids[j]],'area_proyectada_m2':round(a,6)})
r={'casas':len(ids),'triangulos_degenerados_3d':d['degenerados'],'umbral_area_m2':.01,'pares':sorted(pares,key=lambda x:-x['area_proyectada_m2'])};(p/'solapes-cubiertas.json').write_text(json.dumps(r,indent=2)+'\n');print('Cubiertas con área proyectada común:',len(pares));print(r['pares'][:10])
```

Las vistas locales `.cache/norte-plaza-geometria.png`, `.cache/camejo-cruz-verde-geometria.png` y `.cache/seminario-geometria.png` dibujan esa salida en planta con etiquetas de índice; el contorno rojo es la referencia curada, no un bordillo medido. Se observaron Norte de Plaza y Seminario. Las imágenes y arrays generados quedan fuera de git.

## Reproducción aislada de la exclusión de terreno

En una ventana de Norte de Plaza, usando la cara curada del censo y `clases-costura.png`, `_cuadras_de_antes` excluye 1.556 píxeles clasificados como `cerro` dentro del contorno ajustado, aunque la manzana está declarada completa. La máscara resultante hace que `huellas_de_manzana` rechace el reparto vectorial. La exclusión sigue directamente de `cuadra = en_poligono & (de_manzana | calle)`: `cerro` no está en ninguno de esos grupos.

Es una reproducción aislada de la operación, con una única etiqueta de manzana y la cara curada; **no** reproduce exactamente la red y componentes de toda la ejecución original. Confirma el mecanismo, no el conteo global afectado. En la ventana de Seminario el mismo procedimiento no produce faltantes interiores y admite reparto vectorial: no se extiende esa causa a I003.

Guardar como `.cache/aislar-mascara.py` y ejecutar con Python del proyecto:

```python
import sys,json
from pathlib import Path
import numpy as np
from PIL import Image
from shapely.geometry import Polygon
from types import SimpleNamespace
sys.path.insert(0,'tools/geo')
from vectorizar import _cuadras_de_antes,DE_LA_MANZANA
from huellas import huellas_de_manzana
Image.MAX_IMAGE_PIXELS=None
root=Path('fuentes/derivados/1936')
image=Image.open(root/'segmentacion/mosaico/clases-costura.png');ed=Image.open(root/'edificado-1772.png')
ms=json.loads(Path('specs/auditoria-1772/manzanas.json').read_text())['manzanas']
for m in [ms[0],ms[9]]:
 p=Polygon(m['mosaico']);x0,y0,x1,y1=p.buffer(5).bounds;rect=(int(x0),int(y0),int(x1)+1,int(y1)+1);origin=np.array(rect[:2]);p=Polygon(np.array(m['mosaico'])-origin)
 cl=np.array(image.crop(rect));e=np.array(ed.crop(rect))>0;labels=np.isin(cl,DE_LA_MANZANA).astype(np.int32);areas={1:int(labels.sum())}
 groups=_cuadras_de_antes(SimpleNamespace(caras72=[p]),e,cl,labels,areas,.5,[p])
 for g in groups:
  x,y=g['origen'];h,w=g['cuadra'].shape;terrain=cl[y:y+h,x:x+w]==8
  exact=huellas_de_manzana(g['cuadra'],g['poligono'],.5,0)
  print(m['id'],'cerro_en_ventana',int(terrain.sum()),'cerro_incluido',int((terrain&g['cuadra']).sum()),'reparto_vectorial',exact is not None)
  from lados import _relleno
  interior=_relleno(g['poligono'],g['cuadra'].shape)
  print('cerro_dentro_poligono',int((terrain&interior).sum()),'faltante',int((interior&~g['cuadra']).sum()))
```

Para la futura corrección de ocupación (fase 4), la referencia de manzana completa debe prevalecer sobre una exclusión heredada, pero la decisión debe limitarse al área y ocupación históricamente verificadas. No se propone convertir todos los cerros o terrenos libres en casas.

## Diez contornos y cuarenta frentes del núcleo

Se repitió el aislamiento usando ahora las caras de `tramos.json`. En las diez manzanas, cuatro casos rechazan el reparto vectorial: Norte de Plaza, Catedral, Camejo–Cruz Verde y Seminario. Las primeras tres tienen exclusiones interiores de clase `cerro` (1.556, 7.489 y 998 píxeles, respectivamente). Catedral es un conjunto especial: ese número no autoriza rellenar su solar con casas.

Seminario no tiene píxeles interiores faltantes en esta reproducción, pero su cara ajustada tiene **ocho vértices**: conserva un entrante de la red actual junto al frente oeste. Con la cara curada de cuatro lados admite reparto vectorial; con la cara heredada, no. La referencia de manzana completa actualmente cambia la máscara de plaza vieja, pero no sustituye la cara de la red. Esto localiza una causa de contorno para fase 3, distinta de la ocupación excluida de fase 4.

También se midieron los orígenes de marcos candidatos de los 40 frentes. La asignación usa contención en la cara, ángulo de hasta 15° y una banda de hasta 20 m: **umbrales de búsqueda**, no tolerancias admisibles. Las distancias firmadas de los orígenes respecto de un mismo frente tienen dispersión de 7,0025 m en F1772-0001-3, 4,2275 m en F1772-0010-2 y 7,4783 m en F1772-0010-3. Los otros 37 grupos quedan por debajo de 0,006 m. No certifica sus fachadas: mide marcos y depende de la asignación propuesta; esquinas y cuerpos especiales requieren revisión.

Para repetir los diez contornos, guardar como `.cache/contornos-diez-manzanas.py`:

```python
import sys,json
from pathlib import Path
import numpy as np
from PIL import Image
from shapely.geometry import Polygon
from types import SimpleNamespace
sys.path.insert(0,'tools/geo')
from vectorizar import _cuadras_de_antes,DE_LA_MANZANA
from huellas import huellas_de_manzana
from caras import Red
red_real=Red(json.loads(Path("fuentes/derivados/1936/tramos.json").read_text())["tramos"])
Image.MAX_IMAGE_PIXELS=None
root=Path('fuentes/derivados/1936')
image=Image.open(root/'segmentacion/mosaico/clases-costura.png');ed=Image.open(root/'edificado-1772.png')
ms=json.loads(Path('specs/auditoria-1772/manzanas.json').read_text())['manzanas']
resultados=[]
for m in ms:
 curada=Polygon(m['mosaico']);cara=max(red_real.caras72,key=lambda f:f.intersection(curada).area);p=cara;x0,y0,x1,y1=p.buffer(5).bounds;rect=(int(x0),int(y0),int(x1)+1,int(y1)+1);origin=np.array(rect[:2]);p=Polygon(np.array(cara.exterior.coords)-origin);curada=Polygon(np.array(m['mosaico'])-origin)
 cl=np.array(image.crop(rect));e=np.array(ed.crop(rect))>0;labels=np.isin(cl,DE_LA_MANZANA).astype(np.int32);areas={1:int(labels.sum())}
 groups=_cuadras_de_antes(SimpleNamespace(caras72=[p]),e,cl,labels,areas,.5,[curada])
 for g in groups:
  x,y=g['origen'];h,w=g['cuadra'].shape;terrain=cl[y:y+h,x:x+w]==8
  exact=huellas_de_manzana(g['cuadra'],g['poligono'],.5,0)
  print(m['id'],'cerro_en_ventana',int(terrain.sum()),'cerro_incluido',int((terrain&g['cuadra']).sum()),'reparto_vectorial',exact is not None)
  from lados import _relleno
  interior=_relleno(g['poligono'],g['cuadra'].shape)
  resultados.append({'manzana':m['id'],'vertices_cara_red':len(cara.exterior.coords)-1,'vertices_contorno_ajustado':len(g['poligono']),'contorno_ajustado_mosaico':(g['poligono']+origin+(x,y)).tolist(),'cerro_interior_excluido_px':int((terrain&interior&~g['cuadra']).sum()),'faltante_interior_px':int((interior&~g['cuadra']).sum()),'reparto_vectorial':exact is not None})
  print('vertices_ajustados',len(g['poligono']),'poligono', (g['poligono']+origin+(x,y)).tolist());print('cerro_dentro_poligono',int((terrain&interior).sum()),'faltante',int((interior&~g['cuadra']).sum()))

Path(".cache/contornos-diez-manzanas.json").write_text(json.dumps(resultados,ensure_ascii=False,indent=2)+"\n")
```

Para repetir los 40 frentes, guardar como `.cache/medir-frentes.py`:

```python
import json,math
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,Point,LineString
city=json.loads(Path('fuentes/derivados/epocas/ciudad-estilos.json').read_text())
ms=json.loads(Path('specs/auditoria-1772/manzanas.json').read_text())['manzanas'];rows=[]
for m in ms:
 poly=Polygon(m['mosaico']); lados=[(np.array(m['mosaico'][k]),np.array(m['mosaico'][(k+1)%4])) for k in range(4)];by=[[] for _ in lados]
 for marco in city['marcos']:
  i,x,y,ux,uy,*_=marco;nace,muere=city['vida'][i]
  if nace>1 or (muere and muere<=1) or not poly.covers(Point(x,y)):continue
  o=np.array([x,y]);eu=np.array([ux,uy]);candidates=[]
  for k,(a,b) in enumerate(lados):
   u=(b-a)/np.linalg.norm(b-a);cos=abs(np.dot(eu,u)/np.linalg.norm(eu));angle=math.degrees(math.acos(min(1.,cos)))
   if angle<=15:candidates.append((LineString([a,b]).distance(Point(o)),k,angle))
  if not candidates:continue
  distance,k,angle=min(candidates)
  # A 20 m search strip proposes membership; it is not an alignment tolerance.
  if distance*.5>20:continue
  a,b=lados[k];u=(b-a)/np.linalg.norm(b-a);signed=(u[0]*(o-a)[1]-u[1]*(o-a)[0])*.5
  by[k].append({'techo':i,'origen_mosaico':[x,y],'distancia_firmada_m':round(signed,4),'angulo_grados':round(angle,4)})
 for k,values in enumerate(by):
  offsets=[v['distancia_firmada_m'] for v in values]
  rows.append({'frente':m['frentes'][k]['id'],'manzana':m['id'],'candidatos':values,'dispersion_origenes_m':round(max(offsets)-min(offsets),4) if offsets else None})
Path('.cache/medicion-frentes.json').write_text(json.dumps({'metodo':'Orígenes de marcos visibles dentro de la cara curada; dirección <=15 grados y distancia <=20 m solo proponen asignación. Dispersión de distancia firmada respecto al lado, no validación histórica ni pared renderizada.','frentes':rows},ensure_ascii=False,indent=2)+'\n')
for r in rows:print(r['frente'],len(r['candidatos']),r['dispersion_origenes_m'])
```

## Subtareas que habilita el diagnóstico

1. Reproducir máscara y selección de rama de I001/I003 con ventanas pequeñas y entradas fijadas. Comprobar la continuidad del frente en el original; no rellenar patios ni plazas para eliminar el fallo.
2. En fase 5, corregir el reparto responsable de frentes quebrados y medianeras con área común, manteniendo el trazado aprobado por fases 2–3.
3. En fase 6, repetir el análisis sobre cubiertas y comprobar las superficies 3D, separando aleros de intersecciones indebidas.
4. En fase 7, comprobar cierres y accesos con la geometría visible y las colisiones. La proyección de cubiertas no demuestra que una persona pueda atravesar el hueco.

Siguen pendientes el enlace de todos los frentes del original y la inspección de accesos. No se modifica la puerta de salida del plan para dar por completa una auditoría parcial.
