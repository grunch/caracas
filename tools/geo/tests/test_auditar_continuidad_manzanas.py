from auditar_continuidad_manzanas import auditar


def cuadro(x, y, l):
    return [[x,y],[x+l,y],[x+l,y+l],[x,y+l]]


def ciudad_con(huellas):
    """Una casa simple por huella (solo la crujía del frente, que cubre todo el lote) tras una casa previa."""
    d={'vertices':[0,0,1,0,1,1],'techos':[[0,3,1,0,0]],'marcos':[],'alas':[]}
    for k,(x,y,l) in enumerate(huellas):
        inicio=len(d['vertices'])//2
        d['vertices']+= [v for p in cuadro(x,y,l) for v in p]
        d['techos'].append([inicio,4,1,0,k])
        d['marcos'].append([k+1,x,y,1,0,l,l,0,l,len(d['alas']),1])
        d['alas'].append([2,0,0,l,l])
    return d


def informe(unidades, arboles):
    ms=[{'id':i,'poligono':cuadro(x,0,40),'nuevas':1,'arboles':a,'estado':'integrada'} for (i,x),a in zip(unidades,arboles)]
    return {'manzanas':ms,'casasNuevas':len(ms),'cobertura':[]}


def test_suma_el_solape_entre_solares_de_unidades_distintas():
    d=ciudad_con([(0,0,20),(10,0,20)])
    r=informe([('A',0),('B',10)],[[{'x':5,'y':35,'r':1}],[{'x':35,'y':35,'r':1}]])
    res=auditar([],r,d)
    assert res['solapeEntreSolaresNuevosM2']>0


def test_un_contacto_solo_de_borde_entre_unidades_no_es_solape():
    d=ciudad_con([(0,0,20),(20,0,20)])
    r=informe([('A',0),('B',20)],[[{'x':5,'y':35,'r':1}],[{'x':35,'y':35,'r':1}]])
    assert auditar([],r,d)['solapeEntreSolaresNuevosM2']==0


def test_cuenta_la_copa_que_cruza_al_tejado_de_la_unidad_vecina():
    d=ciudad_con([(0,30,10),(20,0,20)])
    r=informe([('A',0),('B',20)],[[{'x':19,'y':10,'r':3}],[{'x':35,'y':35,'r':1}]])
    assert auditar([],r,d)['copasNuevasSobreTejados']==1
