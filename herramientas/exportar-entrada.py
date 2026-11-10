"""Arma la secuencia de la entrada (fachada -> salón) para el scroll.
Toma el video de transición y reemplaza el primer y el último cuadro por las imágenes 2K de las que salió,
recortadas a 16:9 en el mismo encuadre (el video es la transición entre esas dos imágenes).
Uso: py -3 herramientas/exportar-entrada.py
"""
import os, glob
import cv2, numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = os.path.join(RAIZ, 'fuentes', 'entrada-v3')
SALIDA = os.path.join(RAIZ, 'media', 'entrada')
CALIDAD, CALIDAD_2K = 72, 82

cap = cv2.VideoCapture(os.path.join(F, 'entrada.mp4')); cuadros = []
while True:
    ok, f = cap.read()
    if not ok: break
    cuadros.append(f)

def encuadre(img, cuadro):
    """Recorte de la imagen 2K que coincide con el cuadro del video (escala + desplazamiento)."""
    sift = cv2.SIFT_create(4000)
    k1, d1 = sift.detectAndCompute(cv2.cvtColor(cuadro, cv2.COLOR_BGR2GRAY), None)
    k2, d2 = sift.detectAndCompute(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), None)
    m = [a for a, b in cv2.BFMatcher().knnMatch(d1, d2, k=2) if a.distance < 0.7 * b.distance]
    M, _ = cv2.estimateAffinePartial2D(np.float32([k1[a.queryIdx].pt for a in m]),
                                       np.float32([k2[a.trainIdx].pt for a in m]), ransacReprojThreshold=2)
    s = float(np.hypot(M[0, 0], M[1, 0])); x0, y0 = M[:, 2]
    w, h = min(1280 * s, img.shape[1]), min(720 * s, img.shape[0])
    x0 = min(max(0, x0), img.shape[1] - w); y0 = min(max(0, y0), img.shape[0] - h)
    rec = img[int(round(y0)):int(round(y0 + h)), int(round(x0)):int(round(x0 + w))]
    return cv2.resize(rec, (1920, 1080), interpolation=cv2.INTER_AREA)

def guardar(bgr, i, q):
    Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)).save(os.path.join(SALIDA, f'f{i:03d}.webp'), quality=q, method=6)

for viejo in glob.glob(os.path.join(SALIDA, 'f*.webp')): os.remove(viejo)
os.makedirs(SALIDA, exist_ok=True)
n = len(cuadros)
for i, c in enumerate(cuadros):
    if i == 0: guardar(encuadre(cv2.imread(os.path.join(F, 'fachada-2k.jpg')), c), i, CALIDAD_2K)
    elif i == n - 1: guardar(encuadre(cv2.imread(os.path.join(F, 'salon-2k.jpg')), c), i, CALIDAD_2K)
    else: guardar(c, i, CALIDAD)
print(n, 'cuadros en media/entrada')
