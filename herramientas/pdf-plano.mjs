// Genera media/plano/kove-450rr-plano-tecnico.pdf a partir del plano técnico de la página.
// Hoja 1: la lámina tal cual se ve en la demo. Hoja 2: la ficha técnica completa.
// Uso (con el servidor de la demo corriendo):
//   node herramientas/pdf-plano.mjs [http://localhost:4390/]
// Necesita playwright-core; por defecto lo toma de C:/Dev/16bc-site (variable PLAYWRIGHT para cambiarlo).
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PW = process.env.PLAYWRIGHT || 'C:/Dev/16bc-site/node_modules/playwright-core/index.mjs';
const { chromium } = await import(pathToFileURL(PW).href);
const URL_DEMO = process.argv[2] || 'http://localhost:4390/';
const SALIDA = join(dirname(fileURLToPath(import.meta.url)), '..', 'media', 'plano', 'kove-450rr-plano-tecnico.pdf');

// A4 horizontal a 96 ppp
const HOJA_W = 1123, HOJA_H = 794, MARGEN = 34;

const navegador = await chromium.launch({ channel: 'msedge' });
const pagina = await navegador.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
await pagina.goto(URL_DEMO, { waitUntil: 'networkidle' });

const { lamina, ficha } = await pagina.evaluate(() => ({
  lamina: document.querySelector('.lamina').outerHTML,
  ficha: window.__koveDetalle.ficha,
}));

const secciones = Object.entries(ficha).map(([nombre, filas]) => `
  <section class="datos-pdf__seccion">
    <h3>${nombre}</h3>
    <dl>${filas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
  </section>`).join('');

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<base href="${URL_DEMO}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fjalla+One&family=Gantari:wght@400;500;600&display=swap">
<link rel="stylesheet" href="css/estilos.css">
<style>
  @page { size: 297mm 210mm; margin: 0; }
  html, body { margin: 0; background: #fff; }
  .hoja { width: ${HOJA_W}px; height: ${HOJA_H}px; overflow: hidden; position: relative; break-after: page; display: grid; place-items: center; background: #fff; }
  .hoja:last-child { break-after: auto; }
  .encaje { width: 1340px; position: absolute; left: 50%; top: 50%; transform-origin: center center; }
  .lamina { box-shadow: none; }
  .datos-pdf { box-sizing: border-box; width: ${HOJA_W - MARGEN * 2}px; height: ${HOJA_H - MARGEN * 2}px; display: grid; grid-template-rows: auto 1fr auto; gap: 14px; padding: 24px 30px 16px; overflow: hidden; }
  .datos-pdf__cabeza { display: flex; align-items: end; justify-content: space-between; gap: 20px; border-bottom: 1.5px solid var(--tinta); padding-bottom: 12px; }
  .datos-pdf__cabeza h2 { margin: 0; font: 400 30px/1 var(--f-display); text-transform: uppercase; display: flex; align-items: center; gap: 12px; }
  .datos-pdf__cabeza p { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; }
  .datos-pdf__grilla { columns: 3; column-gap: 26px; }
  .datos-pdf__seccion { break-inside: avoid; margin: 0 0 14px; }
  .datos-pdf__seccion h3 { margin: 0 0 6px; font: 400 15px/1 var(--f-display); text-transform: uppercase; letter-spacing: .04em; color: var(--teal); }
  .datos-pdf__seccion dl { margin: 0; }
  .datos-pdf__seccion div { display: grid; grid-template-columns: 42% 1fr; gap: 8px; padding: 2.5px 0; border-bottom: 1px dotted #b9bfc4; font-size: 10px; line-height: 1.3; }
  .datos-pdf__seccion dt { color: #6b757c; text-transform: uppercase; letter-spacing: .03em; }
  .datos-pdf__seccion dd { margin: 0; font-weight: 600; }
  .datos-pdf__pie { display: flex; justify-content: space-between; gap: 20px; font-size: 9.5px; color: #4a545b; border-top: 1px solid var(--linea); padding-top: 8px; }
</style></head>
<body>
  <div class="hoja"><div class="encaje" id="encaje">${lamina}</div></div>
  <div class="hoja">
    <article class="lamina datos-pdf">
      <header class="datos-pdf__cabeza">
        <div>
          <img class="lamina__logo" src="media/marca/kove-logo-blanco.svg" alt="KOVE">
          <h2><span class="lamina__barra" aria-hidden="true"></span>450RR · ficha técnica completa</h2>
        </div>
        <p>Lámina 450RR-002 · Rev. A</p>
      </header>
      <div class="datos-pdf__grilla">${secciones}</div>
      <footer class="datos-pdf__pie">
        <span>Datos publicados por KOVE Colombia (kovemotocolombia.co). Especificaciones sujetas a homologación y disponibilidad.</span>
        <span>Concesionario virtual: concepto de 16 Ball Creations, no oficial ni afiliado a KOVE.</span>
      </footer>
    </article>
  </div>
</body></html>`;

await pagina.setViewportSize({ width: HOJA_W, height: HOJA_H });
await pagina.setContent(html, { waitUntil: 'networkidle' });
await pagina.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
});
// La lámina se dibuja a 1340 px de ancho y se escala para que quepa entera en la hoja
await pagina.evaluate(({ W, H, M }) => {
  const e = document.getElementById('encaje');
  const r = e.getBoundingClientRect();
  e.style.transform = `translate(-50%, -50%) scale(${Math.min((W - M * 2) / r.width, (H - M * 2) / r.height)})`;
}, { W: HOJA_W, H: HOJA_H, M: MARGEN });

// PREVIA=<carpeta> guarda además una imagen de cada hoja para revisarla
if (process.env.PREVIA) {
  const hojas = await pagina.$$('.hoja');
  for (const [i, h] of hojas.entries()) await h.screenshot({ path: join(process.env.PREVIA, 'hoja-' + (i + 1) + '.png') });
}
await pagina.pdf({ path: SALIDA, width: '297mm', height: '210mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await navegador.close();
console.log('PDF listo:', SALIDA);
