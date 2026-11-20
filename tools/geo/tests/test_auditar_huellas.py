"""La auditoría distingue vecindad, solape, época y datos inválidos."""
import pytest

from auditar_huellas import auditar


def ciudad(anillos, vidas=None):
    vertices, techos = [], []
    for anillo in anillos:
        techos.append([len(vertices) // 2, len(anillo), 1, 0, 7])
        vertices.extend(c for punto in anillo for c in punto)
    return {'vertices': vertices, 'techos': techos, 'vida': vidas or [[1, 0]] * len(techos)}


def rect(x0, y0, x1, y1):
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]


def test_medianera_compartida_no_es_solape():
    d = ciudad([rect(0, 0, 10, 10), rect(10, 0, 20, 10)])
    assert auditar(d, epoca=1, metro=.5)['solapes'] == []


def test_area_en_metros_y_indices_originales_sin_duplicar_pares():
    d = ciudad([rect(0, 0, 10, 10), rect(0, 0, 10, 10), rect(9, 0, 20, 10)],
               [[2, 0], [1, 0], [0, 2]])
    r = auditar(d, epoca=1, metro=.5)
    assert r['visibles'] == 2
    assert r['solapes'] == [{'techos': [1, 2], 'area_m2': 2.5}]
    assert auditar(d, epoca=2, metro=.5)['solapes'] == [{'techos': [0, 1], 'area_m2': 25.0}]


def test_invalido_se_reporta_sin_reparacion_silenciosa():
    d = ciudad([[[0, 0], [10, 10], [0, 10], [10, 0]], rect(0, 0, 10, 10)])
    r = auditar(d, epoca=1, metro=1)
    assert r['invalidas'][0]['techo'] == 0
    assert r['solapes'] == []


def test_umbral_es_estricto_y_no_oculta_conteo_de_validas():
    d = ciudad([rect(0, 0, 10, 10), rect(9, 0, 20, 10)])
    r = auditar(d, epoca=1, metro=1, area_minima_m2=10)
    assert r['validas'] == 2 and r['solapes'] == []


@pytest.mark.parametrize('metro,umbral', [(0, .01), (-1, .01), (float('nan'), .01), (1, -1)])
def test_rechaza_parametros_invalidos(metro, umbral):
    with pytest.raises(ValueError):
        auditar(ciudad([]), epoca=1, metro=metro, area_minima_m2=umbral)


def test_rechaza_vida_truncada():
    d = ciudad([rect(0, 0, 10, 10)]); d['vida'] = []
    with pytest.raises(ValueError, match='vida'):
        auditar(d, epoca=1, metro=1)


@pytest.mark.parametrize('puntos', [[[0, 0], [1, 1]], [[0, 0], [1, 0], [float('nan'), 1]]])
def test_reporta_anillos_cortos_y_no_finitos(puntos):
    r = auditar(ciudad([puntos]), epoca=1, metro=1)
    assert r['visibles'] == 1 and r['validas'] == 0
    assert r['invalidas'][0]['techo'] == 0


def test_rechaza_intervalo_fuera_de_vertices():
    d = ciudad([rect(0, 0, 10, 10)]); d['techos'][0][1] = 5
    with pytest.raises(ValueError, match='intervalo'):
        auditar(d, epoca=1, metro=1)


def test_cli_crea_informe_reproducible_con_hash(tmp_path, monkeypatch):
    import hashlib
    import json
    import sys
    from auditar_huellas import main
    entrada, salida = tmp_path / 'entrada.json', tmp_path / 'nuevo' / 'informe.json'
    entrada.write_text(json.dumps(ciudad([rect(0, 0, 10, 10), rect(9, 0, 20, 10)])))
    monkeypatch.setattr(sys, 'argv', ['auditar_huellas', str(entrada), str(salida), '--epoca', '1', '--metro', '.5'])
    main(); primero = salida.read_bytes(); main()
    assert primero == salida.read_bytes()
    informe = json.loads(primero)
    assert informe['entrada_sha256'] == hashlib.sha256(entrada.read_bytes()).hexdigest()
    assert informe['solapes'][0]['area_m2'] == 2.5


def test_cli_no_sobrescribe_la_entrada(tmp_path, monkeypatch):
    import json
    import sys
    from auditar_huellas import main
    entrada = tmp_path / 'ciudad.json'
    entrada.write_text(json.dumps(ciudad([])))
    original = entrada.read_bytes()
    monkeypatch.setattr(sys, 'argv', ['auditar_huellas', str(entrada), str(entrada), '--epoca', '1', '--metro', '1'])
    with pytest.raises(SystemExit):
        main()
    assert entrada.read_bytes() == original


def test_cli_escribe_utf8_con_codificacion_local_distinta(tmp_path, monkeypatch):
    import json
    import sys
    from pathlib import Path
    from auditar_huellas import main
    entrada, salida = tmp_path / 'entrada.json', tmp_path / 'informe.json'
    entrada.write_bytes(json.dumps(ciudad([])).encode('utf-8'))
    escribir = Path.write_text

    def escribir_cp1252(self, data, encoding=None, errors=None, newline=None):
        return escribir(self, data, encoding=encoding or 'cp1252', errors=errors, newline=newline)

    monkeypatch.setattr(Path, 'write_text', escribir_cp1252)
    monkeypatch.setattr(sys, 'argv', ['auditar_huellas', str(entrada), str(salida), '--epoca', '1', '--metro', '1'])
    main()
    assert 'histórica' in json.loads(salida.read_bytes())['alcance']
