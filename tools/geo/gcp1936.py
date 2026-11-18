"""Ajusta la transformación cuadrícula DCN 1936 → UTM 19N con los puntos de control de OSM.

Uso: python tools/geo/gcp1936.py [tools/geo/gcp/1936-wgs84.json] [--modelo similitud|afin]

El JSON trae "puntos": [{nombre, osm, lat, lon, px, py, nota, descartado?}] (lat/lon de OSM,
px/py en el mosaico, medidos a ojo sobre recortes de mosaico.tif). Reescribe el mismo archivo
con "transformacion", "residuos" y "dejando_uno_fuera".
"""
import argparse
import json
from pathlib import Path

import numpy as np

import geo1936 as geo


def _pares(puntos):
    usados = [p for p in puntos if not p.get("descartado")]
    gx, gy = geo.px_a_grid([p["px"] for p in usados], [p["py"] for p in usados])
    e, n = geo.wgs84_a_utm([p["lat"] for p in usados], [p["lon"] for p in usados])
    return usados, np.c_[gx, gy], np.c_[e, n]


def calcular(puntos, modelo="similitud"):
    usados, grid, utm = _pares(puntos)
    t = geo.ajustar(grid, utm, modelo)
    r = geo.residuos(grid, utm, t)
    loo = geo.dejando_uno_fuera(grid, utm, modelo)
    e, n = geo.grid_a_utm(grid[:, 0], grid[:, 1], t)
    por_punto = [{"nombre": p["nombre"], "de_m": round(float(e[k] - utm[k, 0]), 2),
                  "dn_m": round(float(n[k] - utm[k, 1]), 2), "loo_m": loo["por_punto_m"][k]}
                 for k, p in enumerate(usados)]
    return {
        "transformacion": t,
        "residuos": {"n": r["n"], "rms_m": round(r["rms_m"], 2), "max_m": round(r["max_m"], 2), "por_punto": por_punto},
        "dejando_uno_fuera": {"rms_m": round(loo["rms_m"], 2), "max_m": round(loo["max_m"], 2)},
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("ruta", nargs="?", default=str(geo.RUTA_GCP))
    ap.add_argument("--modelo", default="similitud", choices=["similitud", "afin"])
    args = ap.parse_args(argv)
    ruta = Path(args.ruta)
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    resultado = calcular(datos["puntos"], args.modelo)
    ruta.write_text(json.dumps({**datos, **resultado}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    r = resultado["residuos"]
    print(f"{args.modelo}: n={r['n']} rms={r['rms_m']} m max={r['max_m']} m; "
          f"dejando uno fuera rms={resultado['dejando_uno_fuera']['rms_m']} m")
    return resultado


if __name__ == "__main__":
    main()
