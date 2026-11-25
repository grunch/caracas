"""Audita continuidad y solapes: informe1772 informe1843 ciudad1843 salida.json."""
import sys,json
if len(sys.argv)!=5:
    raise SystemExit('Uso: auditar_continuidad_manzanas.py informe1772 informe1843 ciudad1843 salida.json')
from shapely.geometry import Polygon,Point
from shapely.ops import unary_union
from manzanas_completas import techos_de_casa
old=json.load(open(sys.argv[1]))['manzanas']
r=json.load(open(sys.argv[2]))
d=json.load(open(sys.argv[3]))
porid={m['id']:m for m in r['manzanas']};perimetros=all(all(m.get(k)==porid[m['id']].get(k) for k in ['poligono','limite','huecos','semilla','cantidadCasas']) for m in old)
arboles=all([{k:v for k,v in a.items() if k not in ['nace','muere']} for a in m['arboles']]==[{k:v for k,v in a.items() if k not in ['nace','muere']} for a in porid[m['id']]['arboles']] for m in old)
previo=unary_union([Polygon(m.get('limite',m['poligono']),m.get('huecos',[])).buffer(0) for m in old])
marcos={m[0]:m[1:] for m in d['marcos']};cursor=len(d['techos'])-r['casasNuevas'];fuera=0;solapes=0;copas=0;sin_arboles=[];area_solapes=0
for m in r['manzanas']:
 if m.get('origen')==1772:continue
 limite=Polygon(m.get('limite',m['poligono']),m.get('huecos',[])).buffer(0);huellas=[];tejados=[]
 for i in range(cursor,cursor+m['nuevas']):
  inicio,n=d['techos'][i][:2];p=[d['vertices'][j*2:j*2+2] for j in range(inicio,inicio+n)];f=Polygon(p).buffer(0);huellas.append(f)
  marco=marcos[i];cas={'huella':p,'marco':marco[:8],'alas':d['alas'][marco[8]:marco[8]+marco[9]]};tejados.append(techos_de_casa(cas,.5))
  fuera+=f.difference(limite.buffer(.001)).area>.01
  solapes+=f.intersection(previo).area>.01
 cursor+=m['nuevas'];area_solapes+=max(0,sum(f.area for f in huellas)-unary_union(huellas).area)*.25
 techo=unary_union(tejados)
 if not m['arboles']:sin_arboles.append(m['id'])
 for a in m['arboles']:
  copa=Point(a['x'],a['y']).buffer(a['r']);copas+=copa.intersection(techo).area>.01
res={'perimetrosYSemillas1772Exactos':perimetros,'arboles1772Exactos':arboles,'casasNuevasFueraDeManzana':fuera,'casasNuevasSobre1772':solapes,'solapeEntreSolaresNuevosM2':round(area_solapes,6),'copasNuevasSobreTejados':copas,'manzanasNuevasSinArboles':sin_arboles,'coberturaReferencia':{k:sum(m['estado']==k for m in r['cobertura']) for k in set(m['estado'] for m in r['cobertura'])}}
print(json.dumps(res,ensure_ascii=False,indent=2));json.dump(res,open(sys.argv[4],'w'),ensure_ascii=False,indent=2)
assert perimetros and arboles and not fuera and not solapes and not copas and not sin_arboles and area_solapes<.01
