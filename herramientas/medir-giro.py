"""Mide la moto en cada cuadro del giro (caja sobre el fondo gris) para estabilizar la secuencia.
Uso: py -3 herramientas/medir-giro.py  -> escribe fuentes/giro-medidas.json
"""
import json, glob, os
import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONDO = np.array([214, 218, 223], dtype=np.int16)

def caja(ruta):
    a = np.asarray(Image.open(ruta).convert('RGB'), dtype=np.int16)
    d = np.abs(a - FONDO).sum(axis=2)
    m = d > 60                      # pixeles que no son fondo (la sombra suave queda fuera)
    filas = np.where(m.sum(axis=1) > 6)[0]
    cols = np.where(m.sum(axis=0) > 6)[0]
    return [int(cols[0]), int(filas[0]), int(cols[-1]), int(filas[-1])]

salida = []
for t in range(1, 9):
    cuadros = sorted(glob.glob(os.path.join(RAIZ, 'fuentes', 'giro-crudo', f't{t}_*.png')))
    for i, c in enumerate(cuadros):
        salida.append({'tramo': t, 'i': i, 'archivo': os.path.basename(c), 'caja': caja(c)})

with open(os.path.join(RAIZ, 'fuentes', 'giro-medidas.json'), 'w') as f:
    json.dump(salida, f)

for t in range(1, 9):
    cs = [s['caja'] for s in salida if s['tramo'] == t]
    cx = [(c[0] + c[2]) / 2 for c in cs]; base = [c[3] for c in cs]; alto = [c[3] - c[1] for c in cs]
    print(t, 'cx', round(min(cx)), round(max(cx)), 'base', min(base), max(base), 'alto', min(alto), max(alto),
          'ini', cs[0], 'fin', cs[-1])
