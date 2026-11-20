# Cruces de superficies de cubierta en 1772

T33j.1l. La proyección de dos techos puede superponerse sin que sus superficies se
corten. Se reconstruyeron las posiciones de 22.387 triángulos de cubierta de las
1.811 casas visibles, aplicando pisos históricos y el relieve del ancla cuantizado
como la textura half-float. Se detectaron **271 pares con corte estricto**, de los
cuales 234 tienen más de 0,01 m² de proyección común de los triángulos que se cortan.
Esta área es una medida de prioridad, no un área física de intersección 3D.

Resultados, umbrales, localización del primer corte y cuatro rastreos al origen:
[cruces-cubiertas-3d.json](cruces-cubiertas-3d.json). La tolerancia de altura es
1 mm y la intersección proyectada mínima, 0,0001 m². Se excluyen contactos de borde
y solapes coplanares; los dos pares coplanares encontrados no se cuentan como fallas.

## Inspección y alcance

Se observaron las capturas oblicuas de 19714–19715 y 14824–14825. Muestran encuentros
de tejados contiguos, cambios de altura y retranqueos locales en fachadas. Las vistas
no permiten por sí solas medir el corte de milímetros; la evidencia del cruce es
el cálculo de planos y sus puntos registrados. No se declara que cada encuentro
visible sea un defecto histórico ni que los 271 pares hayan sido inspeccionados.
Las capturas cenitales están registradas, pero no cuentan como inspeccionadas.

Los cuatro primeros pares se rastrearon por polígono completo y semilla hasta
`ciudad-1936.json`, comprobando antes la igualdad de huellas, techos y vida con el
`.pak` publicado. No se asigna una unidad U del original por proximidad: sigue
pendiente el calce I010. Los IDs de techo son locales a B1772-001.

El cálculo reproduce el shader en CPU; no lee posiciones del GPU. No incluye
hitos, paredes, caras verticales, colisiones ni certifica cumbreras históricas.
Incluye cubiertas superiores codificadas con 8 adicional, no solo tipos 1–4.
Una medición separada entre triángulos de la misma casa no halló cortes estrictos
con estos umbrales; no demuestra ausencia de todo defecto interno.

## Reproducir el cálculo

Desde un checkout con dependencias instaladas y los datos de B1772-001 en `public/`,
crear `.cache/`, guardar los siguientes bloques con sus nombres y ejecutarlos:

```sh
node .cache/exportar-cubiertas-escena.mjs
.venv/bin/python .cache/medir-cruces-3d.py
```

No se regenera ni publica la ciudad. Los scripts y el archivo intermedio quedan
fuera de git. Comparar la salida con el informe, sin confundir los campos de
evidencia documental añadidos posteriormente con resultados del algoritmo.

### `.cache/exportar-cubiertas-escena.mjs`

```js
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {DataUtils} from 'three';
import {decodificarPak} from '../src/pak.js';
import {extruirTechos,historiaEnEpoca} from '../src/ciudad.js';
import {crearCoords} from '../src/coords.js';
import {decodificarRelieve,crearRelieve,muestrear} from '../src/relieve.js';
const buf = p => {const b=readFileSync(p);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
const raw=gunzipSync(readFileSync('public/datos/ciudad.pak'));
const datos=decodificarPak(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),{vertices:Float32Array,techos:Uint32Array,vida:Uint32Array,historia:Uint8Array,marcos:Float32Array,alas:Float32Array});
const coords=crearCoords(JSON.parse(readFileSync('public/datos/ciudad.json')).plano);
const relieve=crearRelieve(decodificarRelieve(buf('public/datos/relieve.bin')),coords.hoja);
const textura={...relieve,alturas:Float32Array.from(relieve.alturas,a=>DataUtils.fromHalfFloat(DataUtils.toHalfFloat(a-relieve.referencia)))};
const altura=(x,z)=>muestrear(textura,(x-coords.hoja.x0)/coords.hoja.ancho,(z-coords.hoja.z0)/coords.hoja.alto);
const key=(x,z)=>`${Math.fround(x)},${Math.fround(z)}`,ids=new Map();
for(let t=0;t<datos.techos.length;t+=4){let x=0,z=0;const s=datos.techos[t],n=datos.techos[t+1];for(let k=0;k<n;k++){const p=coords.aMundo(datos.vertices[(s+k)*2],datos.vertices[(s+k)*2+1]);x+=p.x/n;z+=p.z/n;}const tag=key(x,z);if(ids.has(tag))throw Error('Ancla duplicada');ids.set(tag,t/4);}
const g=extruirTechos(datos,coords),triangulos=[];let descartados=0;
for(let j=0;j<g.indices.length;j+=3){const vs=[...g.indices.slice(j,j+3)],v=vs[0],n=g.vidas[v*2],m=g.vidas[v*2+1],tipo=g.cubiertas[v*4+3];if(n>1||(m&&m<=1)||![1,2,3,4].includes(tipo%8))continue;
const h=historiaEnEpoca([g.historias[v*2],g.historias[v*2+1]],1);if((tipo===4||tipo>=8)&&h.estilo>=1&&h.estilo<=3){descartados++;continue;}
const ax=g.anclas[v*2],az=g.anclas[v*2+1],id=ids.get(key(ax,az));if(id===undefined)throw Error('Ancla desconocida');
const ps=vs.map(i=>[g.posiciones[i*3],g.posiciones[i*3+1]*h.pisos/g.info[i*4+3]+altura(ax,az),g.posiciones[i*3+2]]);
triangulos.push({techo:id,triangulo:j/3,tipo,puntos:ps});}
writeFileSync('.cache/cubiertas-escena-1772.json',JSON.stringify({epoca:1,ola:'finalizada',exageracion:1,metodo:'CPU: pisos históricos, descarte de aleros con pretil y relieve relativo cuantizado half-float como la textura. No equivale a leer posiciones del GPU; tolerancia posterior explícita.',descartados,triangulos}));console.log({triangulos:triangulos.length,descartados});
```

