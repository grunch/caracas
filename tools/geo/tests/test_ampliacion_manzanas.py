from shapely.geometry import Polygon
from ampliacion_manzanas import seleccionar_ampliacion


def cuadro(x, y, l=100):
    return [[x,y],[x+l,y],[x+l,y+l],[x,y+l]]


def test_conserva_la_cuadra_existente_aunque_el_calce_de_1843_varie():
    viejas=[{'id':'V','poligono':cuadro(0,0)}]
    nuevas=[{'id':'R','ocupacion':'rayada','poligono':cuadro(3,2),'estado':'aprobada'},
            {'id':'N','ocupacion':'rayada','poligono':cuadro(120,0),'estado':'aprobada'}]
    r=seleccionar_ampliacion(nuevas,viejas,[],1)
    assert [m['referencia'] for m in r['manzanas']]==['N']
    assert r['cobertura'][0]['estado']=='heredada'
    assert viejas[0]['poligono']==cuadro(0,0)


def test_respeta_espacios_libres_y_corta_solapamientos_sin_ocupar_calles():
    viejas=[{'id':'V','poligono':cuadro(0,0)}]
    referencias=[{'id':'N','ocupacion':'rayada','poligono':cuadro(80,0,200),'estado':'aprobada'},
                 {'id':'H','ocupacion':'huerta','poligono':cuadro(180,0,30),'estado':'aprobada'},
                 {'id':'P','ocupacion':'plaza','poligono':cuadro(220,0,30),'estado':'aprobada'}]
    r=seleccionar_ampliacion(referencias,viejas,[],1)
    for m in r['manzanas']:
        p=Polygon(m.get('limite',m['poligono']),m.get('huecos',[]))
        assert p.distance(Polygon(viejas[0]['poligono']))>=5.99
        for ref in referencias[1:]:
            assert p.intersection(Polygon(ref['poligono'])).area<1e-6
    assert r['manzanas']
    assert {m['referencia'] for m in r['manzanas']}=={'N'}


def test_edificio_rayado_dentro_de_huerta_grande_es_un_enclave_edificado():
    # U1843-0087 y U1843-0300: las notas del censo confirman casas dentro de terrenos cultivados.
    refs=[{'id':'H','ocupacion':'huerta','poligono':cuadro(0,0,300),'estado':'aprobada'},
          {'id':'C','ocupacion':'rayada','poligono':cuadro(100,100,50),'estado':'aprobada'}]
    r=seleccionar_ampliacion(refs,[],[],1)
    assert [m['referencia'] for m in r['manzanas']]==['C']
    assert Polygon(r['manzanas'][0]['limite']).area==2500


def test_no_convierte_una_referencia_pendiente_en_construccion_confirmada():
    r=seleccionar_ampliacion([{'id':'D','ocupacion':'rayada','poligono':cuadro(0,0),
                              'estado':'pendiente','motivo':'edificio o señal de lindero'}],[],[],1)
    assert r['manzanas']==[]
    assert r['cobertura']==[{'id':'D','estado':'pendiente_en_referencia','ocupacion':'rayada',
                             'motivo':'edificio o señal de lindero'}]
