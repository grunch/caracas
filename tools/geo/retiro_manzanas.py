"""Retiro visual adicional de manzanas: conserva hitos y registra casos no reducibles."""
from copy import deepcopy
import json
import math
import sys
from shapely.geometry import Polygon
from shapely.geometry.polygon import orient


def anillo(p, inicio=None):
    ps=[list(v) for v in orient(p,1).exterior.coords[:-1]]
    if inicio is not None:
        i=min(range(len(ps)),key=lambda k:math.dist(ps[k],inicio))
        ps=ps[i:]+ps[:i]
    return ps


def retraer(manzanas, metros, metro):
    if not math.isfinite(metros) or metros<0 or not math.isfinite(metro) or metro<=0:
        raise ValueError('retiro y escala inválidos')
    salida=deepcopy(manzanas)
    for m in salida:
        limite=Polygon(m.get('limite',m['poligono']),m.get('huecos',[]))
        m['limite']=anillo(limite);m['retiroAplicadoM']=0
        m['areaAntesM2']=limite.area*metro**2
        if metros==0:continue
        cuadro=Polygon(m['poligono']).buffer(-metros/metro,join_style=2)
        nuevo=Polygon(limite.exterior).buffer(-metros/metro,join_style=2)
        for h in limite.interiors:nuevo=nuevo.difference(Polygon(h))
        nuevo=nuevo.intersection(cuadro)
        if nuevo.geom_type!='Polygon' or cuadro.geom_type!='Polygon' or nuevo.is_empty or nuevo.area*metro**2<25 or len(cuadro.exterior.coords)!=5:
            m['limiteRetiro']='Conservada: retiro divide o colapsa un solar pequeño.'
            continue
        m['poligono']=anillo(cuadro,m['poligono'][0]);m['limite']=anillo(nuevo)
        m['huecos']=[list(map(list,h.coords[:-1])) for h in nuevo.interiors]
        m['retiroAplicadoM']=metros;m['areaDespuesM2']=nuevo.area*metro**2
    return salida


if __name__=='__main__':
    x=json.load(sys.stdin)
    json.dump(retraer(x['manzanas'],x['metros'],x['metro']),sys.stdout)
