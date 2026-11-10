// Recorta las vistas oficiales (fondo transparente) al contorno de la moto y las guarda en WebP.
// Por defecto cada vista se recorta a su propio contorno (para el plano técnico). Con UNION=1 todas usan el mismo
// recorte (la unión de los contornos), para que la moto no cambie de tamaño ni salte de lugar al girar.
// Uso: node herramientas/recortar-vistas.mjs <salida-dir> <ancho-max> <entrada1> [entrada2 ...]
// Escribe además <salida-dir>/medidas.json con el recorte de cada vista (en px de la imagen de salida).
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
const PW = process.env.PLAYWRIGHT || 'C:/Dev/16bc-site/node_modules/playwright-core/index.mjs';
const { chromium } = await import(pathToFileURL(PW).href);
const [salida, anchoMax, ...entradas] = process.argv.slice(2);
mkdirSync(salida, { recursive: true });
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage();
await p.setContent('<body></body>');
const medidas = {};
const UNION = !!process.env.UNION;
let cajaComun = null;
const caja = async (datos) => p.evaluate(async (datos) => { const img = new Image(); img.src = datos; await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1; for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) { if (d[(y * c.width + i) * 4 + 3] < 10) continue; if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; }, datos);
const leer = (e) => `data:image/${extname(e).slice(1).replace('jpg', 'jpeg')};base64,${readFileSync(resolve(e)).toString('base64')}`;
if (UNION) { for (const e of entradas) { const k = await caja(leer(e)); cajaComun = cajaComun ? [Math.min(cajaComun[0], k[0]), Math.min(cajaComun[1], k[1]), Math.max(cajaComun[2], k[2]), Math.max(cajaComun[3], k[3])] : k; } }
for (const e of entradas) {
  const tipo = extname(e).slice(1).replace('jpg', 'jpeg');
  const datos = `data:image/${tipo};base64,${readFileSync(resolve(e)).toString('base64')}`;
  const r = await p.evaluate(async ({ datos, anchoMax, comun }) => {
    const img = new Image(); img.src = datos; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1, transparente = 0;
    for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) {
      const a = d[(y * c.width + i) * 4 + 3];
      if (a < 10) { transparente++; continue; }
      if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (comun) [x0, y0, x1, y1] = comun;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const esc = Math.min(1, anchoMax / w);
    const o = document.createElement('canvas'); o.width = Math.round(w * esc); o.height = Math.round(h * esc);
    const ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high';
    ox.drawImage(c, x0, y0, w, h, 0, 0, o.width, o.height);
    const url = o.toDataURL('image/webp', 0.9);
    return { url, w: o.width, h: o.height, original: [c.width, c.height], caja: [x0, y0, w, h], transparente: +(transparente / (c.width * c.height)).toFixed(2) };
  }, { datos, anchoMax: Number(anchoMax), comun: cajaComun });
  const nombre = basename(e, extname(e)) + '.webp';
  writeFileSync(join(salida, nombre), Buffer.from(r.url.split(',')[1], 'base64'));
  medidas[nombre] = { w: r.w, h: r.h, original: r.original, caja: r.caja, transparente: r.transparente };
  console.log(nombre, r.w + 'x' + r.h, 'transparente', r.transparente);
}
writeFileSync(join(salida, 'medidas.json'), JSON.stringify(medidas, null, 1));
await b.close();
