"""Deriva plantas del control OSM georreferenciado; no modifica los paquetes históricos.
Uso: .venv/bin/python tools/el-silencio-plantas.py
Entrada: fuentes/datos/el-silencio-osm/huellas.json (WGS84 y px, geo1936).
"""
import json, math
from pathlib import Path
from shapely.geometry import Polygon, box
from shapely.geometry.polygon import orient
ROOT=Path(__file__).resolve().parent.parent
huellas=json.loads((ROOT/'fuentes/datos/el-silencio-osm/huellas.json').read_text())
u,v=.9861,.1659;n=math.hypot(u,v);u/=n;v/=n
def local(p):
 x,y=p;return [((x-7900)*u+(y-7400)*v)*.5,(-(x-7900)*v+(y-7400)*u)*.5]
def polys(g):
 if g.is_empty:return []
 return [g] if g.geom_type=='Polygon' else [p for p in g.geoms if p.geom_type=='Polygon']
def anillo(r):return [[round(x,3),round(y,3)] for x,y in list(r.coords)[:-1]]
def serializar(g):
 return [{'exterior':anillo(p.exterior),'patios':[anillo(h) for h in p.interiors]} for p in map(lambda p:orient(p,1),polys(g))]
out={}
for id in range(1,8):
 dato=next(h for h in huellas if h['nombre']==str(id));p=Polygon(list(map(local,dato['px'])))
 patio=next((h for h in huellas if h['nombre']==f'{id}-patio'),None)
 if patio:p=p.difference(Polygon(list(map(local,patio['px']))))
 if id==1:
  # OSM delimita el conjunto, pero no sus patios: cinco entrantes interpretados de la perspectiva histórica.
  for z in [-90,-65,-40,-15,10]:
   hueco=box(-93,z-6,-54,z+6).intersection(p.buffer(-5))
   p=p.difference(hueco)
 alta=p.intersection(box(-54,-100,-29,45)) if id==1 else Polygon()
 out[str(id)]={'plantas':serializar(p),'comercio':serializar(p.buffer(-2.6,join_style=2)), 'alta':serializar(alta), 'jardines':serializar(p.convex_hull.difference(p.buffer(1)))}
(ROOT/'src/hitos/datos/el-silencio-plantas.js').write_text('// Derivado de OSM (ODbL), tools/el-silencio-plantas.py; patios de1 interpretativos.\nexport const PLANTAS_SILENCIO='+json.dumps(out,separators=(',',':'))+'\n')

control=[{'id':h['nombre'],'osm':h['osmWay'],'px':[[round(v,3) for v in p] for p in h['px']]} for h in huellas]
(ROOT/'src/hitos/datos/el-silencio-huellas.js').write_text('// © OpenStreetMap contributors, ODbL 1.0. Consulta 2026-11-26.\n// Transformación: tools/geo/geo1936.py, ajuste1936 RMS5.09m.\nexport const HUELLAS_SILENCIO = '+json.dumps(control,separators=(',',':'))+'\n')
