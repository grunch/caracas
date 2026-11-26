"""Audita continuidad y solapes de la salida1946; ejecutar desde la raíz."""
import json
from shapely.geometry import Polygon
from shapely.strtree import STRtree
from pathlib import Path

def auditar(base,nuevo):
    iguales={k:base[k]==nuevo[k][:len(base[k])] for k in ['vertices','techos','vida','historia','marcos','alas','vuelos','paletas']}
    assert all(iguales.values()), 'prefijos anteriores modificados'
    assert len(nuevo['vida'])==len(nuevo['techos']), 'falta vida por techo'
    assert all(len(v)==2 and v[0]==6 for v in nuevo['vida'][len(base['vida']):]), 'vida nueva anterior a1946 o inválida'
    vs=nuevo['vertices'];ps=[]
    for inicio,n,*_ in nuevo['techos'][len(base['techos']):]:ps.append(Polygon([(vs[2*i]*.5,vs[2*i+1]*.5) for i in range(inicio,inicio+n)]))
    tree=STRtree(ps);solapes=[]
    for i,p in enumerate(ps):
     for j in tree.query(p,predicate='intersects'):
      if j<=i:continue
      a=p.intersection(ps[j]).area
      if a>.05:solapes.append((i,int(j),round(a,3)))
    assert not solapes, solapes[:10]
    return {'prefijosIdenticos':iguales,'casasNuevas':len(ps),'epocas0a5':'geometría, historia y vida anteriores conservadas; nuevas casas nacen6','solapesMayores005m2':solapes}

if __name__=='__main__':
    leer=lambda p:json.loads(Path(p).read_text(encoding='utf-8'))
    informe=auditar(leer('fuentes/derivados/epocas/ciudad-manzanas-1889.json'),leer('fuentes/derivados/1946/ciudad-1946.json'))
    Path('specs/reglas/1946').mkdir(parents=True,exist_ok=True)
    Path('specs/reglas/1946/continuidad.json').write_text(json.dumps(informe,ensure_ascii=False,indent=2),encoding='utf-8')
    print(informe)
