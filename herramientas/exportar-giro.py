"""Arma la secuencia web del giro: estabiliza la moto (centro y apoyo) y exporta WebP.
Uso: py -3 herramientas/exportar-giro.py [paso=3]
"""
import json, os, sys
import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASO = int(sys.argv[1]) if len(sys.argv) > 1 else 3
CX, BASE = 640, 640                 # donde queda la moto en el cuadro 1280x720
ALTO_FIJO = 470                     # la altura de la moto no cambia al girar: se fija para que no suba ni baje
RECORTE = (160, 92, 1120, 692)      # 960x600 alrededor de la moto
FONDO = (214, 218, 223)

medidas = json.load(open(os.path.join(RAIZ, 'fuentes', 'giro-medidas.json')))
# Una vuelta continua: cada tramo sin su último cuadro (es el primero del siguiente)
vuelta = [m for m in medidas if m['i'] < 120]
cx = np.array([(m['caja'][0] + m['caja'][2]) / 2 for m in vuelta])
base = np.array([m['caja'][3] for m in vuelta], dtype=float)

def suavizar(v, r=10):
    # promedio móvil circular: la vuelta empieza donde termina
    ext = np.concatenate([v[-r:], v, v[:r]])
    k = np.ones(2 * r + 1) / (2 * r + 1)
    return np.convolve(ext, k, mode='same')[r:-r]

alto = np.array([m['caja'][3] - m['caja'][1] for m in vuelta], dtype=float)
cx_s, base_s = suavizar(cx, 6), suavizar(base, 6)
escala = ALTO_FIJO / suavizar(alto, 6)

destino = os.path.join(RAIZ, 'media', 'giro', '450rr')
os.makedirs(destino, exist_ok=True)
for f in os.listdir(destino):
    os.remove(os.path.join(destino, f))

n = 0
for k in range(0, len(vuelta), PASO):
    m = vuelta[k]
    im = Image.open(os.path.join(RAIZ, 'fuentes', 'giro-crudo', m['archivo'])).convert('RGB')
    s = escala[k]
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    # tras escalar, el centro y el apoyo de la moto quedan en CX y BASE
    x = CX - cx_s[k] * s
    y = BASE - base_s[k] * s
    lienzo = Image.new('RGB', (1280, 720), FONDO)
    lienzo.paste(im, (int(round(x)), int(round(y))))
    lienzo.crop(RECORTE).save(os.path.join(destino, f'g{n:03d}.webp'), quality=74)
    n += 1

json.dump({'cuadros': n, 'ancho': RECORTE[2] - RECORTE[0], 'alto': RECORTE[3] - RECORTE[1], 'grados_por_cuadro': 360 / n},
          open(os.path.join(destino, 'giro.json'), 'w'))
print('cuadros', n)
