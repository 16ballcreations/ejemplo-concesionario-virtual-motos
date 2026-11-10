// Genera media/plano/kove-450rr-plano-tecnico.pdf: una hoja A4 horizontal con la lámina del plano técnico,
// tal como se ve en la página (se toma como imagen nítida para que el PDF no dependa de la impresión del navegador).
// Uso (con el servidor de la demo corriendo):
//   node herramientas/pdf-plano.mjs [http://localhost:4390/]
// Necesita playwright-core; por defecto lo toma de C:/Dev/16bc-site (variable PLAYWRIGHT para cambiarlo).
// PREVIA=<carpeta> guarda además la imagen de la lámina para revisarla.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PW = process.env.PLAYWRIGHT || 'C:/Dev/16bc-site/node_modules/playwright-core/index.mjs';
const { chromium } = await import(pathToFileURL(PW).href);
const URL_DEMO = process.argv[2] || 'http://localhost:4390/';
const SALIDA = join(dirname(fileURLToPath(import.meta.url)), '..', 'media', 'plano', 'kove-450rr-plano-tecnico.pdf');
const ANCHO_LAMINA = 1340;   // ancho al que se dibuja la lámina (vista de escritorio)

const navegador = await chromium.launch({ channel: 'msedge' });
const pagina = await navegador.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2.5 });
await pagina.goto(URL_DEMO, { waitUntil: 'networkidle' });
const lamina = await pagina.evaluate(() => document.querySelector('.lamina').outerHTML);

// 1) La lámina sola, a ancho de escritorio, como imagen
await pagina.setContent(`<!doctype html><html lang="es"><head><meta charset="utf-8"><base href="${URL_DEMO}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fjalla+One&family=Gantari:wght@400;500;600&display=swap">
<link rel="stylesheet" href="css/estilos.css">
<style>html,body{margin:0;background:#fff}.caja{width:${ANCHO_LAMINA}px;padding:0}.lamina{box-shadow:none;margin:0}</style>
</head><body><div class="caja">${lamina}</div></body></html>`, { waitUntil: 'networkidle' });
await pagina.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
});
const png = await pagina.locator('.lamina').screenshot({ type: 'png' });
if (process.env.PREVIA) (await import('node:fs')).writeFileSync(join(process.env.PREVIA, 'lamina.png'), png);

// 2) Una hoja A4 horizontal con la imagen centrada
await pagina.setContent(`<!doctype html><html><head><style>
@page { size: 297mm 210mm; margin: 0; }
html, body { margin: 0; }
.hoja { width: 297mm; height: 209.5mm; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.hoja img { max-width: calc(297mm - 16mm); max-height: calc(210mm - 16mm); }
</style></head><body><div class="hoja"><img src="data:image/png;base64,${png.toString('base64')}"></div></body></html>`, { waitUntil: 'load' });
await pagina.pdf({ path: SALIDA, width: '297mm', height: '210mm', printBackground: true, pageRanges: '1', margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await navegador.close();
console.log('PDF listo:', SALIDA);
