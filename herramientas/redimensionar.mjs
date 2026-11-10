// Reduce fotos a un ancho máximo y las guarda en WebP. Uso: node herramientas/redimensionar.mjs <ancho> <salida-dir> <foto> [foto ...]
// Con RECORTE=x,y,w,h (en fracciones 0–1) recorta antes de reducir (sirve para sacar la pieza de una foto de detalle).
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
const PW = process.env.PLAYWRIGHT || 'C:/Dev/16bc-site/node_modules/playwright-core/index.mjs';
const { chromium } = await import(pathToFileURL(PW).href);
const [ancho, salida, ...fotos] = process.argv.slice(2);
mkdirSync(salida, { recursive: true });
const recorte = process.env.RECORTE ? process.env.RECORTE.split(',').map(Number) : [0, 0, 1, 1];
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage();
await p.setContent('<body></body>');
for (const f of fotos) {
  const tipo = { '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.webp': 'webp' }[extname(f).toLowerCase()];
  const datos = `data:image/${tipo};base64,${readFileSync(resolve(f)).toString('base64')}`;
  const r = await p.evaluate(async ({ datos, ancho, recorte }) => {
    const img = new Image(); img.src = datos; await img.decode();
    const [rx, ry, rw, rh] = recorte;
    const sx = img.naturalWidth * rx, sy = img.naturalHeight * ry, sw = img.naturalWidth * rw, sh = img.naturalHeight * rh;
    const e = Math.min(1, ancho / sw);
    const c = document.createElement('canvas'); c.width = Math.round(sw * e); c.height = Math.round(sh * e);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return { url: c.toDataURL('image/webp', 0.84), w: c.width, h: c.height };
  }, { datos, ancho: Number(ancho), recorte });
  const nombre = (process.env.NOMBRE || basename(f, extname(f)).replace(/[^a-z0-9-]+/gi, '-').toLowerCase()) + '.webp';
  writeFileSync(join(salida, nombre), Buffer.from(r.url.split(',')[1], 'base64'));
  console.log(nombre, `${r.w}x${r.h}`);
}
await b.close();
