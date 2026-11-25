"""Audita continuidad y solapes: informe_anterior informe_nuevo ciudad_nueva salida.json."""
import sys,json
from shapely.geometry import Polygon,Point
from shapely.ops import unary_union
from manzanas_completas import techos_de_casa


def auditar(old,r,d,metro=.5):
    """Lo que la ampliación debe cumplir. Solapes y copas se miden entre todas las unidades nuevas."""
    porid={m['id']:m for m in r['manzanas']};ids_anteriores={m['id'] for m in old}
    perimetros=all(all(m.get(k)==porid[m['id']].get(k) for k in ['poligono','limite','huecos','semilla','cantidadCasas']) for m in old)
    sin_vida=lambda a:{k:v for k,v in a.items() if k not in ['nace','muere']}
    arboles=all([sin_vida(a) for a in m['arboles']]==[sin_vida(a) for a in porid[m['id']]['arboles']] for m in old)
    previo=unary_union([Polygon(m.get('limite',m['poligono']),m.get('huecos',[])).buffer(0) for m in old])
    marcos={m[0]:m[1:] for m in d['marcos']};cursor=len(d['techos'])-r['casasNuevas'];fuera=solapes=0;sin_arboles=[]
    huellas,tejados,nuevas=[],[],[]
    for m in r['manzanas']:
        if m['id'] in ids_anteriores:continue
        nuevas.append(m)
        limite=Polygon(m.get('limite',m['poligono']),m.get('huecos',[])).buffer(0)
        for i in range(cursor,cursor+m['nuevas']):
            inicio,n=d['techos'][i][:2];p=[d['vertices'][j*2:j*2+2] for j in range(inicio,inicio+n)];f=Polygon(p).buffer(0);huellas.append(f)
            marco=marcos[i];tejados.append(techos_de_casa({'huella':p,'marco':marco[:8],'alas':d['alas'][marco[8]:marco[8]+marco[9]]},metro))
            fuera+=f.difference(limite.buffer(.001)).area>.01
            solapes+=f.intersection(previo).area>.01
        cursor+=m['nuevas']
        if not m['arboles']:sin_arboles.append(m['id'])
    # entre todas las casas nuevas, no solo dentro de cada unidad; tocarse por el borde no suma área
    area_solapes=max(0,sum(f.area for f in huellas)-unary_union(huellas).area)*metro*metro
    techo=unary_union(tejados)
    copas=sum(Point(a['x'],a['y']).buffer(a['r']).intersection(techo).area>.01 for m in nuevas for a in m['arboles'])
    return {'perimetrosYSemillas1772Exactos':perimetros,'arboles1772Exactos':arboles,'casasNuevasFueraDeManzana':fuera,'casasNuevasSobre1772':solapes,'solapeEntreSolaresNuevosM2':round(area_solapes,6),'copasNuevasSobreTejados':copas,'manzanasNuevasSinArboles':sin_arboles,'coberturaReferencia':{k:sum(m['estado']==k for m in r['cobertura']) for k in set(m['estado'] for m in r['cobertura'])}}


if __name__=='__main__':
    if len(sys.argv)!=5:
        raise SystemExit('Uso: auditar_continuidad_manzanas.py informe_anterior informe_nuevo ciudad_nueva salida.json')
    res=auditar(json.load(open(sys.argv[1]))['manzanas'],json.load(open(sys.argv[2])),json.load(open(sys.argv[3])))
    print(json.dumps(res,ensure_ascii=False,indent=2));json.dump(res,open(sys.argv[4],'w'),ensure_ascii=False,indent=2)
    assert res['perimetrosYSemillas1772Exactos'] and res['arboles1772Exactos'] and not res['casasNuevasFueraDeManzana'] and not res['casasNuevasSobre1772'] and not res['copasNuevasSobreTejados'] and not res['manzanasNuevasSinArboles'] and res['solapeEntreSolaresNuevosM2']<.01
