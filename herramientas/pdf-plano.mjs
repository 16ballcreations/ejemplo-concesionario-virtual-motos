// Genera media/plano/kove-<id>-plano-tecnico.pdf de cada moto: una hoja vertical de tamaño fijo (carta por defecto)
// ocupada entera por la lámina del plano técnico, sin márgenes en blanco.
// La lámina se dibuja con el diseño de escritorio a un ancho que da la proporción de la hoja,
// y se toma como imagen nítida para que el PDF no dependa de la impresión del navegador.
// Uso (con el servidor de la demo corriendo):
//   node herramientas/pdf-plano.mjs [http://localhost:4390/] [ids separados por coma, por defecto todas]
// PAPEL=a4 para A4 (por defecto carta). PREVIA=<carpeta> guarda además la imagen para revisarla.
// Necesita playwright-core; por defecto lo toma de C:/Dev/16bc-site (variable PLAYWRIGHT para cambiarlo).
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';

const PW = process.env.PLAYWRIGHT || 'C:/Dev/16bc-site/node_modules/playwright-core/index.mjs';
const { chromium } = await import(pathToFileURL(PW).href);
const URL_DEMO = process.argv[2] || 'http://localhost:4390/';
const CARPETA = join(dirname(fileURLToPath(import.meta.url)), '..', 'media', 'plano');
const PAPELES = { carta: ['215.9mm', '279.4mm', 279.4 / 215.9], a4: ['210mm', '297mm', 297 / 210] };
const [ANCHO, ALTO, PROPORCION] = PAPELES[(process.env.PAPEL || 'carta').toLowerCase()] || PAPELES.carta;

const navegador = await chromium.launch({ channel: 'msedge' });
// la ventana se queda en 1500 px para que la lámina use siempre su diseño de escritorio
const pagina = await navegador.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2.5 });
await pagina.goto(URL_DEMO, { waitUntil: 'networkidle' });
const IDS = process.argv[3] ? process.argv[3].split(',') : await pagina.evaluate(() => Object.keys(window.__koveDetalle.motos));
for (const ID of IDS) {
await pagina.goto(URL_DEMO, { waitUntil: 'networkidle' });
const lamina = await pagina.evaluate((id) => { window.__koveDetalle.abrir(id); return document.querySelector('.lamina').outerHTML; }, ID);
const SALIDA = join(CARPETA, 'kove-' + ID + '-plano-tecnico.pdf');

await pagina.setContent(`<!doctype html><html lang="es"><head><meta charset="utf-8"><base href="${URL_DEMO}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fjalla+One&family=Gantari:wght@400;500;600&display=swap">
<link rel="stylesheet" href="css/estilos.css">
<style>html,body{margin:0;background:#fff}.lamina{box-shadow:none;margin:0;box-sizing:border-box}</style>
</head><body><div class="caja">${lamina}</div></body></html>`, { waitUntil: 'networkidle' });
await pagina.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
});

// El ancho más angosto en el que la lámina todavía cabe en la proporción de la hoja;
// lo que falte de alto se reparte entre sus filas.
const ancho = await pagina.evaluate((prop) => {
  const caja = document.querySelector('.caja'), lam = document.querySelector('.lamina');
  let elegido = 1400;
  for (let w = 1400; w >= 900; w -= 5) {
    caja.style.width = w + 'px';
    if (lam.getBoundingClientRect().height / w > prop) break;
    elegido = w;
  }
  caja.style.width = elegido + 'px';
  lam.style.height = Math.round(elegido * prop) + 'px';
  return elegido;
}, PROPORCION);

const png = await pagina.locator('.lamina').screenshot({ type: 'jpeg', quality: 90 });
if (process.env.PREVIA) writeFileSync(join(process.env.PREVIA, 'lamina-' + ID + '.jpg'), png);

await pagina.setContent(`<!doctype html><html><head><style>
@page { size: ${ANCHO} ${ALTO}; margin: 0; }
html, body { margin: 0; }
img { display: block; width: ${ANCHO}; height: calc(${ALTO} - .5mm); }
</style></head><body><img src="data:image/jpeg;base64,${png.toString('base64')}"></body></html>`, { waitUntil: 'load' });
await pagina.pdf({ path: SALIDA, width: ANCHO, height: ALTO, printBackground: true, pageRanges: '1', margin: { top: 0, right: 0, bottom: 0, left: 0 } });
console.log(`PDF listo (${process.env.PAPEL || 'carta'}, lámina a ${ancho} px):`, SALIDA);
}
await navegador.close();
