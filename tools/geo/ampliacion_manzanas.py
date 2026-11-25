"""Expansión de 1843 alrededor del tejido conservado de 1772, sin volver a parcelar este último."""
import json
import sys
from shapely.geometry import Polygon
from shapely.ops import unary_union
from manzanas_completas import partes, anillo


def seleccionar_ampliacion(referencias, heredadas, hitos, metro):
    anteriores = unary_union([Polygon(m.get('limite', m['poligono']),m.get('huecos',[])).buffer(0) for m in heredadas])
    # Mantener la calle entre los tejidos: mismo ancho inferido de 6 m usado en 1772.
    ocupados = anteriores.buffer(6/metro, join_style=2)
    edificadas = [Polygon(r['poligono']).buffer(0) for r in referencias
                  if r['estado']=='aprobada' and r['ocupacion'] in {'rayada','parte_de_otra_unidad'}]
    libres = []
    for r in referencias:
        if r['ocupacion'] not in {'plaza','huerta','terreno_libre','lote_especial'}:
            continue
        p=Polygon(r['poligono']).buffer(0)
        # La clasificación más específica manda: una casa rayada dentro de una huerta es un enclave;
        # una huerta pequeña dentro de una manzana rayada, en cambio, sigue siendo huerta. Plazas, terrenos
        # libres y lotes especiales no tienen enclaves: van enteros, sin casas (R7, specs/13).
        enclaves=unary_union([q for q in edificadas if r['ocupacion']=='huerta' and q.area<p.area and p.covers(q)])
        libres.append(p.difference(enclaves))
    libres=unary_union(libres)
    reservas = [(h['id'],Polygon(p).buffer(0)) for h in hitos
                if h.get('nace',0)<=2 and (not h.get('muere') or h['muere']>2)
                for p in (h.get('suprime') or h.get('planta',[]))]
    manzanas, cobertura = [], []
    for r in referencias:
        if r['estado']!='aprobada':
            cobertura.append({'id':r['id'],'estado':'pendiente_en_referencia','ocupacion':r['ocupacion'],'motivo':r.get('motivo','')})
            continue
        if r['ocupacion'] not in {'rayada','parte_de_otra_unidad'}:
            cobertura.append({'id':r['id'],'estado':'espacio_no_residencial','ocupacion':r['ocupacion']})
            continue
        p=Polygon(r['poligono']).buffer(0)
        comun=p.intersection(anteriores).area
        # Dos lecturas de la misma cuadra: prevalece la ya construida, sin franjas duplicadas por el calce.
        if comun>=p.area*.5:
            cobertura.append({'id':r['id'],'estado':'heredada','fraccionHeredada':comun/p.area})
            continue
        nuevo=p.difference(ocupados).difference(libres)
        ids=[]
        for k,q in enumerate(partes(nuevo)):
            rect=q.minimum_rotated_rectangle
            lados=list(rect.exterior.coords)
            largo=max(((b[0]-a[0])**2+(b[1]-a[1])**2)**.5 for a,b in zip(lados,lados[1:]))
            if q.area*metro*metro<12 or q.area/max(largo,1e-9)*metro<2:
                continue
            id=f"{r['id']}-A{k}"
            puntos=anillo(q) if len(q.exterior.coords)==5 and q.equals(q.convex_hull) else anillo(rect)
            if sum((puntos[1][i]-puntos[0][i])**2 for i in [0,1]) < sum((puntos[2][i]-puntos[1][i])**2 for i in [0,1]):
                puntos=puntos[1:]+puntos[:1]
            manzanas.append({'id':id,'referencia':r['id'],'poligono':puntos,'limite':anillo(q),
                             'huecos':[[list(v) for v in h.coords[:-1]] for h in q.interiors],
                             'areaM2':q.area*metro*metro,'procedencia':'censo aprobado de 1843; expansión sin alterar 1772',
                             'reservas':[{'id':nombre,'poligono':anillo(h)} for nombre,h in reservas if h.intersects(q)]})
            ids.append(id)
        cobertura.append({'id':r['id'],'estado':'ampliacion' if ids else 'sin_area_nueva_util',
                          'unidades':ids,'fraccionHeredada':comun/p.area})
        ocupados=unary_union([ocupados,nuevo])
    return {'manzanas':manzanas,'cobertura':cobertura}


if __name__=='__main__':
    d=json.load(sys.stdin)
    json.dump(seleccionar_ampliacion(d['referencias'],d['heredadas'],d['hitos'],d['metro']),sys.stdout)