### `.cache/medir-cruces-3d.py`

```python
import json
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString
from shapely.strtree import STRtree
from shapely.ops import unary_union
p=Path('.cache');d=json.loads((p/'cubiertas-escena-1772.json').read_text());ts=[];polys=[];planes=[];deg=0
for t in d['triangulos']:
 a=np.array(t['puntos']);poly=Polygon(a[:,[0,2]])
 if poly.area<1e-7:deg+=1;continue
 plane=np.linalg.solve(np.column_stack([a[:,0],a[:,2],np.ones(3)]),a[:,1]);ts.append(t);polys.append(poly);planes.append(plane)
tree=STRtree(polys);crosses={};flat={};tested=0
for i,poly in enumerate(polys):
 for j in tree.query(poly,predicate='intersects'):
  if j<=i or ts[i]['techo']==ts[j]['techo']:continue
  common=poly.intersection(polys[j])
  if common.area<=1e-4:continue
  tested+=1;points=np.array(common.exterior.coords);delta=planes[i]-planes[j];heights=np.column_stack([points,np.ones(len(points))])@delta;key=tuple(sorted([ts[i]['techo'],ts[j]['techo']]))
  if heights.min() < -.001 and heights.max() > .001:
   normal=delta[:2];norm=np.dot(normal,normal);origin=-delta[2]*normal/norm;v=np.array([-normal[1],normal[0]])/np.sqrt(norm);cut=common.intersection(LineString([origin-1e5*v,origin+1e5*v]));q=cut.representative_point();x,z=q.coords[0];row=crosses.setdefault(key,{'triangulos':0,'areas':[],'primer_corte':{'triangulos':[ts[i]['triangulo'],ts[j]['triangulo']],'punto':[float(x),float(np.dot(planes[i],[x,z,1])),float(z)],'separacion_min_max_m':[float(heights.min()),float(heights.max())]}});row['triangulos']+=1;row['areas'].append(common)
  elif np.max(np.abs(heights))<=.001:flat.setdefault(key,[]).append(common)
rows=[]
for key,v in crosses.items():rows.append({'techos':list(key),'pares_triangulos_con_corte':v['triangulos'],'area_proyectada_de_intersecciones_m2':float(unary_union(v['areas']).area),'primer_corte':v['primer_corte']})
out={'casas':len({t['techo'] for t in ts}),'triangulos':len(ts),'sin_proyeccion_medible':deg,'pares_triangulos_con_area_comun':tested,'umbral_area_m2':1e-4,'tolerancia_altura_m':.001,'limite':'Cruce geométrico entre superficies de casas distintas, con pisos y relieve reproducidos en CPU. No incluye hitos, intersecciones dentro de una misma casa, ni lectura del GPU. Un solape coplanar no se cuenta como corte estricto.','pares_con_corte':sorted(rows,key=lambda x:-x['area_proyectada_de_intersecciones_m2']),'pares_coplanares':[{'techos':list(k),'area_proyectada_m2':float(unary_union(v).area)} for k,v in sorted(flat.items())]};(p/'cruces-cubiertas-3d.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print({k:v for k,v in out.items() if k not in ('pares_con_corte','pares_coplanares')});print('pares con corte',len(rows),'coplanares',len(flat));print(out['pares_con_corte'][:2])
```

## Reproducir el rastreo de origen

Requiere además los derivados de entrada, fuera de git. Guardar este bloque en
`.cache/rastrear-cruces-cubiertas.py` y ejecutar con el directorio que contiene
`fuentes/derivados` como argumento:

```sh
.venv/bin/python .cache/rastrear-cruces-cubiertas.py /ruta/al/checkout-con-fuentes
```

```python
import gzip,json,struct,hashlib,sys
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon
r=Path(sys.argv[1] if len(sys.argv)>1 else '.'); p=Path('public/datos/ciudad.pak');raw=gzip.decompress(p.read_bytes());n=struct.unpack('<I',raw[:4])[0];h=json.loads(raw[4:4+n]);off=4+n;parts={}
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
lookup={key(s,t):i for i,t in enumerate(s['techos'])};report=json.loads(Path('.cache/cruces-cubiertas-3d.json').read_text());pairs=report['pares_con_corte'];marcos={m[0]:m for m in d['marcos']}
for pair in pairs[:4]:
 print(pair)
 for i in pair['techos']:
  source=lookup.get(key(d,d['techos'][i]));m=marcos.get(i);print(' final',i,'1936',source,'cuadra',s['cuadras'][source] if source is not None else None,'marco',m[:9] if m else None)
```
